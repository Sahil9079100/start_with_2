import {Interview} from "../../models/Interview.model.js";
import {Candidate} from "../../models/Candidate.model.js";

import axios from "axios";
import { google } from "googleapis";
import { createOAuthClient } from "../../utils/googleClient.js";
import GoogleIntegration from "../../models/googleIntegration.model.js";
import { sort_resume_as_job_description } from "./sort_resume_as_job_description.controller.js";

export const extract_text_from_resumeurl = async (interviewId) => {
    try {
        console.log("[extract_text_from_resumeurl] Starting for interview:", interviewId);

        const interview = await Interview.findById(interviewId);
        if (!interview) throw new Error("Interview not found");

        const candidates = await Candidate.find({ interview: interviewId });
        if (!candidates.length) throw new Error("No candidates found for this interview");

        for (let candidate of candidates) {
            try {
                if (candidate.isResumeScanned) {
                    console.log(`Skipping ${candidate.email || "unknown"}, already scanned.`);
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

                candidate.resumeSummary = text;
                candidate.isResumeScanned = true;
                await candidate.save();

                interview.logs.push({
                    message: `Extracted resume text for ${candidate.email || "unknown"}`,
                    level: "success",
                });
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

        let pdfBuffer;

        if (resumeUrl.includes("drive.google.com")) {
            const fileIdMatch = resumeUrl.match(/\/d\/(.*?)\//);
            const fileId = fileIdMatch ? fileIdMatch[1] : null;
            if (!fileId) throw new Error("Invalid Google Drive URL");

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
        else if (resumeUrl.endsWith(".pdf")) {
            const response = await axios.get(resumeUrl, { responseType: "arraybuffer" });
            pdfBuffer = Buffer.from(response.data);
        }
        else {
            throw new Error("Unsupported resume URL format");
        }

        // console.log("PDF buffer fetched, length:", pdfBuffer);
        // Extract text from PDF
        const pdfData = await pdfParse(pdfBuffer);
        // console.log("PDF data:", pdfData);
        // console.log("PDF data:", pdfData.text);
        return pdfData.text || "";
    } catch (err) {
        console.error("Error in TextExtractor:", err.message);
        console.error("Error in TextExtractor:", err);
        return "";
    }
}