/**
 * LOCALFILE STEP 1: Parse CSV/XLSX File
 * 
 * This worker parses the uploaded CSV or XLSX file and extracts candidate data.
 * 
 * What it does:
 * 1. Reads the uploaded file from server storage
 * 2. If XLSX, converts to CSV format
 * 3. Parses CSV data into structured format
 * 4. Uses AI to identify column mappings (name, email, resume URL, etc.)
 * 5. Saves parsed data to LocalFileData model
 * 6. Emits progress to the frontend
 */

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { Interview } from "../../models/Interview.model.js";
import { LocalFileData } from "../../models/LocalFileData.model.js";
import { emitLocalFileProgress } from "../../utils/localfileProgressTracker.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API for field mapping analysis
const geminiAPI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Convert XLSX/XLS file to CSV format
 * 
 * @param {string} xlsxFilePath - Path to the XLSX file
 * @returns {string} - CSV content as string
 */
function convertXlsxToCsv(xlsxFilePath) {
    console.log(`[LocalFile Parse] Converting XLSX to CSV: ${xlsxFilePath}`);
    // Some environments / package versions of 'xlsx' may not provide `readFile`.
    // Use a safe approach: read file into a Buffer and call `XLSX.read(buffer, { type: 'buffer' })`.
    const fileBuffer = fs.readFileSync(xlsxFilePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];

    // Convert to CSV
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    return csvContent;
}

/**
 * Parse CSV content into array of objects
 * 
 * @param {string} csvContent - CSV content as string
 * @returns {Object} - { headers: string[], rows: object[] }
 */
function parseCsvContent(csvContent) {
    const records = parse(csvContent, {
        columns: true, // Use first row as headers
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true
    });
    
    // Get headers from first record keys
    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    
    return {
        headers,
        rows: records
    };
}

/**
 * AI Agent to analyze file data and identify field mappings
 * 
 * @param {string[]} headers - Column headers from the file
 * @param {Array} sampleRows - First few rows of data
 * @returns {Promise<Object>} - Field mapping object
 */
async function analyzeFileFields(headers, sampleRows) {
    const model = geminiAPI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are analyzing a CSV/Excel file to identify field mappings for candidate information.

Your task:
1. Identify which column contains the candidate's full name
2. Identify which column contains the email address
3. Identify which column contains the resume URL (usually ends with .pdf, contains drive.google.com, or has attachment/document links)
4. Identify which column contains phone number
5. List all other columns as dynamic data

Headers from the file:
${JSON.stringify(headers, null, 2)}

Sample rows (first 3):
${JSON.stringify(sampleRows.slice(0, 3), null, 2)}

Return ONLY valid JSON in this exact format:
{
  "nameColumn": "Name",
  "emailColumn": "Email",
  "resumeUrlColumn": "Resume URL",
  "phoneColumn": "Phone",
  "dynamicColumns": ["Department", "Experience", "Skills"]
}

Use the EXACT column header names from the file.
If a column cannot be identified, use null for that field.
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/```json([\s\S]*?)```/);
        
        const parsed = JSON.parse(match ? match[1].trim() : text.trim());
        console.log("[LocalFile Parse] Field mapping identified:", parsed);
        return parsed;
    } catch (error) {
        console.error("[LocalFile Parse] Failed to parse AI output:", error.message);
        // Return a default mapping structure - try to guess based on common headers
        return guessFieldMappings(headers);
    }
}

/**
 * Fallback function to guess field mappings based on common header names
 * 
 * @param {string[]} headers 
 * @returns {Object}
 */
function guessFieldMappings(headers) {
    const lowerHeaders = headers.map(h => h.toLowerCase());
    
    const nameColumn = headers.find((h, i) => 
        lowerHeaders[i].includes('name') && !lowerHeaders[i].includes('email')
    ) || null;
    
    const emailColumn = headers.find((h, i) => 
        lowerHeaders[i].includes('email') || lowerHeaders[i].includes('e-mail')
    ) || null;
    
    const resumeUrlColumn = headers.find((h, i) => 
        lowerHeaders[i].includes('resume') || 
        lowerHeaders[i].includes('cv') || 
        lowerHeaders[i].includes('url') ||
        lowerHeaders[i].includes('link')
    ) || null;
    
    const phoneColumn = headers.find((h, i) => 
        lowerHeaders[i].includes('phone') || 
        lowerHeaders[i].includes('mobile') || 
        lowerHeaders[i].includes('contact')
    ) || null;
    
    const dynamicColumns = headers.filter(h => 
        h !== nameColumn && 
        h !== emailColumn && 
        h !== resumeUrlColumn && 
        h !== phoneColumn
    );
    
    return {
        nameColumn,
        emailColumn,
        resumeUrlColumn,
        phoneColumn,
        dynamicColumns
    };
}

/**
 * Main worker function to parse file
 * 
 * @param {string} interviewId - MongoDB ObjectId of the interview
 * @param {string} integrationData - Original file name or metadata (could be base64 or file info)
 * @param {string} filePath - Path to the saved file on server
 */
export const localfile_parseFile = async (interviewId, integrationData, filePath) => {
    let interview;
    let localFileData;

    try {
        console.log(`[LocalFile Parse] Starting for interview: ${interviewId}`);
        console.log(`[LocalFile Parse] File path: ${filePath}`);

        // 1️⃣ Fetch interview
        interview = await Interview.findById(interviewId);
        if (!interview) {
            throw new Error("Interview not found");
        }

        // Emit progress: start (0%)
        await emitLocalFileProgress({
            interviewId,
            ownerId: interview.owner,
            step: "PARSE_FILE",
            subStep: "start"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "Starting local file parsing..."
        });

        // 2️⃣ Determine file type and validate
        const fileExtension = path.extname(filePath).toLowerCase().replace('.', '');
        const originalFileName = typeof integrationData === 'string' 
            ? integrationData 
            : (integrationData?.fileName || `uploaded_file.${fileExtension}`);

        if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
            throw new Error(`Unsupported file type: ${fileExtension}. Only CSV, XLSX, and XLS are supported.`);
        }

        // 3️⃣ Create LocalFileData document
        localFileData = await LocalFileData.create({
            interview: interview._id,
            owner: interview.owner,
            originalFileName,
            fileType: fileExtension,
            serverFilePath: filePath,
            status: "parsing",
            logs: [{ message: `Started parsing ${fileExtension.toUpperCase()} file: ${originalFileName}`, level: "info" }]
        });

        // Emit progress: reading (3%)
        await emitLocalFileProgress({
            interviewId,
            ownerId: interview.owner,
            step: "PARSE_FILE",
            subStep: "reading"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: `Reading ${fileExtension.toUpperCase()} file...`
        });

        // 4️⃣ Read and parse file
        let csvContent;
        let headers;
        let rows;

        if (fileExtension === 'csv') {
            // Read CSV directly
            csvContent = fs.readFileSync(filePath, 'utf-8');
        } else {
            // Convert XLSX/XLS to CSV
            await emitLocalFileProgress({
                interviewId,
                ownerId: interview.owner,
                step: "PARSE_FILE",
                subStep: "converting"
            });

            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "INFO",
                step: "Converting Excel file to CSV format..."
            });

            csvContent = convertXlsxToCsv(filePath);
        }

        // Parse CSV content
        const parsed = parseCsvContent(csvContent);
        headers = parsed.headers;
        rows = parsed.rows;

        if (rows.length === 0) {
            throw new Error("No data rows found in file");
        }

        console.log(`[LocalFile Parse] Found ${rows.length} rows with headers: ${headers.join(', ')}`);

        localFileData.headers = headers;
        localFileData.rawData = rows;
        localFileData.totalRowsParsed = rows.length;
        localFileData.logs.push({ 
            message: `Parsed ${rows.length} rows with ${headers.length} columns`, 
            level: "info" 
        });
        await localFileData.save();

        // Emit progress: analyzing (10%)
        await emitLocalFileProgress({
            interviewId,
            ownerId: interview.owner,
            step: "PARSE_FILE",
            subStep: "analyzing"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "AI analyzing file structure..."
        });

        // 5️⃣ Analyze field mappings using AI
        const fieldMapping = await analyzeFileFields(headers, rows);
        localFileData.fieldMapping = fieldMapping;
        localFileData.logs.push({ 
            message: `Identified field mappings - Name: ${fieldMapping.nameColumn}, Email: ${fieldMapping.emailColumn}, Resume: ${fieldMapping.resumeUrlColumn}`, 
            level: "info" 
        });
        await localFileData.save();

        // 6️⃣ Normalize entries based on field mapping
        const normalizedEntries = rows.map((row, index) => {
            const normalized = {
                rowIndex: index,
                name: fieldMapping.nameColumn ? (row[fieldMapping.nameColumn] || '') : '',
                email: fieldMapping.emailColumn ? (row[fieldMapping.emailColumn] || '') : '',
                resumeUrl: fieldMapping.resumeUrlColumn ? (row[fieldMapping.resumeUrlColumn] || '') : '',
                phone: fieldMapping.phoneColumn ? (row[fieldMapping.phoneColumn] || '') : '',
                dynamicData: {}
            };

            // Add dynamic fields
            if (fieldMapping.dynamicColumns && Array.isArray(fieldMapping.dynamicColumns)) {
                fieldMapping.dynamicColumns.forEach(col => {
                    if (row[col] !== undefined) {
                        normalized.dynamicData[col] = row[col];
                    }
                });
            }

            return normalized;
        });

        localFileData.entries = normalizedEntries;
        localFileData.status = "completed";
        localFileData.logs.push({ 
            message: `Successfully processed ${normalizedEntries.length} candidate entries`, 
            level: "success" 
        });
        await localFileData.save();

        // 7️⃣ Update interview
        interview.status = "localfile_parsed";
        interview.totalCandidates = normalizedEntries.length;
        interview.logs.push({
            message: `Local file parsed successfully: ${normalizedEntries.length} candidates`,
            level: "success"
        });
        await interview.save();

        // Emit progress: complete (15%)
        await emitLocalFileProgress({
            interviewId,
            ownerId: interview.owner,
            step: "PARSE_FILE",
            subStep: "complete"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "SUCCESS",
            step: `File parsed: ${normalizedEntries.length} candidates found`
        });

        console.log(`[LocalFile Parse] Completed for interview: ${interviewId}`);

    } catch (error) {
        console.error("[LocalFile Parse] Error:", error);

        // Update localfile data status
        if (localFileData) {
            localFileData.status = "failed";
            localFileData.errorMessage = error.message;
            localFileData.logs.push({ message: `Error: ${error.message}`, level: "error" });
            await localFileData.save();
        }

        // Update interview status
        if (interview) {
            interview.currentStatus = "FAILED";
            interview.logs.push({
                message: `Local file parse failed: ${error.message}`,
                level: "error"
            });
            await interview.save();

            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "ERROR",
                step: `File parsing failed: ${error.message}`
            });
        }

        throw error;
    }
};
