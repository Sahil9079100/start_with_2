/**
 * LOCALFILE STEP 2: Separate Candidates and Save
 * 
 * This worker processes the parsed file data and creates Candidate documents.
 * 
 * What it does:
 * 1. Fetches the LocalFileData document with normalized entries
 * 2. Creates Candidate documents for each entry
 * 3. Updates interview with candidate count
 * 4. Emits progress to the frontend
 */

import { Interview } from "../../models/Interview.model.js";
import { LocalFileData } from "../../models/LocalFileData.model.js";
import { Candidate } from "../../models/Candidate.model.js";
import { emitLocalFileProgress } from "../../utils/localfileProgressTracker.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";

/**
 * Main worker function to separate and save candidates from file data
 * 
 * @param {string} interviewId - MongoDB ObjectId of the interview
 */
export const localfile_separateCandidates = async (interviewId) => {
    let interview;
    let localFileData;

    try {
        console.log(`[LocalFile Separate] Starting for interview: ${interviewId}`);

        // 1️⃣ Fetch interview
        interview = await Interview.findById(interviewId);
        if (!interview) {
            throw new Error("Interview not found");
        }

        // Emit progress: start (15%)
        await emitLocalFileProgress({
            interviewId,
            ownerId: interview.owner,
            step: "SEPARATE_CANDIDATES",
            subStep: "start"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "Starting candidate separation from file data..."
        });

        // 2️⃣ Fetch LocalFileData
        localFileData = await LocalFileData.findOne({ interview: interviewId });
        if (!localFileData) {
            throw new Error("Local file data not found for this interview");
        }

        if (!localFileData.entries || localFileData.entries.length === 0) {
            throw new Error("No entries found in local file data");
        }

        localFileData.logs.push({ 
            message: `Starting candidate separation for ${localFileData.entries.length} entries`, 
            level: "info" 
        });
        await localFileData.save();

        // Emit progress: analyzing (18%)
        await emitLocalFileProgress({
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
        const totalEntries = localFileData.entries.length;
        let savedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < totalEntries; i++) {
            const entry = localFileData.entries[i];

            try {
                // Skip entries without required data
                if (!entry.email && !entry.name && !entry.resumeUrl) {
                    console.log(`[LocalFile Separate] Skipping entry ${i + 1}: missing required fields`);
                    skippedCount++;
                    continue;
                }

                // Generate email if not present
                const candidateEmail = entry.email || 
                    `localfile_${Date.now()}_${entry.rowIndex || i}@localfile.local`;

                // Check if candidate already exists for this interview
                const existingCandidate = await Candidate.findOne({
                    interview: interviewId,
                    email: candidateEmail
                });

                if (existingCandidate) {
                    console.log(`[LocalFile Separate] Candidate already exists: ${candidateEmail}`);
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
                        rowIndex: entry.rowIndex,
                        phone: entry.phone,
                        source: "LOCALFILE",
                        originalFileName: localFileData.originalFileName,
                        ...entry.dynamicData
                    }
                };

                await Candidate.create(candidateData);
                savedCount++;

                // Emit progress for each candidate (20-30% range)
                await emitLocalFileProgress({
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
                console.error(`[LocalFile Separate] Error processing entry ${i + 1}:`, entryError.message);
                skippedCount++;
                // Continue with next entry
            }
        }

        // 4️⃣ Update LocalFileData
        localFileData.totalCandidatesSaved = savedCount;
        localFileData.status = "completed";
        localFileData.logs.push({ 
            message: `Separated ${savedCount} candidates (${skippedCount} skipped)`, 
            level: "success" 
        });
        await localFileData.save();

        // 5️⃣ Update Interview
        interview.status = "localfile_candidates_separated";
        interview.totalCandidates = savedCount;
        interview.resumeCollected = savedCount;
        interview.logs.push({
            message: `Local file candidates separated: ${savedCount} saved, ${skippedCount} skipped`,
            level: "success"
        });
        await interview.save();

        // Emit progress: complete (30%)
        await emitLocalFileProgress({
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

        console.log(`[LocalFile Separate] Completed for interview: ${interviewId}`);
        console.log(`[LocalFile Separate] Saved: ${savedCount}, Skipped: ${skippedCount}`);

    } catch (error) {
        console.error("[LocalFile Separate] Error:", error);

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
                message: `Local file candidate separation failed: ${error.message}`,
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
