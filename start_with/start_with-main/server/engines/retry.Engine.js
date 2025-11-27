import { Interview } from "../models/Interview.model.js";
import { sheet_data_structure_worker } from "../controllers/workers/sheet_data_structure.controller.js";
import { extractSheetData } from "../controllers/workers/sheet_data_extract_json.controller.js";
import { separate_resume_urls_and_save } from "../controllers/workers/separate_resume_urls_and_save.controller.js";
import { extract_text_from_resumeurl } from "../controllers/workers/extract_text_from_resumeurl.controller.js";
import { sort_resume_as_job_description } from "../controllers/workers/sort_resume_as_job_description.controller.js";

/**
 * Centralized retry engine.
 * - Respects interview.retryCount / interview.maxRetries
 * - Uses per-step counters stored in interview.stepAttempts (object) to avoid cross-step pollution
 * - Increments counters (persisted) before attempting a retry
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
        switch (step) {
            case "STRUCTURING":
                return await sheet_data_structure_worker(interviewId);

            case "EXTRACTING_SHEET":
                return await extractSheetData(interviewId);

            case "RESUME_SEPARATION":
                return await separate_resume_urls_and_save(interviewId);

            case "OCR":
                return await extract_text_from_resumeurl(interviewId);

            case "SORTING":
                return await sort_resume_as_job_description(interviewId);

            default:
                console.warn(`[RETRY ENGINE] Unknown step=${step} for interview=${interviewId}`);
                return;
        }
    } catch (err) {
        console.error(`[RETRY ENGINE] retry attempt for interview=${interviewId} step=${step} failed:`, err?.message || err);
        // leave interview in FAILED state; worker catch blocks will handle logging and re-invoking the engine if appropriate
        return;
    }
};
