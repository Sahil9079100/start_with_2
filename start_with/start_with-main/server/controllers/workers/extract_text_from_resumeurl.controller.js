import { Interview } from "../../models/Interview.model.js";
import { Candidate } from "../../models/Candidate.model.js";

import axios from "axios";
import FormData from "form-data";
import { google } from "googleapis";
import { createOAuthClient } from "../../utils/googleClient.js";
import GoogleIntegration from "../../models/googleIntegration.model.js";
import { sort_resume_as_job_description } from "./sort_resume_as_job_description.controller.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";

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
        await Interview.findByIdAndUpdate(interviewId, {
            status: "failed",
            $push: { logs: { message: `Failed during resume extraction: ${error.message}`, level: "error" } },
        });
    }
};


export async function TextExtractor(resumeUrl, ownerId) {
    try {
        // const pdfParse = (await import("pdf-parse")).default || (await import("pdf-parse"));
        const { default: pdfParse } = await import("pdf-parse");

        if (!resumeUrl) throw new Error("No resume URL provided");

        console.log("Extracting text from resume URL:", resumeUrl);
        let pdfBuffer;

        // Helper: OCR fallback using external service (accepts only raw PDF)
        const ocrExtract = async () => {
            console.log("IN THE OCR")
            const endpoint = process.env.OCR_SERVICE_URL || "https://ocr.startwith.live/ocr";
            try {
                // If we have the PDF buffer (e.g., Drive files), try sending raw PDF
                if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
                    try {
                        const form = new FormData();
                        form.append("file", pdfBuffer, { filename: "resume.pdf", contentType: "application/pdf" });

                        const { data } = await axios.post(endpoint, form, {
                            headers: {
                                ...form.getHeaders(),
                            },
                            timeout: 90000,
                            maxBodyLength: Infinity,
                            maxContentLength: Infinity,
                        });
                        if (data && typeof data.text === "string" && data.text.trim().length > 0) {
                            console.log("OCR (via PDF buffer) succeeded, extracted chars:", data.text.length);
                            return data.text;
                        }
                    } catch (err) {
                        console.warn("OCR via PDF buffer failed:", err?.message || err);
                    }
                }
                // No buffer available; cannot run OCR without a raw PDF
                return "";
            } catch (err) {
                console.error("OCR extract error:", err?.message || err);
                return "";
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
            // const ocrText = await ocrExtract();
            return ocrText || parsed || "";
        } catch (parseErr) {
            console.warn("pdf-parse threw an error. Falling back to OCR...", parseErr?.message || parseErr);
            // const ocrText = await ocrExtract();
            return ocrText || "";
        }
    } catch (err) {
        console.error("Error in TextExtractor:", err?.message || err);
        // No URL-based OCR fallback; service accepts only raw PDF
        return "";
    }
}