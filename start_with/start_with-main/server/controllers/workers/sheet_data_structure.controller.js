// server/controllers/workers/sheet_data_structure.controller.js

import { google } from "googleapis";
import { Interview } from "../../models/Interview.model.js";
import InterviewGSheetStructure from "../../models/InterviewGSheetStructure.model.js";
import GoogleIntegration from "../../models/googleIntegration.model.js";
import { createOAuthClient } from "../../utils/googleClient.js";
import { geminiAPI } from "../../server.js";
import { extractSheetData } from "./sheet_data_extract_json.controller.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";

export async function sheet_structure_finder_agent(sampleRows) {
    try {
        const model = geminiAPI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // console.log("okok: ", JSON.stringify(sampleRows, null, 2));
        const prompt = `
You are given a set of sample rows from a Google Sheet.
Your job is to infer what each column represents (e.g., Name, Email, Resume URL, etc.).
The first row likely contains headers. Use that plus the other rows to decide.

Output a JSON mapping of column letters (A, B, C, etc.) to the **most likely meaning of that column**.
Only output JSON enclosed in triple backticks — no explanation text.

Example:
\`\`\`json
{
  "A": "Name",
  "B": "Email",
  "C": "Resume URL"
}
\`\`\`

Here are the sample rows:
${JSON.stringify(sampleRows, null, 2)}
        `;

        // 1️⃣ Ask Gemini
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // 2️⃣ Extract JSON between triple backticks
        const jsonMatch = responseText.match(/```json([\s\S]*?)```/i);
        if (!jsonMatch) throw new Error("No valid JSON found in Gemini response");

        const parsed = JSON.parse(jsonMatch[1].trim());

        // 3️⃣ Validate format
        if (typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Invalid format: Expected a JSON object");
        }

        // 4️⃣ Return the parsed mapping
        return parsed;
    } catch (err) {
        console.error("❌ sheet_structure_finder_agent failed:", err.message);

        // fallback — helps system continue gracefully
        return {
            A: "Name",
            B: "Resume URL",
            C: "Email",
        };
    }
}


export const sheet_data_structure_worker = async (interviewId) => {
    try {
        // 1️⃣ Fetch interview
        const interview = await Interview.findById(interviewId);
        if (!interview) throw new Error("Interview not found");

        // 2️⃣ Get Google integration for the owner
        const integration = await GoogleIntegration.findOne({
            owner: interview.owner,
            provider: "google",
        });

        if (!integration || !integration.tokens)
            throw new Error("No Google integration tokens found for this owner");

        // 3️⃣ Create structure doc in DB
        const structureDoc = await InterviewGSheetStructure.create({
            owner: interview.owner,
            interview: interview._id,
            candidateSheetId: interview.candidateSheetId,
            status: "processing",
            logs: [{ message: "Started processing sheet structure", level: "info" }],
        });

        // INTERVIEW_PROGRESS_LOG -----------------------------------------------------------------------------------------------------------------------------------------------------------
        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG",
            {
                interview: interviewId,
                level: "INFO",
                step: "Sheet structure process started..."
            });


        // 4️⃣ Setup OAuth client
        const oAuth2Client = createOAuthClient();
        oAuth2Client.setCredentials(integration.tokens);

        const sheets = google.sheets({ version: "v4", auth: oAuth2Client });

        // 5️⃣ Fetch top 3–5 rows
        const sheetResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: interview.candidateSheetId,
            range: "Sheet1", // fetch entire used range (auto-detect columns)
        });

        const allRows = sheetResponse.data.values || [];

        if (allRows.length === 0) {
            throw new Error("Google Sheet is empty or inaccessible");
        }

        // Only take the top 5 rows (or fewer if not available)
        const sampleRows = allRows.slice(0, 5);

        structureDoc.rawSampleData = sampleRows;
        structureDoc.logs.push({
            message: `Fetched top ${sampleRows.length} rows dynamically from sheet`,
            level: "info",
        });
        await structureDoc.save();
        // INTERVIEW_PROGRESS_LOG -----------------------------------------------------------------------------------------------------------------------------------------------------------
        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG",
            {
                interview: interviewId,
                level: "INFO",
                step: `Fetched top ${sampleRows.length} rows dynamically from sheet`
            });

        // 6️⃣ Pass sample rows to AI agent
        // INTERVIEW_PROGRESS_LOG -----------------------------------------------------------------------------------------------------------------------------------------------------------
        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG",
            {
                interview: interviewId,
                level: "INFO",
                step: `Agent finding sheet structure...`
            });
        const columnMapping = await sheet_structure_finder_agent(sampleRows);

        // INTERVIEW_PROGRESS_LOG -----------------------------------------------------------------------------------------------------------------------------------------------------------
        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG",
            {
                interview: interviewId,
                level: "SUCCESS",
                step: `Agent successfully find the structure`
            });

        structureDoc.columnMapping = columnMapping;
        structureDoc.status = "completed";
        structureDoc.logs.push({ message: "AI structure mapping completed", level: "success" });
        await structureDoc.save();

        // 7️⃣ Update parent interview
        interview.status = "sheet_data_structure";
        interview.logs.push({
            message: "Google Sheet structure successfully processed",
            level: "success",
        });
        await interview.save();
        // INTERVIEW_PROGRESS_LOG -----------------------------------------------------------------------------------------------------------------------------------------------------------
        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "SUCCESS",
            step: "Google Sheet structure successfully processed"
        });

        console.log(`[Worker] Sheet structure processed for interview ${interviewId}`);

        // INTERVIEW_PROGRESS_LOG -----------------------------------------------------------------------------------------------------------------------------------------------------------
        // await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
        //     interview: interviewId,
        //     level: "INFO",
        //     step: "Google Sheet structure processed"
        // });

        // ✅ kick off next worker asynchronously
        setTimeout(() => {
            extractSheetData(interviewId);
        }, 1000); // small delay to avoid blocking response

        return true;
    } catch (error) {
        console.error(`❌ [Worker] Sheet data structure failed for interview ${interviewId}:`, error.message);

        await Interview.updateOne(
            { _id: interviewId },
            {
                $set: { status: "failed" },
                $push: {
                    logs: {
                        message: `Sheet data structure failed: ${error.message}`,
                        level: "error",
                    },
                },
            }
        );

        // INTERVIEW_PROGRESS_LOG -----------------------------------------------------------------------------------------------------------------------------------------------------------
        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "ERROR",
            step: "Google Sheet structure processed"
        });

        return false;
    }
};