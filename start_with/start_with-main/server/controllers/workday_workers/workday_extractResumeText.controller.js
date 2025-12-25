/**
 * WORKDAY STEP 3: Extract Text from Resume URLs (OCR)
 * 
 * This worker extracts text from candidate resumes for Workday integration.
 * It reuses the TextExtractor from the Google Sheet pipeline.
 * 
 * What it does:
 * 1. Fetches all candidates for the interview
 * 2. For each candidate, extracts text from resume URL
 * 3. Saves the extracted text to the Candidate document
 * 4. Emits progress to the frontend
 */

import { Interview } from "../../models/Interview.model.js";
import { Candidate } from "../../models/Candidate.model.js";
import { emitWorkdayProgress } from "../../utils/workdayProgressTracker.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";
import { TextExtractor } from "../workers/extract_text_from_resumeurl.controller.js";

/**
 * Main worker function to extract text from Workday candidate resumes
 * 
 * @param {string} interviewId - MongoDB ObjectId of the interview
 */
export const workday_extractResumeText = async (interviewId) => {
    let interview;

    try {
        console.log(`[Workday OCR] Starting for interview: ${interviewId}`);

        // 1️⃣ Fetch interview
        interview = await Interview.findById(interviewId);
        if (!interview) {
            throw new Error("Interview not found");
        }

        // Emit progress: start (30%)
        await emitWorkdayProgress({
            interviewId,
            ownerId: interview.owner,
            step: "OCR",
            subStep: "start"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "Starting resume text extraction..."
        });

        // 2️⃣ Fetch all candidates for this interview
        const candidates = await Candidate.find({ 
            interview: interviewId,
            isResumeScanned: false // Only process unscanned resumes
        });

        if (!candidates || candidates.length === 0) {
            console.log(`[Workday OCR] No unscanned candidates found for interview: ${interviewId}`);
            
            // Check if there are any candidates at all
            const totalCandidates = await Candidate.countDocuments({ interview: interviewId });
            if (totalCandidates === 0) {
                throw new Error("No candidates found for this interview");
            }

            // All candidates already scanned
            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "INFO",
                step: "All resumes already processed"
            });

            await emitWorkdayProgress({
                interviewId,
                ownerId: interview.owner,
                step: "OCR",
                subStep: "complete"
            });

            return;
        }

        console.log(`[Workday OCR] Processing ${candidates.length} candidates`);

        interview.totalCandidates = candidates.length;
        await interview.save();

        // 3️⃣ Process each candidate's resume
        const totalCandidates = candidates.length;
        let processedCount = 0;
        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < totalCandidates; i++) {
            const candidate = candidates[i];

            try {
                // Skip if no resume URL
                if (!candidate.resumeUrl || candidate.resumeUrl === "none") {
                    console.log(`[Workday OCR] Skipping candidate ${candidate.email}: no resume URL`);
                    candidate.isResumeScanned = true;
                    candidate.resumeSummary = "No resume provided";
                    await candidate.save();
                    failedCount++;
                    processedCount++;
                    continue;
                }

                console.log(`[Workday OCR] Processing resume for: ${candidate.email}`);

                // Extract text using the shared TextExtractor
                const resumeText = await TextExtractor(candidate.resumeUrl, interview.owner);

                if (resumeText && resumeText.length > 50) {
                    candidate.resumeSummary = resumeText;
                    candidate.isResumeScanned = true;
                    await candidate.save();
                    successCount++;
                    console.log(`[Workday OCR] Successfully extracted text for: ${candidate.email}`);
                } else {
                    candidate.isResumeScanned = true;
                    candidate.resumeSummary = resumeText || "Unable to extract text from resume";
                    await candidate.save();
                    failedCount++;
                    console.log(`[Workday OCR] Minimal text extracted for: ${candidate.email}`);
                }

            } catch (candidateError) {
                console.error(`[Workday OCR] Error processing candidate ${candidate.email}:`, candidateError.message);
                candidate.isResumeScanned = true;
                candidate.resumeSummary = `Error extracting resume: ${candidateError.message}`;
                await candidate.save();
                failedCount++;
            }

            processedCount++;

            // Emit progress for each candidate (30-65% range)
            await emitWorkdayProgress({
                interviewId,
                ownerId: interview.owner,
                step: "OCR",
                subStep: "progress",
                current: processedCount,
                total: totalCandidates
            });

            // Emit log every 5 candidates
            if (processedCount % 5 === 0 || processedCount === 1 || processedCount === totalCandidates) {
                await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                    interview: interviewId,
                    level: "INFO",
                    step: `Extracted resume ${processedCount}/${totalCandidates}...`
                });
            }
        }

        // 4️⃣ Update interview
        interview.status = "workday_ocr_complete";
        interview.logs.push({
            message: `Resume extraction complete: ${successCount} success, ${failedCount} failed`,
            level: "success"
        });
        await interview.save();

        // Emit progress: complete (65%)
        await emitWorkdayProgress({
            interviewId,
            ownerId: interview.owner,
            step: "OCR",
            subStep: "complete"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "SUCCESS",
            step: `Resume extraction complete: ${successCount} success, ${failedCount} failed`
        });

        console.log(`[Workday OCR] Completed for interview: ${interviewId}`);
        console.log(`[Workday OCR] Success: ${successCount}, Failed: ${failedCount}`);

    } catch (error) {
        console.error("[Workday OCR] Error:", error);

        // Update interview status
        if (interview) {
            interview.currentStatus = "FAILED";
            interview.logs.push({
                message: `Workday OCR failed: ${error.message}`,
                level: "error"
            });
            await interview.save();

            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "ERROR",
                step: `Resume extraction failed: ${error.message}`
            });
        }

        throw error;
    }
};
