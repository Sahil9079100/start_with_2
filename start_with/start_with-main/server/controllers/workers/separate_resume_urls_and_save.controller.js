import { Interview } from "../../models/Interview.model.js";
import InterviewGSheetStructure from "../../models/InterviewGSheetStructure.model.js";
import SheetDataExtractJson from "../../models/SheetDataExtractJson.model.js";
import { Candidate } from "../../models/Candidate.model.js";
import { geminiAPI } from "../../server.js";
import { extract_text_from_resumeurl } from "./extract_text_from_resumeurl.controller.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";
import { __RETRY_ENGINE } from "../../engines/retry.Engine.js";

/**
 * STEP D: Separate resume URLs, emails, and save candidates
 * ----------------------------------------------------------
 * 1. Identify which columns contain resume URLs and email.
 * 2. For each row, create a Candidate doc with dynamicData + resumeUrl + email.
 * 3. Update interview status -> 'separate_resume_urls_and_save'
 */

// Convert Excel/Sheets column letters (e.g., A, Z, AA, AF) to zero-based index
// A -> 0, B -> 1, Z -> 25, AA -> 26, AB -> 27, ... AF -> 31
function columnLetterToIndex(col) {
    if (!col || typeof col !== "string") return -1;
    let s = col.trim().toUpperCase();
    let index = 0;
    for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        if (code < 65 || code > 90) {
            // Non A-Z character
            continue;
        }
        index = index * 26 + (code - 64); // 'A' -> 1 ... 'Z' -> 26
    }
    return index - 1; // convert to zero-based
}

export const separate_resume_urls_and_save = async (interviewId) => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxAttempts = 6;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`[Step D] Attempt ${attempt}/${maxAttempts} - Starting candidate separation for interview: ${interviewId}`);

            const interview = await Interview.findById(interviewId);
            if (!interview) throw new Error("Interview not found");
            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "INFO",
                step: `Step D attempt ${attempt}/${maxAttempts}: Starting candidate separation from Google Sheet`
            });

            const structureDoc = await InterviewGSheetStructure.findOne({ interview: interviewId });
            if (!structureDoc) throw new Error("Sheet structure not found");

            const extractDoc = await SheetDataExtractJson.findOne({ interview: interviewId });
            if (!extractDoc || !extractDoc.rows) throw new Error("Extracted sheet data not found");

            structureDoc.logs.push({ message: `Attempt ${attempt}: Fetched structure & data for candidate separation`, level: "info" });
            await structureDoc.save();

            const sampleRows = extractDoc.rows.slice(0, 5); // first 5 rows as context

            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "INFO",
                step: `Step D attempt ${attempt}: AI Agent is analyzing the sheet's rows and columns...`
            });
            const columnAnalysis = await which_column_is_which_agent(structureDoc.columnMapping, sampleRows);
            const { resumeUrlColumn, emailColumn, nameColumn, dynamicColumns } = columnAnalysis;

            if (!resumeUrlColumn || !emailColumn || !nameColumn || !dynamicColumns?.length) {
                await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                    interview: interviewId,
                    level: "ERROR",
                    step: `Step D attempt ${attempt}: Agent failed to identify rows and columns`
                });
                throw new Error("Agent failed to identify resume/email/dynamic columns");
            }

            structureDoc.logs.push({
                message: `Attempt ${attempt}: Identified resume column (${resumeUrlColumn}), email column (${emailColumn}), and dynamic columns: ${dynamicColumns.join(", ")}`,
                level: "success",
            });
            await structureDoc.save();

            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "SUCCESS",
                step: `Step D attempt ${attempt}: Identified resume column (${resumeUrlColumn}), email column (${emailColumn}), and dynamic columns: ${dynamicColumns.join(", ")}`
            });

            let savedCount = 0;

            for (let i = 0; i < extractDoc.rows.length; i++) {
                const row = extractDoc.rows[i];
                const dynamicData = {};

                Object.entries(structureDoc.columnMapping).forEach(([colLetter, colName]) => {
                    if (colName && dynamicColumns.includes(colName)) {
                        const colIndex = columnLetterToIndex(colLetter);
                        dynamicData[colName] = row[colIndex] || "";
                    }
                });

                const resumeIndex = columnLetterToIndex(resumeUrlColumn);
                const emailIndex = columnLetterToIndex(emailColumn);
                const nameIndex = columnLetterToIndex(nameColumn);

                console.log("RESUME INDEX", resumeIndex, "EMAIL INDEX", emailIndex, "NAME INDEX", nameIndex);

                const resumeUrl = row[resumeIndex] || "";
                const email = row[emailIndex] || "";
                const name = row[nameIndex] || "";

                console.log("@@@@", resumeUrl, email, name);

                if (!resumeUrl) {
                    console.log(`Row ${i + 1}: Missing resume URL, skipping`);
                    await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                        interview: interviewId,
                        level: "INFO",
                        step: `Row ${i + 1}: Missing resume URL, skipping`
                    });
                    continue;
                }

                // Avoid duplicates across retries by skipping if candidate already exists for this interview/email/resumeUrl
                const exists = await Candidate.findOne({ interview: interview._id, email, resumeUrl });
                if (exists) {
                    continue;
                }

                await Candidate.create({
                    interview: interview._id,
                    owner: interview.owner,
                    name,
                    email,
                    resumeUrl,
                    resumeSummary: "",
                    isResumeScanned: false,
                    dynamicData,
                });

                savedCount++;
                if (savedCount % 10 === 0) {
                    console.log(`[Step D] Saved ${savedCount} candidates so far...`);
                    await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                        interview: interviewId,
                        level: "INFO",
                        step: `Saved ${savedCount} candidates so far...`
                    });
                }
            }

            console.log(`[Step D] Completed. Total candidates saved: ${savedCount}`);
            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "SUCCESS",
                step: `Total ${savedCount} candidates are saved from sheet`
            });

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
            console.error(`[Step D] Attempt ${attempt} failed:`, error.message);
            // On failure, if more attempts remain, wait and retry; otherwise, return failure
            if (attempt < maxAttempts) {
                const backoffMs = 2000 * attempt; // simple linear backoff
                await recruiterEmit(null, "INTERVIEW_PROGRESS_LOG", {
                    interview: interviewId,
                    level: "ERROR",
                    step: `Step D attempt ${attempt} failed: ${error.message}. Retrying in ${backoffMs / 1000}s...`
                }).catch(() => { });
                await delay(backoffMs);
                continue;
            }

            // Final failure: persist interview failure state so retry engine can pick it up
            try {
                await Interview.findByIdAndUpdate(interviewId, {
                    $set: { currentStatus: "FAILED", lastProcessedStep: "RESUME_SEPARATION" },
                    $push: { logs: { message: `Step D failed after ${maxAttempts} attempts: ${error.message}`, level: "error" } }
                });
            } catch (updateErr) {
                console.error(`[Step D] failed to update interview status for ${interviewId}:`, updateErr?.message || updateErr);
            }

            try {
                await recruiterEmit(null, "INTERVIEW_PROGRESS_LOG", {
                    interview: interviewId,
                    level: "ERROR",
                    step: `Step D failed after ${maxAttempts} attempts: ${error.message}`
                });
            } catch (emitErr) {
                // ignore emit failures
            }

            // Trigger retry engine (it will decide whether to actually retry)
            try {
                await __RETRY_ENGINE(interviewId);
            } catch (retryErr) {
                console.error(`[RETRY ENGINE ERROR] retry engine failed for interview=${interviewId}:`, retryErr?.message || retryErr);
            }

            return { success: false, error: error.message };
        }
    }
};


/**
 * AI Agent -> Identify resume URL column, email column, and dynamic columns
 */
export async function which_column_is_which_agent(columnMapping, sampleRows) {
    const model = geminiAPI.getGenerativeModel({ model: "gemini-2.5-flash" });

    console.log("##########################################")
    console.log("which_column_is_which_agent - columnMapping:", columnMapping);
    console.log("which_column_is_which_agent - sampleRows:", sampleRows);
    console.log("##########################################")
    const prompt = `
You are analyzing Google Sheet column mappings and sample rows.

Your task:
1. Identify which column most likely contains resume URLs (usually has Google Drive, PDF, or CV links).
2. Identify which column contains email addresses.
3. Identify which column contains names.
4. Return all *other* columns as dynamic fields.

Column mapping:
${JSON.stringify(columnMapping, null, 2)}

Sample rows:
${JSON.stringify(sampleRows, null, 2)}

Return ONLY valid JSON in this format:
{
  "resumeUrlColumn": "D",
  "emailColumn": "B",
  "nameColumn": "A",
  "dynamicColumns": ["Phone", "Address", "Age"]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/```json([\s\S]*?)```/);

    console.log("match", match);

    try {
        return JSON.parse(match ? match[1] : text);
    } catch (err) {
        console.error("[which_column_is_which_agent] Failed to parse AI output:", text);
        throw new Error("Invalid AI response format");
    }
}
