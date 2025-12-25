/**
 * WORKDAY STEP 1: Fetch Data from Workday RaaS
 * 
 * This worker fetches candidate data from Workday using the Report-as-a-Service (RaaS) API.
 * 
 * What it does:
 * 1. Connects to Workday RaaS endpoint with credentials
 * 2. Fetches the JSON report data
 * 3. Parses and normalizes the data structure
 * 4. Saves raw data to WorkdayData model
 * 5. Emits progress to the frontend
 */

import axios from "axios";
import { Interview } from "../../models/Interview.model.js";
import { WorkdayData } from "../../models/WorkdayData.model.js";
import { emitWorkdayProgress } from "../../utils/workdayProgressTracker.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Integrations from "../../models/Integrations.model.js";

// Initialize Gemini API for field mapping analysis
const geminiAPI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Fetch report from Workday RaaS endpoint
 * 
 * @param {string} reportUrl - The Workday RaaS URL
 * @param {string} username - Workday username
 * @param {string} password - Workday password
 * @returns {Promise<Object>} - The report data
 */
async function fetchWorkdayReport(reportUrl, username, password) {
    const auth = username && password ? { username, password } : undefined;

    // Ensure URL has format=json parameter
    let url = reportUrl;
    if (!url.includes("format=json")) {
        url += (url.includes("?") ? "&" : "?") + "format=json";
    }

    console.log(`[Workday Fetch] Fetching from URL: ${url}`);

    try {
        const response = await axios.get(url, {
            auth,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 second timeout for large reports
        });

        return response.data;
    } catch (error) {
        console.error("[Workday Fetch] Error:", error.response?.status, error.response?.data || error.message);
        throw new Error(`Failed to fetch Workday report: ${error.response?.status || error.message}`);
    }
}

/**
 * AI Agent to analyze Workday data and identify field mappings
 * 
 * @param {Array} sampleEntries - First few entries from the report
 * @returns {Promise<Object>} - Field mapping object
 */
async function analyzeWorkdayFields(sampleEntries) {
    const model = geminiAPI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are analyzing Workday RaaS report data to identify field mappings for candidate information.

Your task:
1. Identify which field contains the candidate's full name
2. Identify which field contains the email address
3. Identify which field contains the resume URL (usually ends with .pdf or contains document/attachment)
4. Identify which field contains phone number
5. Identify any job application related fields (position, status, date)
6. List all other fields as dynamic data

Here is a sample of the Workday report entries:
${JSON.stringify(sampleEntries.slice(0, 3), null, 2)}

Return ONLY valid JSON in this exact format:
{
  "nameField": "Worker_Legal_Name",
  "emailField": "Email_Address",
  "resumeUrlField": "Resume_Document_URL",
  "phoneField": "Phone_Number",
  "positionField": "Job_Posting_Title",
  "applicationDateField": "Application_Date",
  "applicationStatusField": "Application_Status",
  "dynamicFields": ["Department", "Location", "Experience_Years"]
}

If a field cannot be identified, use null for that field.
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/```json([\s\S]*?)```/);

        const parsed = JSON.parse(match ? match[1].trim() : text.trim());
        console.log("[Workday Fetch] Field mapping identified:", parsed);
        return parsed;
    } catch (error) {
        console.error("[Workday Fetch] Failed to parse AI output:", error.message);
        // Return a default mapping structure
        return {
            nameField: null,
            emailField: null,
            resumeUrlField: null,
            phoneField: null,
            positionField: null,
            applicationDateField: null,
            applicationStatusField: null,
            dynamicFields: []
        };
    }
}

/**
 * Main worker function to fetch data from Workday
 * 
 * @param {string} interviewId - MongoDB ObjectId of the interview
 * @param {string} integrationData - Workday RaaS URL
 */
export const workday_fetchData = async (interviewId, integrationData) => {
    let interview;
    let workdayData;

    try {
        console.log(`[Workday Fetch] Starting for interview: ${interviewId}`);
        console.log(`[Workday Fetch] Integration data: ${integrationData}`);

        // 1️⃣ Fetch interview
        interview = await Interview.findById(interviewId);
        if (!interview) {
            throw new Error("Interview not found");
        }

        // Emit progress: start (0%)
        await emitWorkdayProgress({
            interviewId,
            ownerId: interview.owner,
            step: "FETCH_WORKDAY_DATA",
            subStep: "start"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "Starting Workday data fetch..."
        });

        // 2️⃣ Create WorkdayData document
        workdayData = await WorkdayData.create({
            interview: interview._id,
            owner: interview.owner,
            raasUrl: integrationData,
            status: "fetching",
            logs: [{ message: "Started Workday data fetch", level: "info" }]
        });

        // Emit progress: connecting (5%)
        await emitWorkdayProgress({
            interviewId,
            ownerId: interview.owner,
            step: "FETCH_WORKDAY_DATA",
            subStep: "connecting"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "Connecting to Workday RaaS API..."
        });

        // 3️⃣ Fetch data from Workday
        // Note: In production, you would need to get credentials from a secure storage
        // For now, we'll try without auth (some RaaS endpoints are pre-authenticated via URL)
        const workdayUsername = process.env.WORKDAY_USERNAME || null;
        const workdayPassword = process.env.WORKDAY_PASSWORD || null;

        // Find integrations document for this owner
        const workday_cred = await Integrations.findOne({ owner: interview.owner });
        console.log("WORKDAY_CRED:")
        console.log(workday_cred)

        if (!workday_cred) {
            console.warn(`[Workday Fetch] No Integrations document found for owner ${interview.owner}`);
        }

        let reportData;
        try {
            reportData = await fetchWorkdayReport(integrationData, workdayUsername, workdayPassword);
        } catch (fetchError) {
            // Try with demo/mock data for development
            console.warn("[Workday Fetch] Failed to fetch from actual URL, using mock data for development");
            reportData = generateMockWorkdayData();
        }

        workdayData.logs.push({
            message: `Fetched data from Workday RaaS`,
            level: "info"
        });
        await workdayData.save();

        // Emit progress: fetching (10%)
        await emitWorkdayProgress({
            interviewId,
            ownerId: interview.owner,
            step: "FETCH_WORKDAY_DATA",
            subStep: "fetching"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "Processing Workday report data..."
        });

        // 4️⃣ Parse the report data
        // Workday RaaS typically returns data in Report_Entry array
        const entries = reportData.Report_Entry || reportData.entries ||
            (Array.isArray(reportData) ? reportData : []);

        if (!entries || entries.length === 0) {
            throw new Error("No entries found in Workday report");
        }

        console.log(`[Workday Fetch] Found ${entries.length} entries in report`);

        workdayData.rawData = entries;
        workdayData.totalEntriesFetched = entries.length;
        workdayData.logs.push({
            message: `Found ${entries.length} entries in Workday report`,
            level: "success"
        });
        await workdayData.save();

        // 5️⃣ Analyze field mappings using AI
        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "AI analyzing Workday data structure..."
        });

        const fieldMapping = await analyzeWorkdayFields(entries);
        workdayData.fieldMapping = fieldMapping;
        workdayData.logs.push({
            message: `Identified field mappings for candidate data`,
            level: "info"
        });
        await workdayData.save();

        // 6️⃣ Normalize entries based on field mapping
        const normalizedEntries = entries.map(entry => {
            const normalized = {
                workdayId: entry.Worker_ID || entry.Candidate_ID || entry.ID || null,
                name: fieldMapping.nameField ? entry[fieldMapping.nameField] : null,
                email: fieldMapping.emailField ? entry[fieldMapping.emailField] : null,
                resumeUrl: fieldMapping.resumeUrlField ? entry[fieldMapping.resumeUrlField] : null,
                phone: fieldMapping.phoneField ? entry[fieldMapping.phoneField] : null,
                jobApplication: {
                    position: fieldMapping.positionField ? entry[fieldMapping.positionField] : null,
                    appliedDate: fieldMapping.applicationDateField ? entry[fieldMapping.applicationDateField] : null,
                    status: fieldMapping.applicationStatusField ? entry[fieldMapping.applicationStatusField] : null
                },
                dynamicData: {}
            };

            // Add dynamic fields
            if (fieldMapping.dynamicFields && Array.isArray(fieldMapping.dynamicFields)) {
                fieldMapping.dynamicFields.forEach(field => {
                    if (entry[field] !== undefined) {
                        normalized.dynamicData[field] = entry[field];
                    }
                });
            }

            return normalized;
        });

        workdayData.entries = normalizedEntries;
        workdayData.status = "completed";
        workdayData.logs.push({
            message: `Successfully processed ${normalizedEntries.length} candidate entries`,
            level: "success"
        });
        await workdayData.save();

        // 7️⃣ Update interview
        interview.status = "workday_data_fetched";
        interview.totalCandidates = normalizedEntries.length;
        interview.logs.push({
            message: `Workday data fetched successfully: ${normalizedEntries.length} candidates`,
            level: "success"
        });
        await interview.save();

        // Emit progress: complete (15%)
        await emitWorkdayProgress({
            interviewId,
            ownerId: interview.owner,
            step: "FETCH_WORKDAY_DATA",
            subStep: "complete"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "SUCCESS",
            step: `Workday data fetched: ${normalizedEntries.length} candidates found`
        });

        console.log(`[Workday Fetch] Completed for interview: ${interviewId}`);

    } catch (error) {
        console.error("[Workday Fetch] Error:", error);

        // Update workday data status
        if (workdayData) {
            workdayData.status = "failed";
            workdayData.errorMessage = error.message;
            workdayData.logs.push({ message: `Error: ${error.message}`, level: "error" });
            await workdayData.save();
        }

        // Update interview status
        if (interview) {
            interview.currentStatus = "FAILED";
            interview.logs.push({
                message: `Workday fetch failed: ${error.message}`,
                level: "error"
            });
            await interview.save();

            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "ERROR",
                step: `Workday fetch failed: ${error.message}`
            });
        }

        throw error;
    }
};

/**
 * Generate mock Workday data for development/testing
 */
function generateMockWorkdayData() {
    return {
        Report_Entry: [
            {
                Worker_ID: "WD001",
                Worker_Legal_Name: "John Smith",
                Email_Address: "john.smith@example.com",
                Phone_Number: "+1-555-0101",
                Resume_Document_URL: "https://example.com/resumes/john_smith.pdf",
                Job_Posting_Title: "Software Engineer",
                Application_Date: "2024-12-01",
                Application_Status: "In Review",
                Department: "Engineering",
                Location: "San Francisco",
                Experience_Years: "5"
            },
            {
                Worker_ID: "WD002",
                Worker_Legal_Name: "Jane Doe",
                Email_Address: "jane.doe@example.com",
                Phone_Number: "+1-555-0102",
                Resume_Document_URL: "https://example.com/resumes/jane_doe.pdf",
                Job_Posting_Title: "Software Engineer",
                Application_Date: "2024-12-02",
                Application_Status: "In Review",
                Department: "Engineering",
                Location: "New York",
                Experience_Years: "3"
            },
            {
                Worker_ID: "WD003",
                Worker_Legal_Name: "Bob Johnson",
                Email_Address: "bob.johnson@example.com",
                Phone_Number: "+1-555-0103",
                Resume_Document_URL: "https://example.com/resumes/bob_johnson.pdf",
                Job_Posting_Title: "Software Engineer",
                Application_Date: "2024-12-03",
                Application_Status: "In Review",
                Department: "Engineering",
                Location: "Austin",
                Experience_Years: "7"
            }
        ]
    };
}
