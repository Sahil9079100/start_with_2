/**
 * WORKDAY STEP 2: Separate Candidates and Save
 * 
 * This worker processes the fetched Workday data and creates Candidate documents.
 * 
 * What it does:
 * 1. Fetches the WorkdayData document with normalized entries
 * 2. Creates Candidate documents for each entry
 * 3. Updates interview with candidate count
 * 4. Emits progress to the frontend
 */

import { Interview } from "../../models/Interview.model.js";
import { WorkdayData } from "../../models/WorkdayData.model.js";
import { Candidate } from "../../models/Candidate.model.js";
import { emitWorkdayProgress } from "../../utils/workdayProgressTracker.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";

/**
 * Main worker function to separate and save candidates from Workday data
 * 
 * @param {string} interviewId - MongoDB ObjectId of the interview
 */
export const workday_separateCandidates = async (interviewId) => {
    let interview;
    let workdayData;

    try {
        console.log(`[Workday Separate] Starting for interview: ${interviewId}`);

        // 1️⃣ Fetch interview
        interview = await Interview.findById(interviewId);
        if (!interview) {
            throw new Error("Interview not found");
        }

        // Emit progress: start (15%)
        await emitWorkdayProgress({
            interviewId,
            ownerId: interview.owner,
            step: "SEPARATE_CANDIDATES",
            subStep: "start"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "Starting candidate separation from Workday data..."
        });

        // 2️⃣ Fetch WorkdayData
        workdayData = await WorkdayData.findOne({ interview: interviewId });
        if (!workdayData) {
            throw new Error("Workday data not found for this interview");
        }

        if (!workdayData.entries || workdayData.entries.length === 0) {
            throw new Error("No entries found in Workday data");
        }

        workdayData.logs.push({ 
            message: `Starting candidate separation for ${workdayData.entries.length} entries`, 
            level: "info" 
        });
        await workdayData.save();

        // Emit progress: analyzing (18%)
        await emitWorkdayProgress({
            interviewId,
            ownerId: interview.owner,
            step: "SEPARATE_CANDIDATES",
            subStep: "analyzing"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "Processing candidate entries..."
        });

        // 3️⃣ Process each entry and create Candidate documents
        const totalEntries = workdayData.entries.length;
        let savedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < totalEntries; i++) {
            const entry = workdayData.entries[i];

            try {
                // Skip entries without required data
                if (!entry.email && !entry.name && !entry.resumeUrl) {
                    console.log(`[Workday Separate] Skipping entry ${i + 1}: missing required fields`);
                    skippedCount++;
                    continue;
                }

                // Generate email if not present
                const candidateEmail = entry.email || 
                    `workday_${entry.workdayId || Date.now()}_${i}@workday.local`;

                // Check if candidate already exists for this interview
                const existingCandidate = await Candidate.findOne({
                    interview: interviewId,
                    email: candidateEmail
                });

                if (existingCandidate) {
                    console.log(`[Workday Separate] Candidate already exists: ${candidateEmail}`);
                    skippedCount++;
                    continue;
                }

                // Create Candidate document
                const candidateData = {
                    email: candidateEmail,
                    owner: interview.owner,
                    interview: interview._id,
                    name: entry.name || "",
                    resumeUrl: entry.resumeUrl || "none",
                    resumeSummary: "",
                    isResumeScanned: false,
                    isResumeSorted: false,
                    matchLevel: "",
                    matchScore: null,
                    dynamicData: {
                        workdayId: entry.workdayId,
                        phone: entry.phone,
                        position: entry.jobApplication?.position,
                        appliedDate: entry.jobApplication?.appliedDate,
                        applicationStatus: entry.jobApplication?.status,
                        source: "WORKDAY",
                        ...entry.dynamicData
                    }
                };

                await Candidate.create(candidateData);
                savedCount++;

                // Emit progress for each candidate (20-30% range)
                await emitWorkdayProgress({
                    interviewId,
                    ownerId: interview.owner,
                    step: "SEPARATE_CANDIDATES",
                    subStep: "progress",
                    current: i + 1,
                    total: totalEntries
                });

                // Emit log every 10 candidates to avoid spamming
                if (savedCount % 10 === 0 || savedCount === 1) {
                    await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                        interview: interviewId,
                        level: "INFO",
                        step: `Processed ${savedCount} of ${totalEntries} candidates...`
                    });
                }

            } catch (entryError) {
                console.error(`[Workday Separate] Error processing entry ${i + 1}:`, entryError.message);
                skippedCount++;
                // Continue with next entry
            }
        }

        // 4️⃣ Update WorkdayData
        workdayData.totalCandidatesSaved = savedCount;
        workdayData.status = "completed";
        workdayData.logs.push({ 
            message: `Separated ${savedCount} candidates (${skippedCount} skipped)`, 
            level: "success" 
        });
        await workdayData.save();

        // 5️⃣ Update Interview
        interview.status = "workday_candidates_separated";
        interview.totalCandidates = savedCount;
        interview.resumeCollected = savedCount;
        interview.logs.push({
            message: `Workday candidates separated: ${savedCount} saved, ${skippedCount} skipped`,
            level: "success"
        });
        await interview.save();

        // Emit progress: complete (30%)
        await emitWorkdayProgress({
            interviewId,
            ownerId: interview.owner,
            step: "SEPARATE_CANDIDATES",
            subStep: "complete"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "SUCCESS",
            step: `Candidate separation complete: ${savedCount} candidates saved`
        });

        console.log(`[Workday Separate] Completed for interview: ${interviewId}`);
        console.log(`[Workday Separate] Saved: ${savedCount}, Skipped: ${skippedCount}`);

    } catch (error) {
        console.error("[Workday Separate] Error:", error);

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
                message: `Workday candidate separation failed: ${error.message}`,
                level: "error"
            });
            await interview.save();

            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "ERROR",
                step: `Candidate separation failed: ${error.message}`
            });
        }

        throw error;
    }
};
