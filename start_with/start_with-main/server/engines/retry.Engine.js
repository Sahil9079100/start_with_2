import { Interview } from "../models/Interview.model.js";

/**
 * Centralized retry engine using BullMQ.
 * - Respects interview.retryCount / interview.maxRetries
 * - Uses per-step counters stored in interview.stepAttempts (object) to avoid cross-step pollution
 * - Increments counters (persisted) before attempting a retry
 * - Enqueues retry job via BullMQ instead of direct function calls
 */
export const __RETRY_ENGINE = async (interviewId) => {
    const interview = await Interview.findById(interviewId);
    if (!interview) return;

    // Only act when a worker marked this interview as FAILED
    if (interview.currentStatus !== "FAILED") return;

    const step = interview.lastProcessedStep;
    if (!step) return;

    // Use per-step attempt counter when available, otherwise fallback to global retryCount
    const stepAttempts = (interview.stepAttempts && interview.stepAttempts[step]) || 0;
    const globalAttempts = interview.retryCount || 0;
    const attempts = Math.max(stepAttempts, globalAttempts);
    const maxRetries = typeof interview.maxRetries === 'number' ? interview.maxRetries : 3;

    if (attempts >= maxRetries) {
        console.warn(`[RETRY ENGINE] interview=${interviewId} reached max retries (${attempts}/${maxRetries}) for step=${step}. Not retrying.`);
        return;
    }

    // Persist increment: increment global retryCount and per-step counter atomically
    const incObj = { retryCount: 1 };
    // Mongo field key for stepAttempts.<STEP>
    const stepKey = `stepAttempts.${step}`;
    incObj[stepKey] = 1;

    let updatedInterview;
    try {
        updatedInterview = await Interview.findByIdAndUpdate(
            interviewId,
            { $inc: incObj, $set: { currentStatus: step } },
            { new: true }
        );
    } catch (err) {
        console.error(`[RETRY ENGINE] failed to increment retry counters for interview=${interviewId}:`, err?.message || err);
        return;
    }

    console.log(`[RETRY ENGINE] Retrying interview=${interviewId} step=${step} (attempt ${(updatedInterview.stepAttempts && updatedInterview.stepAttempts[step]) || updatedInterview.retryCount}/${maxRetries})`);

    try {
        // Dynamic import to avoid circular dependency with queue
        const { retryStep } = await import("../queues/interviewPipelineQueue.js");
        await retryStep(interviewId, step);
    } catch (err) {
        console.error(`[RETRY ENGINE] failed to enqueue retry job for interview=${interviewId} step=${step}:`, err?.message || err);
        // Reset status to FAILED since we couldn't enqueue
        await Interview.findByIdAndUpdate(interviewId, { currentStatus: "FAILED" });
    }
};
