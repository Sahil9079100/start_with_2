/**
 * LocalFile Interview Pipeline Queue
 * 
 * This queue handles the LocalFile integration pipeline for interview processing.
 * Uses BullMQ for job management with Redis as the backend.
 * 
 * Pipeline Flow:
 * 1. PARSE_FILE - Parse CSV/XLSX file and extract candidate data
 * 2. SEPARATE_CANDIDATES - Parse and save candidates from file data
 * 3. OCR - Extract text from resume URLs
 * 4. SORTING - Sort candidates based on job description match
 * 
 * Progress breakdown (total 100%):
 * ─────────────────────────────────────────────────────────────
 * STEP 1: PARSE_FILE           →  15%  (parsing CSV/XLSX file)
 * STEP 2: SEPARATE_CANDIDATES  →  15%  (parsing and saving candidates)
 * STEP 3: OCR                  →  35%  (distributed per candidate resume extracted)
 * STEP 4: SORTING              →  35%  (distributed per candidate sorted)
 * ─────────────────────────────────────────────────────────────
 */

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { Interview } from "../models/Interview.model.js";
import { localfile_parseFile } from "../controllers/localfile_workers/localfile_parseFile.controller.js";
import { localfile_separateCandidates } from "../controllers/localfile_workers/localfile_separateCandidates.controller.js";
import { localfile_extractResumeText } from "../controllers/localfile_workers/localfile_extractResumeText.controller.js";
import { localfile_sortResumes } from "../controllers/localfile_workers/localfile_sortResumes.controller.js";

// Redis connection (same as main pipeline)
const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

const connection = new IORedis(redisPort, redisHost, {
    maxRetriesPerRequest: null, // BullMQ requirement
});

// LocalFile-specific job types
export const LOCALFILE_JOB_TYPES = {
    PARSE_FILE: "LOCALFILE_PARSE_FILE",
    SEPARATE_CANDIDATES: "LOCALFILE_SEPARATE_CANDIDATES",
    OCR: "LOCALFILE_OCR",
    SORTING: "LOCALFILE_SORTING",
};

// Map job types to Interview currentStatus values
const LOCALFILE_JOB_TO_STATUS = {
    [LOCALFILE_JOB_TYPES.PARSE_FILE]: "LF_PARSING",
    [LOCALFILE_JOB_TYPES.SEPARATE_CANDIDATES]: "LF_SEPARATING",
    [LOCALFILE_JOB_TYPES.OCR]: "LF_OCR",
    [LOCALFILE_JOB_TYPES.SORTING]: "LF_SORTING",
};

// Map job types to next job type (null means final step)
const LOCALFILE_JOB_FLOW = {
    [LOCALFILE_JOB_TYPES.PARSE_FILE]: LOCALFILE_JOB_TYPES.SEPARATE_CANDIDATES,
    [LOCALFILE_JOB_TYPES.SEPARATE_CANDIDATES]: LOCALFILE_JOB_TYPES.OCR,
    [LOCALFILE_JOB_TYPES.OCR]: LOCALFILE_JOB_TYPES.SORTING,
    [LOCALFILE_JOB_TYPES.SORTING]: null,
};

// Create the LocalFile queue
export const localfilePipelineQueue = new Queue("localfilePipeline", {
    connection,
    defaultJobOptions: {
        attempts: 1, // We handle retries via __RETRY_ENGINE
        removeOnComplete: 100,
        removeOnFail: 200,
    },
});

/**
 * Process a single LocalFile pipeline job
 * @param {import('bullmq').Job} job
 */
async function processLocalFileJob(job) {
    const { interviewId, integrationData, filePath } = job.data;
    const jobType = job.name;

    console.log(`[LOCALFILE PIPELINE] Processing ${jobType} for interview=${interviewId}`);

    // Update interview status to current step
    const statusValue = LOCALFILE_JOB_TO_STATUS[jobType];
    if (statusValue) {
        await Interview.findByIdAndUpdate(interviewId, {
            currentStatus: statusValue,
            lastProcessedStep: statusValue,
        });
    }

    try {
        // Execute the appropriate worker function
        switch (jobType) {
            case LOCALFILE_JOB_TYPES.PARSE_FILE:
                await localfile_parseFile(interviewId, integrationData, filePath);
                break;

            case LOCALFILE_JOB_TYPES.SEPARATE_CANDIDATES:
                await localfile_separateCandidates(interviewId);
                break;

            case LOCALFILE_JOB_TYPES.OCR:
                await localfile_extractResumeText(interviewId);
                break;

            case LOCALFILE_JOB_TYPES.SORTING:
                await localfile_sortResumes(interviewId);
                break;

            default:
                throw new Error(`Unknown LocalFile job type: ${jobType}`);
        }

        // Check if the interview was marked as FAILED by the worker
        const updatedInterview = await Interview.findById(interviewId);
        if (updatedInterview?.currentStatus === "FAILED") {
            console.log(`[LOCALFILE PIPELINE] Worker marked interview=${interviewId} as FAILED, not enqueuing next job`);
            return { success: false, interviewId, step: jobType };
        }

        // Enqueue next job if there is one
        const nextJobType = LOCALFILE_JOB_FLOW[jobType];
        if (nextJobType) {
            console.log(`[LOCALFILE PIPELINE] Enqueuing ${nextJobType} for interview=${interviewId}`);
            await localfilePipelineQueue.add(nextJobType, { interviewId, integrationData, filePath }, {
                delay: 1000, // 1 second delay between steps
            });
        } else {
            // Final step completed
            console.log(`[LOCALFILE PIPELINE] Pipeline completed for interview=${interviewId}`);
            await Interview.findByIdAndUpdate(interviewId, {
                currentStatus: "COMPLETED",
            });
        }

        return { success: true, interviewId, step: jobType };

    } catch (error) {
        console.error(`[LOCALFILE PIPELINE] Error in ${jobType} for interview=${interviewId}:`, error?.message || error);

        // Mark interview as failed
        await Interview.findByIdAndUpdate(interviewId, {
            currentStatus: "FAILED",
            lastProcessedStep: statusValue,
        });

        // Re-throw to let BullMQ mark the job as failed
        throw error;
    }
}

// Create the LocalFile worker
export const localfilePipelineWorker = new Worker(
    "localfilePipeline",
    processLocalFileJob,
    {
        connection,
        concurrency: 5, // Process up to 5 jobs concurrently
    }
);

// Worker event handlers
localfilePipelineWorker.on("completed", (job, result) => {
    console.log(`[LOCALFILE PIPELINE] Job ${job.name} completed for interview=${result?.interviewId}`);
});

localfilePipelineWorker.on("failed", (job, error) => {
    console.error(`[LOCALFILE PIPELINE] Job ${job?.name} failed for interview=${job?.data?.interviewId}:`, error?.message);
});

localfilePipelineWorker.on("error", (error) => {
    console.error("[LOCALFILE PIPELINE] Worker error:", error?.message || error);
});

/**
 * Helper to start the LocalFile pipeline
 * @param {string} interviewId - MongoDB ObjectId of the interview
 * @param {string} integrationData - Original file name or metadata
 * @param {string} filePath - Path to the saved file on server
 */
export async function startLocalFilePipeline(interviewId, integrationData, filePath) {
    console.log(`[LOCALFILE PIPELINE] Starting pipeline for interview=${interviewId}`);
    console.log(`[LOCALFILE PIPELINE] File path: ${filePath}`);
    return localfilePipelineQueue.add(LOCALFILE_JOB_TYPES.PARSE_FILE, { 
        interviewId, 
        integrationData,
        filePath 
    });
}

/**
 * Helper to retry a specific LocalFile step (used by retry engine)
 * @param {string} interviewId - MongoDB ObjectId of the interview
 * @param {string} step - The status/step to retry
 * @param {string} integrationData - LocalFile integration data
 * @param {string} filePath - Path to the file
 */
export async function retryLocalFileStep(interviewId, step, integrationData, filePath) {
    // Map status back to job type
    const STATUS_TO_JOB = {
        LF_PARSING: LOCALFILE_JOB_TYPES.PARSE_FILE,
        LF_SEPARATING: LOCALFILE_JOB_TYPES.SEPARATE_CANDIDATES,
        LF_OCR: LOCALFILE_JOB_TYPES.OCR,
        LF_SORTING: LOCALFILE_JOB_TYPES.SORTING,
    };

    const jobType = STATUS_TO_JOB[step];
    if (!jobType) {
        console.warn(`[LOCALFILE PIPELINE] Unknown step for retry: ${step}`);
        return null;
    }

    console.log(`[LOCALFILE PIPELINE] Retrying ${jobType} for interview=${interviewId}`);
    return localfilePipelineQueue.add(jobType, { interviewId, integrationData, filePath }, {
        delay: 1000,
    });
}

export { connection as localfileRedisConnection };
