/**
 * LOCALFILE STEP 4: Sort Resumes by Job Description Match
 * 
 * This worker evaluates each candidate's resume against the job description
 * using AI and assigns match scores for LocalFile integration.
 * 
 * What it does:
 * 1. Fetches all candidates for the interview
 * 2. For each candidate, uses AI to evaluate resume vs job description
 * 3. Assigns match level and score
 * 4. Updates the sorted list on the interview
 * 5. Emits progress to the frontend
 */

import { Interview } from "../../models/Interview.model.js";
import { Candidate } from "../../models/Candidate.model.js";
import { LocalFileData } from "../../models/LocalFileData.model.js";
import { emitLocalFileProgress } from "../../utils/localfileProgressTracker.js";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";
import { resume_sorter_agent } from "../workers/sort_resume_as_job_description.controller.js";

// Rate limiter for Gemini API calls
class RateLimiter {
    constructor({ tokens = 150, windowMs = 60000 }) {
        this.capacity = tokens;
        this.windowMs = windowMs;
        this.tokens = tokens;
        this.lastRefill = Date.now();
        this.ratePerMs = tokens / windowMs;
    }

    _refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        if (elapsed <= 0) return;
        const add = elapsed * this.ratePerMs;
        this.tokens = Math.min(this.capacity, this.tokens + add);
        this.lastRefill = now;
    }

    async removeToken() {
        while (true) {
            this._refill();
            if (this.tokens >= 1) {
                this.tokens -= 1;
                return;
            }
            const needed = 1 - this.tokens;
            const waitMs = Math.ceil(needed / this.ratePerMs);
            await new Promise((r) => setTimeout(r, waitMs));
        }
    }
}

// Simple concurrency semaphore
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
                    setImmediate(next);
                }
            }
        };
        if (active < limit) task();
        else queue.push(task);
    });
    return { run };
};

/**
 * Main worker function to sort LocalFile candidates by job match
 * 
 * @param {string} interviewId - MongoDB ObjectId of the interview
 */
export const localfile_sortResumes = async (interviewId) => {
    let interview;
    let localFileData;

    try {
        console.log(`[LocalFile Sort] Starting for interview: ${interviewId}`);

        // 1️⃣ Fetch interview
        interview = await Interview.findById(interviewId);
        if (!interview) {
            throw new Error("Interview not found");
        }

        const jobDescription = interview.jobDescription;
        const jobPosition = interview.jobPosition;
        const jobminimumqualifications = interview.minimumQualification;
        const jobminimumskillsrequired = interview.minimumSkills;

        if (!jobDescription) {
            throw new Error("Interview missing job description");
        }

        // Emit progress: start (65%)
        await emitLocalFileProgress({
            interviewId,
            ownerId: interview.owner,
            step: "SORTING",
            subStep: "start"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: "Starting resume sorting and matching..."
        });

        // 2️⃣ Fetch LocalFileData for logging
        localFileData = await LocalFileData.findOne({ interview: interviewId });

        // 3️⃣ Fetch all candidates that need sorting
        const candidates = await Candidate.find({ 
            interview: interviewId,
            isResumeSorted: false
        });

        if (!candidates || candidates.length === 0) {
            console.log(`[LocalFile Sort] No unsorted candidates found for interview: ${interviewId}`);
            
            // Check if there are any candidates at all
            const allCandidates = await Candidate.find({ interview: interviewId });
            if (allCandidates.length === 0) {
                throw new Error("No candidates found for this interview");
            }

            // All candidates already sorted - build sorted list from existing data
            const sortedList = allCandidates
                .filter(c => c.matchScore !== null)
                .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
                .map(c => ({
                    candidateId: c._id,
                    matchLevel: c.matchLevel,
                    matchScore: c.matchScore
                }));

            interview.sortedList = sortedList;
            await interview.save();

            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "INFO",
                step: "All candidates already sorted"
            });

            await emitLocalFileProgress({
                interviewId,
                ownerId: interview.owner,
                step: "SORTING",
                subStep: "complete"
            });

            return;
        }

        console.log(`[LocalFile Sort] Processing ${candidates.length} candidates for matching...`);

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: `Processing ${candidates.length} candidates for matching...`
        });

        // 4️⃣ Setup rate limiting and concurrency control
        const RATE_LIMIT_PER_MIN = Number(process.env.GEMINI_RATE_LIMIT_PER_MIN || 15);
        const WINDOW_MS = 60000;
        const concurrency = Number(process.env.GEMINI_CONCURRENCY || 2);

        const limiter = new RateLimiter({ tokens: RATE_LIMIT_PER_MIN, windowMs: WINDOW_MS });
        const sem = createSemaphore(concurrency);

        // 5️⃣ Process candidates
        const totalCandidates = candidates.length;
        let processedCount = 0;
        let successCount = 0;
        let failedCount = 0;

        const sortedResults = [];

        const tasks = candidates.map((candidate, idx) => sem.run(async () => {
            // Skip if no resume text
            if (!candidate.resumeSummary || candidate.resumeSummary.length < 50) {
                console.log(`[LocalFile Sort] Skipping ${candidate.email}: no resume text`);
                candidate.isResumeSorted = true;
                candidate.matchLevel = "Unqualified";
                candidate.matchScore = 0;
                candidate.aiReviewComment = "No resume text available for evaluation";
                await candidate.save();
                failedCount++;
                processedCount++;
                return { skipped: true };
            }

            // Wait for rate limiter
            await limiter.removeToken();

            const progressLabel = `🔹 [${idx + 1}/${totalCandidates}] Sorting: ${candidate.email || candidate.name}`;
            console.log(progressLabel);

            try {
                // Use the shared resume_sorter_agent
                const sortResult = await resume_sorter_agent({
                    jobPosition,
                    jobDescription,
                    resumeSummary: candidate.resumeSummary,
                    dynamicData: candidate.dynamicData || {},
                    jobminimumqualifications,
                    jobminimumskillsrequired
                });

                // Update candidate with results
                candidate.matchLevel = sortResult.matchLevel || "Unqualified";
                candidate.matchScore = sortResult.matchScore ?? 0;
                candidate.aiReviewComment = sortResult.reviewComment || "";
                candidate.aiQuestions = sortResult.questions || [];
                candidate.aiImportantQuestions = sortResult.importantQuestions || [];
                candidate.isResumeSorted = true;
                await candidate.save();

                sortedResults.push({
                    candidateId: candidate._id,
                    matchLevel: candidate.matchLevel,
                    matchScore: candidate.matchScore
                });

                successCount++;

                // Emit progress
                processedCount++;
                await emitLocalFileProgress({
                    interviewId,
                    ownerId: interview.owner,
                    step: "SORTING",
                    subStep: "progress",
                    current: processedCount,
                    total: totalCandidates
                });

                // Emit log every 5 candidates
                if (processedCount % 5 === 0 || processedCount === 1) {
                    await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                        interview: interviewId,
                        level: "INFO",
                        step: `Sorted ${processedCount}/${totalCandidates} candidates...`
                    });
                }

                return sortResult;

            } catch (candidateError) {
                console.error(`[LocalFile Sort] Error sorting ${candidate.email}:`, candidateError.message);
                candidate.isResumeSorted = true;
                candidate.matchLevel = "Unqualified";
                candidate.matchScore = 0;
                candidate.aiReviewComment = `Error during evaluation: ${candidateError.message}`;
                await candidate.save();
                failedCount++;
                processedCount++;
                return { error: candidateError.message };
            }
        }));

        // Wait for all tasks to complete
        await Promise.all(tasks);

        // 6️⃣ Build final sorted list (include all candidates)
        const allCandidates = await Candidate.find({ interview: interviewId });
        const finalSortedList = allCandidates
            .filter(c => c.matchScore !== null)
            .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
            .map(c => ({
                candidateId: c._id,
                matchLevel: c.matchLevel,
                matchScore: c.matchScore
            }));

        // 7️⃣ Update interview
        interview.sortedList = finalSortedList;
        interview.status = "localfile_sorting_complete";
        interview.reviewedCandidates = successCount;
        interview.logs.push({
            message: `Sorting complete: ${successCount} success, ${failedCount} failed`,
            level: "success"
        });
        await interview.save();

        // Update LocalFileData
        if (localFileData) {
            localFileData.status = "completed";
            localFileData.logs.push({
                message: `Resume sorting complete: ${successCount} sorted, ${failedCount} failed`,
                level: "success"
            });
            await localFileData.save();
        }

        // Emit progress: complete (100%)
        await emitLocalFileProgress({
            interviewId,
            ownerId: interview.owner,
            step: "SORTING",
            subStep: "complete"
        });

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "SUCCESS",
            step: `Sorting complete: ${successCount} candidates sorted successfully`
        });

        console.log(`[LocalFile Sort] Completed for interview: ${interviewId}`);
        console.log(`[LocalFile Sort] Success: ${successCount}, Failed: ${failedCount}`);

    } catch (error) {
        console.error("[LocalFile Sort] Error:", error);

        // Update interview status
        if (interview) {
            interview.currentStatus = "FAILED";
            interview.logs.push({
                message: `LocalFile sorting failed: ${error.message}`,
                level: "error"
            });
            await interview.save();

            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "ERROR",
                step: `Sorting failed: ${error.message}`
            });
        }

        throw error;
    }
};
