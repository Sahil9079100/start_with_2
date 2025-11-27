// server/controllers/workers/sheet_data_structure.controller.js

import { google } from "googleapis";
import { Interview } from "../../models/Interview.model.js";
import InterviewGSheetStructure from "../../models/InterviewGSheetStructure.model.js";
import GoogleIntegration from "../../models/googleIntegration.model.js";
import { createOAuthClient } from "../../utils/googleClient.js";
import { geminiAPI } from "../../server.js";
import { extractSheetData } from "./sheet_data_extract_json.controller.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";
import { __RETRY_ENGINE } from "../../engines/retry.Engine.js";

export async function sheet_structure_finder_agent(sampleRows) {
    const MAX_ATTEMPTS = 6;
    const BASE_DELAY_MS = 1000; // initial backoff delay
    let lastErr;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const model = geminiAPI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

            // Ask Gemini
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Extract JSON between triple backticks
            const jsonMatch = responseText.match(/```json([\s\S]*?)```/i);
            if (!jsonMatch) throw new Error("No valid JSON found in Gemini response");

            const parsed = JSON.parse(jsonMatch[1].trim());

            // Validate format
            if (typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("Invalid format: Expected a JSON object");
            }

            if (attempt > 1) {
                console.warn(`✅ sheet_structure_finder_agent succeeded on retry attempt ${attempt}`);
            }
            return parsed; // success
        } catch (err) {
            lastErr = err;
            console.error(`⚠️ sheet_structure_finder_agent attempt ${attempt} failed:`, err.message);
            if (attempt < MAX_ATTEMPTS) {
                // Exponential backoff with jitter
                const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
                await new Promise(res => setTimeout(res, delay));
                continue; // retry
            }
        }
    }
    // All attempts exhausted
    console.error("❌ sheet_structure_finder_agent failed after retries:", lastErr?.message);
    return {
        A: "Name",
        B: "Resume URL",
        C: "Email",
    };
}


export const sheet_data_structure_worker = async (interviewId) => {
    // Hoist interview so it's visible in catch for safer error handling
    let interview;
    try {
        // 1️⃣ Fetch interview
        interview = await Interview.findById(interviewId);
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

        // 5️⃣ Discover sheet title dynamically (avoids 'Unable to parse range')
        // Always use the first sheet tab to keep behavior generic across use cases
        let sheetTitle;
        try {
            const meta = await sheets.spreadsheets.get({
                spreadsheetId: interview.candidateSheetId,
                fields: "sheets.properties.title"
            });
            const sheetsList = meta?.data?.sheets || [];
            const firstTitle = sheetsList?.[0]?.properties?.title;
            sheetTitle = firstTitle;
            if (!sheetTitle) throw new Error("No sheet title found");
        } catch (e) {
            console.warn("⚠️ Failed to fetch sheet metadata, falling back to 'Sheet1' ::", e.message);
            sheetTitle = "Sheet1"; // fallback
        }

        // Build a safe range (quote if spaces or special chars)
        const needsQuoting = /\s|[!@#$%^&*()+\-={}[\];',.]/.test(sheetTitle);
        const safeTitle = needsQuoting ? `'${sheetTitle.replace(/'/g, "''")}'` : sheetTitle;

        // Log which sheet tab we decided to use
        try {
            structureDoc.logs.push({ message: `Using sheet tab: ${sheetTitle}`, level: "info" });
            await structureDoc.save();
            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "INFO",
                step: `Reading from sheet tab: ${sheetTitle}`
            });
        } catch (_) { }

        let allRows = [];
        try {
            const sheetResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: interview.candidateSheetId,
                range: safeTitle, // entire first sheet
            });
            allRows = sheetResponse.data.values || [];
        } catch (e) {
            console.error("❌ Primary sheet values.get failed:", e.message);
            // Second attempt: explicit A1 range (broad columns) to mitigate parse issues
            try {
                const fallbackRange = `${safeTitle}!A:ZZ`; // wide but bounded
                const sheetResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: interview.candidateSheetId,
                    range: fallbackRange,
                });
                allRows = sheetResponse.data.values || [];
                console.log("✅ Fallback range succeeded:", fallbackRange);
            } catch (inner) {
                throw new Error(`Unable to read sheet data after fallback: ${inner.message}`);
            }
        }

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

        // Persist failure to interview doc (even if interview fetch failed earlier)
        try {
            await Interview.updateOne(
                { _id: interviewId },
                {
                    $set: { currentStatus: "FAILED", lastProcessedStep: "STRUCTURING" },
                    $push: {
                        logs: {
                            message: `Sheet data structure failed: ${error.message}`,
                            level: "error",
                        },
                    },
                }
            );
        } catch (updateErr) {
            console.error(`[Worker] failed to update interview status for ${interviewId}:`, updateErr?.message || updateErr);
        }

        // INTERVIEW_PROGRESS_LOG -----------------------------------------------------------------------------------------------------------------------------------------------------------
        if (interview?.owner) {
            try {
                await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                    interview: interviewId,
                    level: "ERROR",
                    step: "Google Sheet structure failed"
                });
            } catch (emitErr) {
                console.warn(`[Worker] recruiterEmit failed for interview ${interviewId}:`, emitErr?.message || emitErr);
            }
        }

        // Trigger retry engine for this interview (it will decide whether to actually retry)
        try {
            await __RETRY_ENGINE(interviewId);
        } catch (retryErr) {
            console.error(`[RETRY ENGINE ERROR] retry engine failed for interview=${interviewId}:`, retryErr?.message || retryErr);
        }

        return false;
    }
};

/*

hey i need a huge help in system design.
So i have a big project, its called "Startwith.live" and its a AI powered recruting platform, so what my platform does is that the recrutier can connect there google sheet on my platform, and fills a basic form which creates a Interview or Jab post, and then the whole process startes.
And my platform sorts and takes AI based interview of the candidates.
I will discuess about the recrutier side process, like what is happening from there side and the flow.

So this is what happenes in the backend:
1.So the "Create" button makes a POST request on the function "createInterview" where the form data is saved and basic thing.
2. Then the "createInterview" makes the response just after completing, but in background it starts the next process, so the user donnt have to see loading screen for so long.
3. So the "createInterview" then starts the function "sheet_data_structure_worker" just after one second delay, somethign like this:
 setTimeout(() => {
            sheet_data_structure_worker(newInterview._id);
        }, 1000); // small delay to avoid blocking response

        res.status(201).json({
            success: true,
            status: newInterview.status,
            data: {
                id: newInterview._id,
                url: newInterview.interviewUrl,
            },
            Interview: newInterview,
            message: "Interview created and queued for processing",
        });

4. The function "sheet_data_structure_worker", it setup a OAuth client for that user, then fetches 5 rows of the execl sheet then it gives that data to a AI Agent which finds the structure of the exel sheet and gives the output something like this:
return {
        A: "Name",
        B: "Resume URL",
        C: "Email",
    };
And i save this in DB in a seprate collection

5. After that there is a one second delay then the next function gets called which is "extractSheetData" where i look at the structure of the sheet that i found in previous step, then fetches the data from the Sheet in a Buffer of 5, and then save all that in the DB

6. Then after one second delay, a new function runs which is "separate_resume_urls_and_save", in this function i am passing some sample data that i saved in the DB in the previous step, to the AI Agent which then tell me which coloum has "Resume URL", "Name", "Email", "Dynamic Data"
So the agent tells me something like this:
{
  "resumeUrlColumn": "D",
  "emailColumn": "B",
  "nameColumn": "A",
  "dynamicColumns": ["Phone", "Address", "Age"]
}
And the 'dynamicColumns' contains all the extra stuff thats the exel rows has.
Then i am extracting the resume url, name, email, other data, form each row of the extracted data of the google sheet. Then i am saving that in the DB because i am using that in my interview taking process (not my main focus for now)

7. Then after all this steps i will have all the data extracted from the exel, and also candidates 

*/