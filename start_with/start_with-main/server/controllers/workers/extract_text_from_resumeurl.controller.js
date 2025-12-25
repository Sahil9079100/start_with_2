import { Interview } from "../../models/Interview.model.js";
import { Candidate } from "../../models/Candidate.model.js";

import axios from "axios";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { google } from "googleapis";
import { createOAuthClient } from "../../utils/googleClient.js";
import GoogleIntegration from "../../models/googleIntegration.model.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";
import { __RETRY_ENGINE } from "../../engines/retry.Engine.js";
import { fileURLToPath } from "url";
import { emitProgress } from "../../utils/progressTracker.js";

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Python OCR script
const PYTHON_SCRIPT_PATH = path.resolve(__dirname, "../../scripts/extract_pdf_text.py");

// Python executable - prefer venv, fallback to system python
const SERVER_ROOT = path.resolve(__dirname, "../../");
const VENV_PYTHON = path.join(SERVER_ROOT, ".venv", "bin", "python");
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE ||
    (fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3");

// OCR DPI setting (lower = faster, 150 is good balance)
const OCR_DPI = Number(process.env.OCR_DPI || 150);
// Minimum chars before falling back to OCR
const MIN_CHARS_FOR_OCR = Number(process.env.MIN_CHARS_FOR_OCR || 50);

// Concurrency control for Python OCR processes
const OCR_CONCURRENCY = Number(process.env.OCR_CONCURRENCY || 2);
let activeOcrProcesses = 0;
const ocrQueue = [];

// Log which Python executable will be used
console.log(`[Python OCR] Using Python executable: ${PYTHON_EXECUTABLE}`);
console.log(`[Python OCR] Script path: ${PYTHON_SCRIPT_PATH}`);

const runWithConcurrencyLimit = (fn) => new Promise((resolve, reject) => {
    const execute = async () => {
        activeOcrProcesses++;
        try {
            const result = await fn();
            resolve(result);
        } catch (err) {
            reject(err);
        } finally {
            activeOcrProcesses--;
            if (ocrQueue.length > 0) {
                const next = ocrQueue.shift();
                setImmediate(next);
            }
        }
    };

    if (activeOcrProcesses < OCR_CONCURRENCY) {
        execute();
    } else {
        ocrQueue.push(execute);
    }
});

export const extract_text_from_resumeurl = async (interviewId) => {
    try {
        console.log("[extract_text_from_resumeurl] Starting for interview:", interviewId);


        const interview = await Interview.findById(interviewId);
        if (!interview) throw new Error("Interview not found");

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: `Extractiing text from resume url started...`
        });

        // Emit progress: OCR start (30%)
        await emitProgress({ interviewId, ownerId: interview.owner, step: "OCR", subStep: "start" });

        const candidates = await Candidate.find({ interview: interviewId });
        if (!candidates.length) throw new Error("No candidates found for this interview");

        interview.totalCandidates = candidates.length;
        await interview.save();
        let count = 0
        for (let candidate of candidates) {
            try {
                if (candidate.isResumeScanned) {
                    console.log(`Skipping ${candidate.email || "unknown"}, already scanned.`);
                    await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                        interview: interviewId,
                        level: "INFO",
                        step: `Skipping ${candidate.email || "unknown"}, already scanned.`
                    });
                    continue;
                }

                console.log(`Extracting resume for: ${candidate.email || "unknown"}`);

                // console.log("Resume URL:", candidate.resumeUrl, "Owner:", candidate.owner);
                const text = await TextExtractor(candidate.resumeUrl, candidate.owner);
                // console.log("Extracted text:", text);
                if (!text || text.trim().length < 20) {
                    console.warn(`Extracted empty or invalid text for ${candidate.resumeUrl}`);
                    interview.logs.push({
                        message: `Empty or invalid text for ${candidate.email || "unknown"}`,
                        level: "error",
                    });
                    continue;
                }

                await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                    interview: interviewId,
                    level: "INFO",
                    step: `Extracting resume for: ${candidate.email || "unknown"} completed.`,
                    data: {
                        resumeCollected: "SUCCESS"
                    }
                });

                candidate.resumeSummary = text;
                candidate.isResumeScanned = true;
                await candidate.save();

                interview.logs.push({
                    message: `Extracted resume text for ${candidate.email || "unknown"}`,
                    level: "success",
                });
                const i = count;
                interview.resumeCollected = i + 1;
                await interview.save();
                count++;

                // Emit progress: OCR progress (30-65% range)
                await emitProgress({ interviewId, ownerId: interview.owner, step: "OCR", subStep: "progress", current: count, total: candidates.length });
            } catch (err) {
                console.error(`Failed to extract resume for ${candidate.email || "unknown"}:`, err.message);
                interview.logs.push({
                    message: `Error extracting resume for ${candidate.email || "unknown"}: ${err.message}`,
                    level: "error",
                });
            }
        }

        interview.status = "extract_text_from_resumeurl";
        interview.logs.push({
            message: "All candidate resumes processed for text extraction.",
            level: "success",
        });
        await interview.save();

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "SUCCESS",
            step: `All candidate resumes are extracted successfully.`
        });

        // Emit progress: OCR complete (65%)
        await emitProgress({ interviewId, ownerId: interview.owner, step: "OCR", subStep: "complete" });

        // ✅ Pipeline continues via BullMQ - next job (SORTING) enqueued by queue worker
        console.log("[extract_text_from_resumeurl] Completed for interview:", interviewId);
    } catch (error) {
        console.error(" Error in extract_text_from_resumeurl:", error);

        // Persist interview failure state so the centralized retry engine can pick it up
        try {
            await Interview.findByIdAndUpdate(interviewId, {
                $set: { currentStatus: "FAILED", lastProcessedStep: "OCR" },
                $push: { logs: { message: `Failed during resume extraction: ${error.message}`, level: "error" } },
            });
        } catch (updateErr) {
            console.error(`[OCR] failed to update interview status for ${interviewId}:`, updateErr?.message || updateErr);
        }

        // Attempt to emit progress log with owner if available
        try {
            const interviewDoc = await Interview.findById(interviewId);
            await recruiterEmit(interviewDoc?.owner || null, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "ERROR",
                step: `Failed during resume extraction: ${error.message}`
            });
        } catch (emitErr) {
            // ignore emit failures
        }

        // Trigger retry engine (guarded)
        try {
            await __RETRY_ENGINE(interviewId);
        } catch (retryErr) {
            console.error(`[RETRY ENGINE ERROR] retry engine failed for interview=${interviewId}:`, retryErr?.message || retryErr);
        }
    }
};


export async function TextExtractor(resumeUrl, ownerId, retries = 3) {
    // small sleep helper for retries
    const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
        if (!resumeUrl) throw new Error("No resume URL provided");

        console.log("Extracting text from resume URL:", resumeUrl);
        let pdfBuffer;

        // Helper: extract Google Drive fileId from various link formats
        const extractDriveFileId = (url) => {
            try {
                const patterns = [
                    /\/(?:file|document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/,
                    /[?&]id=([a-zA-Z0-9_-]+)/,
                    /\/d\/([a-zA-Z0-9_-]+)/,
                ];
                for (const p of patterns) {
                    const m = url.match(p);
                    if (m && m[1]) return m[1];
                }
                return null;
            } catch (_) {
                return null;
            }
        };

        // Fetch PDF buffer
        if (resumeUrl.includes("drive.google.com")) {
            const fileId = extractDriveFileId(resumeUrl);
            if (!fileId) throw new Error("Invalid Google Drive URL: unable to parse file id");

            const integration = await GoogleIntegration.findOne({ owner: ownerId, provider: "google" });
            if (!integration || !integration.tokens) throw new Error("No Google integration found for this owner");

            const oAuth2Client = createOAuthClient();
            oAuth2Client.setCredentials(integration.tokens);
            const drive = google.drive({ version: "v3", auth: oAuth2Client });

            const response = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
            pdfBuffer = Buffer.from(response.data);
        }
        else if (/\.pdf(\b|[?#])/i.test(resumeUrl)) {
            const response = await axios.get(resumeUrl, { responseType: "arraybuffer" });
            pdfBuffer = Buffer.from(response.data);
        }
        else {
            console.warn("Unsupported resume URL format (expects PDF):", resumeUrl);
            return "";
        }

        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error("Empty PDF buffer");
        }

        // Extract text using Python script (with concurrency control)
        const text = await runWithConcurrencyLimit(() => extractTextWithPython(pdfBuffer));
        return text;

    } catch (err) {
        console.error("Error in TextExtractor:", err?.message || err);
        if (retries > 0) {
            console.warn(`TextExtractor failed, will retry ${retries} more time(s) after delay...`);
            const delay = 1000 * Math.pow(2, (3 - retries));
            await _sleep(delay);
            return TextExtractor(resumeUrl, ownerId, retries - 1);
        }
        console.error("TextExtractor: all retries exhausted. Returning empty string.");
        return "";
    }
}

/**
 * Calls the Python script to extract text from PDF buffer.
 * Uses PyMuPDF for native extraction, falls back to OCR if needed.
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextWithPython(pdfBuffer) {
    return new Promise((resolve, reject) => {
        // Check if Python script exists
        if (!fs.existsSync(PYTHON_SCRIPT_PATH)) {
            reject(new Error(`Python script not found at: ${PYTHON_SCRIPT_PATH}`));
            return;
        }

        const args = [
            PYTHON_SCRIPT_PATH,
            "--stdin",
            `--min-chars=${MIN_CHARS_FOR_OCR}`,
            `--ocr-dpi=${OCR_DPI}`,
            "--lang=eng"
        ];

        console.log(`[Python OCR] Spawning: ${PYTHON_EXECUTABLE} ${args.join(" ")}`);

        const pythonProcess = spawn(PYTHON_EXECUTABLE, args, {
            stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        pythonProcess.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            stderr += data.toString();
            // Log stderr in real-time for debugging
            console.error(`[Python OCR stderr]: ${data.toString()}`);
        });

        pythonProcess.on("error", (err) => {
            reject(new Error(`Python process failed to start: ${err.message}. Make sure Python is installed and accessible.`));
        });

        pythonProcess.on("close", (code) => {
            if (code !== 0) {
                console.error(`[Python OCR] Script exited with code ${code}`);
                console.error(`[Python OCR] stderr: ${stderr}`);
                console.error(`[Python OCR] stdout: ${stdout}`);

                // Try to parse any partial output
                try {
                    const result = JSON.parse(stdout);
                    if (result.text) {
                        resolve(result.text);
                        return;
                    }
                    if (result.error) {
                        reject(new Error(`Python OCR error: ${result.error}`));
                        return;
                    }
                } catch (_) { }

                reject(new Error(`Python OCR failed (code ${code}): ${stderr || stdout || "Unknown error"}`));
                return;
            }

            try {
                const result = JSON.parse(stdout);
                if (!result.success) {
                    reject(new Error(result.error || "Python extraction failed"));
                    return;
                }

                console.log(`[Python OCR] Extracted ${result.char_count} chars via ${result.method}${result.ocr_used ? " (OCR used)" : ""}`);
                resolve(result.text || "");
            } catch (parseErr) {
                console.error("[Python OCR] Failed to parse output:", stdout);
                reject(new Error(`Failed to parse Python output: ${parseErr.message}`));
            }
        });

        // Write PDF buffer to stdin
        pythonProcess.stdin.write(pdfBuffer);
        pythonProcess.stdin.end();
    });
}