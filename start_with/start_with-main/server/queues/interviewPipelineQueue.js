import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { Interview } from "../models/Interview.model.js";
import { sheet_data_structure_worker } from "../controllers/workers/sheet_data_structure.controller.js";
import { extractSheetData } from "../controllers/workers/sheet_data_extract_json.controller.js";
import { separate_resume_urls_and_save } from "../controllers/workers/separate_resume_urls_and_save.controller.js";
import { extract_text_from_resumeurl } from "../controllers/workers/extract_text_from_resumeurl.controller.js";
import { sort_resume_as_job_description } from "../controllers/workers/sort_resume_as_job_description.controller.js";

// Redis connection (adjust host/port as needed)
const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

const connection = new IORedis(redisPort, redisHost, {
    maxRetriesPerRequest: null, // BullMQ requirement
});

// Job types enum for clarity
export const JOB_TYPES = {
    STRUCTURE_SHEET: "STRUCTURE_SHEET",
    EXTRACT_SHEET: "EXTRACT_SHEET",
    RESUME_SEPARATION: "RESUME_SEPARATION",
    OCR: "OCR",
    SORTING: "SORTING",
};

// Map job types to Interview currentStatus values
const JOB_TO_STATUS = {
    [JOB_TYPES.STRUCTURE_SHEET]: "STRUCTURING",
    [JOB_TYPES.EXTRACT_SHEET]: "EXTRACTING_SHEET",
    [JOB_TYPES.RESUME_SEPARATION]: "RESUME_SEPARATION",
    [JOB_TYPES.OCR]: "OCR",
    [JOB_TYPES.SORTING]: "SORTING",
};

// Map job types to next job type (null means final step)
const JOB_FLOW = {
    [JOB_TYPES.STRUCTURE_SHEET]: JOB_TYPES.EXTRACT_SHEET,
    [JOB_TYPES.EXTRACT_SHEET]: JOB_TYPES.RESUME_SEPARATION,
    [JOB_TYPES.RESUME_SEPARATION]: JOB_TYPES.OCR,
    [JOB_TYPES.OCR]: JOB_TYPES.SORTING,
    [JOB_TYPES.SORTING]: null,
};

// Create the queue
export const interviewPipelineQueue = new Queue("interviewPipeline", {
    connection,
    defaultJobOptions: {
        attempts: 1, // We handle retries via __RETRY_ENGINE
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200, // Keep last 200 failed jobs for debugging
    },
});

/**
 * Process a single pipeline job
 * @param {import('bullmq').Job} job
 */
async function processJob(job) {
    const { interviewId } = job.data;
    const jobType = job.name;

    console.log(`[PIPELINE] Processing ${jobType} for interview=${interviewId}`);

    // Update interview status to current step
    const statusValue = JOB_TO_STATUS[jobType];
    if (statusValue) {
        await Interview.findByIdAndUpdate(interviewId, {
            currentStatus: statusValue,
            lastProcessedStep: statusValue,
        });
    }

    try {
        // Execute the appropriate worker function
        switch (jobType) {
            case JOB_TYPES.STRUCTURE_SHEET:
                await sheet_data_structure_worker(interviewId);
                break;

            case JOB_TYPES.EXTRACT_SHEET:
                await extractSheetData(interviewId);
                break;

            case JOB_TYPES.RESUME_SEPARATION:
                await separate_resume_urls_and_save(interviewId);
                break;

            case JOB_TYPES.OCR:
                await extract_text_from_resumeurl(interviewId);
                break;

            case JOB_TYPES.SORTING:
                await sort_resume_as_job_description(interviewId);
                break;

            default:
                throw new Error(`Unknown job type: ${jobType}`);
        }

        // Check if the interview was marked as FAILED by the worker
        const updatedInterview = await Interview.findById(interviewId);
        if (updatedInterview?.currentStatus === "FAILED") {
            console.log(`[PIPELINE] Worker marked interview=${interviewId} as FAILED, not enqueuing next job`);
            return { success: false, interviewId, step: jobType };
        }

        // Enqueue next job if there is one
        const nextJobType = JOB_FLOW[jobType];
        if (nextJobType) {
            console.log(`[PIPELINE] Enqueuing ${nextJobType} for interview=${interviewId}`);
            await interviewPipelineQueue.add(nextJobType, { interviewId }, {
                delay: 1000, // 1 second delay between steps (like original setTimeout)
            });
        } else {
            // Final step completed
            console.log(`[PIPELINE] Pipeline completed for interview=${interviewId}`);
            await Interview.findByIdAndUpdate(interviewId, {
                currentStatus: "COMPLETED",
            });
        }

        return { success: true, interviewId, step: jobType };

    } catch (error) {
        console.error(`[PIPELINE] Error in ${jobType} for interview=${interviewId}:`, error?.message || error);

        // Mark interview as failed (workers may have already done this)
        await Interview.findByIdAndUpdate(interviewId, {
            currentStatus: "FAILED",
            lastProcessedStep: statusValue,
        });

        // Re-throw to let BullMQ mark the job as failed
        throw error;
    }
}

// Create the worker
export const pipelineWorker = new Worker(
    "interviewPipeline",
    processJob,
    {
        connection,
        concurrency: 5, // Process up to 5 jobs concurrently
    }
);

// Worker event handlers
pipelineWorker.on("completed", (job, result) => {
    console.log(`[PIPELINE] Job ${job.name} completed for interview=${result?.interviewId}`);
});

pipelineWorker.on("failed", (job, error) => {
    console.error(`[PIPELINE] Job ${job?.name} failed for interview=${job?.data?.interviewId}:`, error?.message);
});

pipelineWorker.on("error", (error) => {
    console.error("[PIPELINE] Worker error:", error?.message || error);
});

/**
 * Helper to enqueue the first step of the pipeline
 * @param {string} interviewId - MongoDB ObjectId of the interview
 */
export async function startPipeline(interviewId) {
    console.log(`[PIPELINE] Starting pipeline for interview=${interviewId}`);
    return interviewPipelineQueue.add(JOB_TYPES.STRUCTURE_SHEET, { interviewId });
}

/**
 * Helper to retry a specific step (used by retry engine)
 * @param {string} interviewId - MongoDB ObjectId of the interview
 * @param {string} step - The status/step to retry (e.g., "STRUCTURING", "OCR")
 */
export async function retryStep(interviewId, step) {
    // Map status back to job type
    const STATUS_TO_JOB = {
        STRUCTURING: JOB_TYPES.STRUCTURE_SHEET,
        EXTRACTING_SHEET: JOB_TYPES.EXTRACT_SHEET,
        RESUME_SEPARATION: JOB_TYPES.RESUME_SEPARATION,
        OCR: JOB_TYPES.OCR,
        SORTING: JOB_TYPES.SORTING,
    };

    const jobType = STATUS_TO_JOB[step];
    if (!jobType) {
        console.warn(`[PIPELINE] Unknown step for retry: ${step}`);
        return null;
    }

    console.log(`[PIPELINE] Retrying ${jobType} for interview=${interviewId}`);
    return interviewPipelineQueue.add(jobType, { interviewId }, {
        delay: 1000,
    });
}

export { connection as redisConnection };
