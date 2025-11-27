// server/controllers/workers/sheet_data_extract_json.controller.js

import { google } from "googleapis";
import SheetDataExtractJson from "../../models/SheetDataExtractJson.model.js";
import { Interview } from "../../models/Interview.model.js";
import GoogleIntegration from "../../models/googleIntegration.model.js";
import { createOAuthClient } from "../../utils/googleClient.js";  // Your existing helper
import InterviewGSheetStructureModel from "../../models/InterviewGSheetStructure.model.js";
import { separate_resume_urls_and_save } from "./separate_resume_urls_and_save.controller.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";
import { __RETRY_ENGINE } from "../../engines/retry.Engine.js";

export const extractSheetData = async (interviewId) => {
    try {
        // 1️⃣ Fetch interview
        const interview = await Interview.findById(interviewId);
        if (!interview) throw new Error("Interview not found");

        const sheetStructure = await InterviewGSheetStructureModel.findOne({ interview: interview._id });
        if (!sheetStructure || !sheetStructure.columnMapping) {
            throw new Error("Sheet structure not found for interview");
        }

        console.log("Column mapping found: ", sheetStructure.columnMapping);

        // 2️⃣ Fetch owner's Google integration
        const integration = await GoogleIntegration.findOne({ owner: interview.owner, provider: "google" });
        if (!integration || !integration.tokens) throw new Error("No Google integration found");

        // 3️⃣ Initialize OAuth2 client
        const oAuth2Client = createOAuthClient();
        oAuth2Client.setCredentials(integration.tokens);
        const sheets = google.sheets({ version: "v4", auth: oAuth2Client });

        // 4️⃣ Create or fetch SheetDataExtractJson doc
        let sheetExtract = await SheetDataExtractJson.findOne({ interview: interview._id });
        if (!sheetExtract) {
            sheetExtract = await SheetDataExtractJson.create({
                interview: interview._id,
                owner: interview.owner,
                rows: [],
                status: "processing",
                logs: [{ message: "Starting sheet extraction", level: "info" }]
            });
        }

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "Started extracting data from google sheet..."
        });

        // Helper: Convert column letters (A, Z, AA, AF) to zero-based index for comparison
        function columnLetterToIndex(col) {
            if (!col || typeof col !== "string") return -1;
            let s = col.trim().toUpperCase();
            let index = 0;
            for (let i = 0; i < s.length; i++) {
                const code = s.charCodeAt(i);
                if (code < 65 || code > 90) continue; // skip non A-Z
                index = index * 26 + (code - 64); // A->1 ... Z->26
            }
            return index - 1; // zero-based
        }

        // Determine the rightmost column to fetch based on structure mapping (fallback to ZZ)
        const mappingKeys = Object.keys(sheetStructure.columnMapping || {}).map(k => (k || "").toUpperCase());
        let maxColLetter = "ZZ"; // safe default if mapping is missing or incomplete
        if (mappingKeys.length) {
            let maxKey = mappingKeys[0];
            let maxIdx = columnLetterToIndex(maxKey);
            for (const k of mappingKeys) {
                const idx = columnLetterToIndex(k);
                if (idx > maxIdx) {
                    maxIdx = idx;
                    maxKey = k;
                }
            }
            // Ensure we don't accidentally pick something before Z if mapping is tiny
            const zIdx = columnLetterToIndex("Z");
            maxColLetter = maxIdx >= zIdx ? maxKey : "Z";
        }

        console.log(`[Extractor] Using column range A..${maxColLetter} based on structure mapping`);
        sheetExtract.logs.push({ message: `Using column range A..${maxColLetter} for extraction`, level: "info" });
        await sheetExtract.save();

        // 5️⃣ Fetch rows in buffer
        const bufferSize = 5;
        let startRow = 2; // skip header
        let endRow = startRow + bufferSize - 1;
        let moreRows = true;

        while (moreRows) {
            const range = `A${startRow}:${maxColLetter}${endRow}`; // dynamic right bound (supports AA/AF/etc.)
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: interview.candidateSheetId,
                range,
            });

            const rows = response.data.values || [];
            if (rows.length === 0) {
                moreRows = false;
                sheetExtract.logs.push({ message: `No more rows found. Extraction complete`, level: "success" });
                await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                    interview: interviewId,
                    level: "INFO",
                    step: "No more rows found. Extraction complete"
                });
                break;
            }

            sheetExtract.rows.push(...rows);
            sheetExtract.logs.push({ message: `Fetched rows ${startRow} to ${endRow}`, level: "info" });
            await sheetExtract.save();
            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "INFO",
                step: `Fetched rows ${startRow} to ${endRow}`
            });

            startRow += bufferSize;
            endRow += bufferSize;
        }

        // 6️⃣ Mark as completed
        sheetExtract.status = "completed";
        sheetExtract.logs.push({ message: "Sheet data extraction completed", level: "success" });
        await sheetExtract.save();


        // 7️⃣ Update parent interview status
        interview.status = "sheet_data_extract_json";
        interview.logs.push({ message: "Sheet data extracted successfully", level: "success" });
        await interview.save();

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "SUCCESS",
            step: `Sheet data extracted successfully`
        });

        console.log(`[Worker] Sheet extraction done for interview ${interview._id}`);
        // console.log(`✅ Sheet extraction done for interview ${interview._id}`);

        // ✅ kick off next worker asynchronously
        setTimeout(() => {
            separate_resume_urls_and_save(interviewId);
        }, 1000); // small delay to avoid blocking response
    } catch (error) {
        console.error("Error extracting sheet data:", error);

        // Attempt to persist failure state on the interview so retry engine can pick it up
        try {
            if (interviewId) {
                await Interview.findByIdAndUpdate(interviewId, {
                    $set: { currentStatus: "FAILED", lastProcessedStep: "EXTRACTING_SHEET" },
                    $push: { logs: { message: `Sheet extraction failed: ${error.message}`, level: "error" } }
                });
            }
        } catch (updateErr) {
            console.error(`[Worker] failed to update interview status for ${interviewId}:`, updateErr?.message || updateErr);
        }

        // Try to fetch interview owner for emitting progress; guard failures
        let interviewDoc = null;
        try {
            if (interviewId) interviewDoc = await Interview.findById(interviewId);
        } catch (fetchErr) {
            // ignore
        }

        try {
            await recruiterEmit(interviewDoc?.owner || null, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "ERROR",
                step: `Sheet extraction failed: ${error.message}`
            });
        } catch (emitErr) {
            console.warn(`[Worker] recruiterEmit failed for interview ${interviewId}:`, emitErr?.message || emitErr);
        }

        // Trigger retry engine (it will decide whether to retry)
        try {
            await __RETRY_ENGINE(interviewId);
        } catch (retryErr) {
            console.error(`[RETRY ENGINE ERROR] retry engine failed for interview=${interviewId}:`, retryErr?.message || retryErr);
        }
    }
};
