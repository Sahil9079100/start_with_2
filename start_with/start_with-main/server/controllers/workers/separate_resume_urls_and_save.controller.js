import {Interview} from "../../models/Interview.model.js";
import InterviewGSheetStructure from "../../models/InterviewGSheetStructure.model.js";
import SheetDataExtractJson from "../../models/SheetDataExtractJson.model.js";
import {Candidate} from "../../models/Candidate.model.js";
import { geminiAPI } from "../../server.js";
import { extract_text_from_resumeurl } from "./extract_text_from_resumeurl.controller.js";

/**
 * STEP D: Separate resume URLs, emails, and save candidates
 * ----------------------------------------------------------
 * 1. Identify which columns contain resume URLs and email.
 * 2. For each row, create a Candidate doc with dynamicData + resumeUrl + email.
 * 3. Update interview status -> 'separate_resume_urls_and_save'
 */

export const separate_resume_urls_and_save = async (interviewId) => {
    try {
        console.log(`[Step D] Starting candidate separation for interview: ${interviewId}`);


        const interview = await Interview.findById(interviewId);
        if (!interview) throw new Error("Interview not found");

        const structureDoc = await InterviewGSheetStructure.findOne({ interview: interviewId });
        if (!structureDoc) throw new Error("Sheet structure not found");

        const extractDoc = await SheetDataExtractJson.findOne({ interview: interviewId });
        if (!extractDoc || !extractDoc.rows) throw new Error("Extracted sheet data not found");

        structureDoc.logs.push({ message: "Fetched structure & data for candidate separation", level: "info" });
        await structureDoc.save();

        const sampleRows = extractDoc.rows.slice(0, 5); // first 5 rows as context


        const columnAnalysis = await which_column_is_which_agent(structureDoc.columnMapping, sampleRows);
        const { resumeUrlColumn, emailColumn, dynamicColumns } = columnAnalysis;

        if (!resumeUrlColumn || !emailColumn || !dynamicColumns?.length)
            throw new Error("Agent failed to identify resume/email/dynamic columns");

        structureDoc.logs.push({
            message: `Identified resume column (${resumeUrlColumn}), email column (${emailColumn}), and dynamic columns: ${dynamicColumns.join(", ")}`,
            level: "success",
        });
        await structureDoc.save();

        let savedCount = 0;

        for (let i = 0; i < extractDoc.rows.length; i++) {
            const row = extractDoc.rows[i];
            const dynamicData = {};

            Object.entries(structureDoc.columnMapping).forEach(([colLetter, colName]) => {
                if (colName && dynamicColumns.includes(colName)) {
                    const colIndex = colLetter.charCodeAt(0) - 65;
                    dynamicData[colName] = row[colIndex] || "";
                }
            });

            const resumeIndex = resumeUrlColumn.charCodeAt(0) - 65;
            const emailIndex = emailColumn.charCodeAt(0) - 65;

            const resumeUrl = row[resumeIndex] || "";
            const email = row[emailIndex] || "";

            if (!resumeUrl) {
                console.warn(`Row ${i + 1}: Missing resume URL, skipping`);
                continue;
            }

            await Candidate.create({
                interview: interview._id,
                owner: interview.owner,
                email,
                resumeUrl,
                resumeSummary: "",
                isResumeScanned: false,
                dynamicData,
            });

            savedCount++;
            if (savedCount % 10 === 0) {
                console.log(`[Step D] Saved ${savedCount} candidates so far...`);
            }
        }

        console.log(`[Step D] Completed. Total candidates saved: ${savedCount}`);

        interview.status = "separate_resume_urls_and_save";
        await interview.save();

        structureDoc.logs.push({
            message: `Step D completed successfully. ${savedCount} candidates saved.`,
            level: "success",
        });
        await structureDoc.save();

        setTimeout(() => {
            extract_text_from_resumeurl(interviewId);
        }, 2000);

        return { success: true, savedCount };

    } catch (error) {
        console.error(`[Step D] Error in candidate separation:`, error.message);
        return { success: false, error: error.message };
    }
};


/**
 * AI Agent -> Identify resume URL column, email column, and dynamic columns
 */
export async function which_column_is_which_agent(columnMapping, sampleRows) {
    const model = geminiAPI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are analyzing Google Sheet column mappings and sample rows.

Your task:
1. Identify which column most likely contains resume URLs (usually has Google Drive, PDF, or CV links).
2. Identify which column contains email addresses.
3. Return all *other* columns as dynamic fields.

Column mapping:
${JSON.stringify(columnMapping, null, 2)}

Sample rows:
${JSON.stringify(sampleRows, null, 2)}

Return ONLY valid JSON in this format:
{
  "resumeUrlColumn": "D",
  "emailColumn": "B",
  "dynamicColumns": ["Name", "Phone", "Address", "Age"]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/```json([\s\S]*?)```/);

    try {
        return JSON.parse(match ? match[1] : text);
    } catch (err) {
        console.error("[which_column_is_which_agent] Failed to parse AI output:", text);
        throw new Error("Invalid AI response format");
    }
}
