import { Interview } from "../../models/Interview.model.js";
import { Candidate } from "../../models/Candidate.model.js";

import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import os from "os";
import path from "path";
import { pdf } from "pdf-to-img";
import Tesseract from "tesseract.js";
import { google } from "googleapis";
import { createOAuthClient } from "../../utils/googleClient.js";
import GoogleIntegration from "../../models/googleIntegration.model.js";
import { sort_resume_as_job_description } from "./sort_resume_as_job_description.controller.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";
import { __RETRY_ENGINE } from "../../engines/retry.Engine.js";

// Simple in-process semaphore to limit concurrent OCR tasks (keeps CPU/memory in check on hosts)
const OCR_CONCURRENCY = Number(process.env.OCR_CONCURRENCY || 1);
// Image rasterization scale for pdf->image conversion. Lower this to reduce memory usage.
const OCR_IMAGE_SCALE = Number(process.env.OCR_IMAGE_SCALE || 2);
const createSemaphore = (limit) => {
    let active = 0;
    const queue = [];
    const run = (fn) => new Promise((resolve, reject) => {
        const task = async () => {
            active++;
            try {
                const res = await fn();
                resolve(res);
            } catch (err) {
                reject(err);
            } finally {
                active--;
                if (queue.length) {
                    const next = queue.shift();
                    // schedule next to avoid deep recursion
                    setImmediate(next);
                }
            }
        };
        if (active < limit) task();
        else queue.push(task);
    });
    return { run };
};
const ocrSemaphore = createSemaphore(OCR_CONCURRENCY);

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

        setTimeout(() => {
            sort_resume_as_job_description(interviewId);
        }, 1000);
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
    try {
        // const pdfParse = (await import("pdf-parse")).default || (await import("pdf-parse"));
        const { default: pdfParse } = await import("pdf-parse");

        if (!resumeUrl) throw new Error("No resume URL provided");

        console.log("Extracting text from resume URL:", resumeUrl);
        let pdfBuffer;

        // small sleep helper for retries
        const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        // Helper: OCR fallback using external service (accepts only raw PDF)
        const ocrExtract = async () => {
            // Local OCR: write PDF buffer to temp file, convert pages to images, run tesseract
            if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) return "";

            const tmpName = `resume-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
            const tmpPath = path.join(os.tmpdir(), tmpName);
            let worker;
            try {
                await fs.promises.writeFile(tmpPath, pdfBuffer);

                const pagesText = [];
                let pageNumber = 1;

                // Convert PDF -> images (pdf-to-img returns an async iterable of image buffers)
                // Try conversion; if the PDF structure is invalid, attempt a lightweight repair
                let document;
                try {
                    document = await pdf(tmpPath, { scale: OCR_IMAGE_SCALE });
                } catch (convErr) {
                    console.warn("PDF->image conversion failed, attempting to repair PDF and retry:", convErr?.message || convErr);
                    // Attempt to repair the PDF by reserializing it via pdf-lib (may fix structure issues)
                    try {
                        const { PDFDocument } = await import('pdf-lib');
                        const repaired = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                        const repairedBytes = await repaired.save();
                        await fs.promises.writeFile(tmpPath, repairedBytes);
                        // retry conversion with repaired file
                        document = await pdf(tmpPath, { scale: OCR_IMAGE_SCALE });
                        console.log("PDF repair + retry succeeded.");
                    } catch (repairErr) {
                        console.error("PDF repair attempt failed:", repairErr?.message || repairErr);
                        throw convErr; // rethrow original conversion error
                    }
                }

                try {
                    for await (let imageBuffer of document) {
                        console.log(`Processing OCR page ${pageNumber}...`);
                        const { data } = await Tesseract.recognize(imageBuffer, "eng");
                        const text = data?.text || "";
                        const confidence = data?.confidence || 0;
                        pagesText.push({ page: pageNumber, text: text.trim(), confidence: Number(confidence) });
                        console.log(`Page ${pageNumber} OCR done – Confidence: ${confidence}`);
                        // release reference to the large image buffer to allow GC to reclaim memory
                        imageBuffer = null;
                        pageNumber++;
                        // cooperative yield so GC can run sooner on some runtimes
                        await new Promise((r) => setImmediate(r));
                        if (global && typeof global.gc === 'function') {
                            try { global.gc(); } catch (e) { /* ignore if not permitted */ }
                        }
                    }
                } catch (pdfErr) {
                    console.warn(`PDF->image conversion/iteration stopped at page ${pageNumber}:`, pdfErr?.message || pdfErr);
                }

                if (!pagesText.length) {
                    throw new Error("No pages could be processed by OCR");
                }

                const fullText = pagesText.map(p => p.text).join("\n\n--- Page Break ---\n\n");
                console.log(`Local OCR extracted ${fullText.length} chars from ${pagesText.length} pages`);

                return fullText;
            } catch (err) {
                console.error("Local OCR failed:", err?.message || err);
                if (worker) {
                    try { await worker.terminate(); } catch (e) { /* ignore */ }
                }
                return "";
            } finally {
                // cleanup temp file
                fs.unlink(tmpPath, () => { });
            }
        };

        // Helper: extract Google Drive fileId from various link formats
        const extractDriveFileId = (url) => {
            try {
                // Common patterns:
                // - https://drive.google.com/file/d/<id>/view
                // - https://drive.google.com/open?id=<id>
                // - https://drive.google.com/uc?id=<id>&export=download
                // - https://docs.google.com/document/d/<id>/edit (Docs export not PDF, but id is extractable)
                const patterns = [
                    /\/(?:file|document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/, // file/d/<id> or document/d/<id>
                    /[?&]id=([a-zA-Z0-9_-]+)/, // ...?id=<id>
                    /\/d\/([a-zA-Z0-9_-]+)/, // generic /d/<id>
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

        if (resumeUrl.includes("drive.google.com")) {
            const fileId = extractDriveFileId(resumeUrl);
            if (!fileId) throw new Error("Invalid Google Drive URL: unable to parse file id");

            const integration = await GoogleIntegration.findOne({ owner: ownerId, provider: "google" });
            if (!integration || !integration.tokens) throw new Error("No Google integration found for this owner");

            // Create OAuth2 client with client ID & secret so refresh requests include client_id
            const oAuth2Client = createOAuthClient();
            oAuth2Client.setCredentials(integration.tokens);
            const drive = google.drive({ version: "v3", auth: oAuth2Client });

            const response = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
            // console.log("Google Drive PDF response:", response);
            pdfBuffer = Buffer.from(response.data);
        }
        // Handle direct PDF URLs
        else if (/\.pdf(\b|[?#])/i.test(resumeUrl)) {
            const response = await axios.get(resumeUrl, { responseType: "arraybuffer" });
            pdfBuffer = Buffer.from(response.data);
        }
        else {
            // Not a Drive link or a direct PDF. Cannot OCR without a raw PDF buffer.
            console.warn("Unsupported resume URL format for pdf-parse and OCR (expects raw PDF):", resumeUrl);
            return "";
        }

        // console.log("PDF buffer fetched, length:", pdfBuffer);
        // Extract text from PDF
        try {
            const pdfData = await pdfParse(pdfBuffer);
            const parsed = pdfData?.text || "";
            if (parsed && parsed.trim().length >= 20) {
                return parsed;
            }
            console.warn("pdf-parse returned empty/short text. Falling back to OCR...");
            const ocrText = await ocrSemaphore.run(() => ocrExtract());
            return ocrText || parsed || "";
        } catch (parseErr) {
            console.warn("pdf-parse threw an error. Falling back to OCR...", parseErr?.message || parseErr);
            const ocrText = await ocrSemaphore.run(() => ocrExtract());
            return ocrText || "";
        }
    } catch (err) {
        console.error("Error in TextExtractor:", err?.message || err);
        if (retries > 0) {
            console.warn(`TextExtractor failed, will retry ${retries} more time(s) after delay...`);
            // small backoff: 1s -> 2s -> 4s
            const delay = 1000 * Math.pow(2, (3 - retries));
            await _sleep(delay);
            return TextExtractor(resumeUrl, ownerId, retries - 1);
        }
        // exhausted retries
        console.error("TextExtractor: all retries exhausted. Returning empty string.");
        return "";
    }
}