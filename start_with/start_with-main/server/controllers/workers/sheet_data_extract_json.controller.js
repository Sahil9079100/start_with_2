// server/controllers/workers/sheet_data_extract_json.controller.js

import { google } from "googleapis";
import SheetDataExtractJson from "../../models/SheetDataExtractJson.model.js";
import {Interview} from "../../models/Interview.model.js";
import GoogleIntegration from "../../models/googleIntegration.model.js";
import { createOAuthClient } from "../../utils/googleClient.js";  // Your existing helper
import InterviewGSheetStructureModel from "../../models/InterviewGSheetStructure.model.js";
import { separate_resume_urls_and_save } from "./separate_resume_urls_and_save.controller.js";

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

        // 5️⃣ Fetch rows in buffer
        const bufferSize = 5;
        let startRow = 2; // skip header
        let endRow = startRow + bufferSize - 1;
        let moreRows = true;

        while (moreRows) {
            const range = `A${startRow}:Z${endRow}`; // Z is a large column placeholder
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: interview.candidateSheetId,
                range,
            });

            const rows = response.data.values || [];
            if (rows.length === 0) {
                moreRows = false;
                sheetExtract.logs.push({ message: `No more rows found. Extraction complete`, level: "success" });
                break;
            }

            sheetExtract.rows.push(...rows);
            sheetExtract.logs.push({ message: `Fetched rows ${startRow} to ${endRow}`, level: "info" });
            await sheetExtract.save();

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

        console.log(`[Worker] Sheet extraction done for interview ${interview._id}`);
        // console.log(`✅ Sheet extraction done for interview ${interview._id}`);

        // ✅ kick off next worker asynchronously
        setTimeout(() => {
            separate_resume_urls_and_save(interviewId);
        }, 1000); // small delay to avoid blocking response
    } catch (error) {
        console.error("Error extracting sheet data:", error);
        // Update interview and sheetExtract status if error occurs
        if (interviewId) {
            await Interview.findByIdAndUpdate(interviewId, {
                status: "failed",
                $push: { logs: { message: `Sheet extraction failed: ${error.message}`, level: "error" } }
            });
        }
    }
};
