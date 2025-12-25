/**
 * Workday Interview Pipeline Queue
 * 
 * This queue handles the Workday integration pipeline for interview processing.
 * Uses BullMQ for job management with Redis as the backend.
 * 
 * Pipeline Flow:
 * 1. FETCH_WORKDAY_DATA - Fetch candidate data from Workday RaaS API
 * 2. SEPARATE_CANDIDATES - Parse and save candidates from Workday data
 * 3. OCR - Extract text from resume URLs
 * 4. SORTING - Sort candidates based on job description match
 * 
 * Progress breakdown (total 100%):
 * ─────────────────────────────────────────────────────────────
 * STEP 1: FETCH_WORKDAY_DATA   →  15%  (fetching from Workday RaaS)
 * STEP 2: SEPARATE_CANDIDATES  →  15%  (parsing and saving candidates)
 * STEP 3: OCR                  →  35%  (distributed per candidate resume extracted)
 * STEP 4: SORTING              →  35%  (distributed per candidate sorted)
 * ─────────────────────────────────────────────────────────────
 */

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { Interview } from "../models/Interview.model.js";
import { workday_fetchData } from "../controllers/workday_workers/workday_fetchData.controller.js";
import { workday_separateCandidates } from "../controllers/workday_workers/workday_separateCandidates.controller.js";
import { workday_extractResumeText } from "../controllers/workday_workers/workday_extractResumeText.controller.js";
import { workday_sortResumes } from "../controllers/workday_workers/workday_sortResumes.controller.js";

// Redis connection (same as main pipeline)
const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

const connection = new IORedis(redisPort, redisHost, {
    maxRetriesPerRequest: null, // BullMQ requirement
});

// Workday-specific job types
export const WORKDAY_JOB_TYPES = {
    FETCH_WORKDAY_DATA: "WORKDAY_FETCH_DATA",
    SEPARATE_CANDIDATES: "WORKDAY_SEPARATE_CANDIDATES",
    OCR: "WORKDAY_OCR",
    SORTING: "WORKDAY_SORTING",
};

// Map job types to Interview currentStatus values
const WORKDAY_JOB_TO_STATUS = {
    [WORKDAY_JOB_TYPES.FETCH_WORKDAY_DATA]: "WD_FETCHING",
    [WORKDAY_JOB_TYPES.SEPARATE_CANDIDATES]: "WD_SEPARATING",
    [WORKDAY_JOB_TYPES.OCR]: "WD_OCR",
    [WORKDAY_JOB_TYPES.SORTING]: "WD_SORTING",
};

// Map job types to next job type (null means final step)
const WORKDAY_JOB_FLOW = {
    [WORKDAY_JOB_TYPES.FETCH_WORKDAY_DATA]: WORKDAY_JOB_TYPES.SEPARATE_CANDIDATES,
    [WORKDAY_JOB_TYPES.SEPARATE_CANDIDATES]: WORKDAY_JOB_TYPES.OCR,
    [WORKDAY_JOB_TYPES.OCR]: WORKDAY_JOB_TYPES.SORTING,
    [WORKDAY_JOB_TYPES.SORTING]: null,
};

// Create the Workday queue
export const workdayPipelineQueue = new Queue("workdayPipeline", {
    connection,
    defaultJobOptions: {
        attempts: 1, // We handle retries via __RETRY_ENGINE
        removeOnComplete: 100,
        removeOnFail: 200,
    },
});

/**
 * Process a single Workday pipeline job
 * @param {import('bullmq').Job} job
 */
async function processWorkdayJob(job) {
    const { interviewId, integrationData } = job.data;
    const jobType = job.name;

    console.log(`[WORKDAY PIPELINE] Processing ${jobType} for interview=${interviewId}`);

    // Update interview status to current step
    const statusValue = WORKDAY_JOB_TO_STATUS[jobType];
    if (statusValue) {
        await Interview.findByIdAndUpdate(interviewId, {
            currentStatus: statusValue,
            lastProcessedStep: statusValue,
        });
    }

    try {
        // Execute the appropriate worker function
        switch (jobType) {
            case WORKDAY_JOB_TYPES.FETCH_WORKDAY_DATA:
                await workday_fetchData(interviewId, integrationData);
                break;

            case WORKDAY_JOB_TYPES.SEPARATE_CANDIDATES:
                await workday_separateCandidates(interviewId);
                break;

            case WORKDAY_JOB_TYPES.OCR:
                await workday_extractResumeText(interviewId);
                break;

            case WORKDAY_JOB_TYPES.SORTING:
                await workday_sortResumes(interviewId);
                break;

            default:
                throw new Error(`Unknown Workday job type: ${jobType}`);
        }

        // Check if the interview was marked as FAILED by the worker
        const updatedInterview = await Interview.findById(interviewId);
        if (updatedInterview?.currentStatus === "FAILED") {
            console.log(`[WORKDAY PIPELINE] Worker marked interview=${interviewId} as FAILED, not enqueuing next job`);
            return { success: false, interviewId, step: jobType };
        }

        // Enqueue next job if there is one
        const nextJobType = WORKDAY_JOB_FLOW[jobType];
        if (nextJobType) {
            console.log(`[WORKDAY PIPELINE] Enqueuing ${nextJobType} for interview=${interviewId}`);
            await workdayPipelineQueue.add(nextJobType, { interviewId, integrationData }, {
                delay: 1000, // 1 second delay between steps
            });
        } else {
            // Final step completed
            console.log(`[WORKDAY PIPELINE] Pipeline completed for interview=${interviewId}`);
            await Interview.findByIdAndUpdate(interviewId, {
                currentStatus: "COMPLETED",
            });
        }

        return { success: true, interviewId, step: jobType };

    } catch (error) {
        console.error(`[WORKDAY PIPELINE] Error in ${jobType} for interview=${interviewId}:`, error?.message || error);

        // Mark interview as failed
        await Interview.findByIdAndUpdate(interviewId, {
            currentStatus: "FAILED",
            lastProcessedStep: statusValue,
        });

        // Re-throw to let BullMQ mark the job as failed
        throw error;
    }
}

// Create the Workday worker
export const workdayPipelineWorker = new Worker(
    "workdayPipeline",
    processWorkdayJob,
    {
        connection,
        concurrency: 5, // Process up to 5 jobs concurrently
    }
);

// Worker event handlers
workdayPipelineWorker.on("completed", (job, result) => {
    console.log(`[WORKDAY PIPELINE] Job ${job.name} completed for interview=${result?.interviewId}`);
});

workdayPipelineWorker.on("failed", (job, error) => {
    console.error(`[WORKDAY PIPELINE] Job ${job?.name} failed for interview=${job?.data?.interviewId}:`, error?.message);
});

workdayPipelineWorker.on("error", (error) => {
    console.error("[WORKDAY PIPELINE] Worker error:", error?.message || error);
});

/**
 * Helper to start the Workday pipeline
 * @param {string} interviewId - MongoDB ObjectId of the interview
 * @param {string} integrationData - Workday RaaS URL or integration-specific data
 */
export async function startWorkdayPipeline(interviewId, integrationData) {
    console.log(`[WORKDAY PIPELINE] Starting pipeline for interview=${interviewId}`);
    console.log(`[WORKDAY PIPELINE] Integration data: ${integrationData}`);
    return workdayPipelineQueue.add(WORKDAY_JOB_TYPES.FETCH_WORKDAY_DATA, { 
        interviewId, 
        integrationData 
    });
}

/**
 * Helper to retry a specific Workday step (used by retry engine)
 * @param {string} interviewId - MongoDB ObjectId of the interview
 * @param {string} step - The status/step to retry
 * @param {string} integrationData - Workday integration data
 */
export async function retryWorkdayStep(interviewId, step, integrationData) {
    // Map status back to job type
    const STATUS_TO_JOB = {
        WD_FETCHING: WORKDAY_JOB_TYPES.FETCH_WORKDAY_DATA,
        WD_SEPARATING: WORKDAY_JOB_TYPES.SEPARATE_CANDIDATES,
        WD_OCR: WORKDAY_JOB_TYPES.OCR,
        WD_SORTING: WORKDAY_JOB_TYPES.SORTING,
    };

    const jobType = STATUS_TO_JOB[step];
    if (!jobType) {
        console.warn(`[WORKDAY PIPELINE] Unknown step for retry: ${step}`);
        return null;
    }

    console.log(`[WORKDAY PIPELINE] Retrying ${jobType} for interview=${interviewId}`);
    return workdayPipelineQueue.add(jobType, { interviewId, integrationData }, {
        delay: 1000,
    });
}

export { connection as workdayRedisConnection };
