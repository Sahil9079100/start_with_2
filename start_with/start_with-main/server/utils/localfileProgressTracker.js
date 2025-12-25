/**
 * LocalFile Progress Tracker Utility
 * 
 * Calculates and emits completion percentage for the LocalFile interview pipeline.
 * 
 * Flow breakdown (total 100%):
 * ─────────────────────────────────────────────────────────────
 * STEP 1: PARSE_FILE           →  15%  (parsing CSV/XLSX file)
 * STEP 2: SEPARATE_CANDIDATES  →  15%  (parsing and saving candidates)
 * STEP 3: OCR                  →  35%  (distributed per candidate resume extracted)
 * STEP 4: SORTING              →  35%  (distributed per candidate sorted)
 * ─────────────────────────────────────────────────────────────
 */

import recruiterEmit from "../socket/emit/recruiterEmit.js";
import { Interview } from "../models/Interview.model.js";

/**
 * Calculate and emit the current LocalFile progress percentage
 * 
 * @param {Object} params
 * @param {string} params.interviewId - Interview MongoDB ID
 * @param {string} params.ownerId - Owner ID for socket emission
 * @param {string} params.step - Current step name (PARSE_FILE, SEPARATE_CANDIDATES, OCR, SORTING)
 * @param {string} params.subStep - Sub-step within the current step ('start', 'progress', 'complete')
 * @param {number} [params.current] - Current item number (for candidate-based steps)
 * @param {number} [params.total] - Total items (for candidate-based steps)
 */
export async function emitLocalFileProgress({
    interviewId,
    ownerId,
    step,
    subStep,
    current = 0,
    total = 1,
}) {
    try {
        let percentage = 0;

        switch (step) {
            case "PARSE_FILE":
                // 0-15%
                if (subStep === "start") {
                    percentage = 0;
                } else if (subStep === "reading") {
                    percentage = 3;
                } else if (subStep === "converting") {
                    // For XLSX to CSV conversion
                    percentage = 7;
                } else if (subStep === "analyzing") {
                    percentage = 10;
                } else if (subStep === "complete") {
                    percentage = 15;
                }
                break;

            case "SEPARATE_CANDIDATES":
                // 15-30%
                if (subStep === "start") {
                    percentage = 15;
                } else if (subStep === "analyzing") {
                    percentage = 18;
                } else if (subStep === "progress") {
                    // Saving candidates: 20-30% range
                    const candidateWeight = 10;
                    const candidateProgress = total > 0 ? (current / total) * candidateWeight : 0;
                    percentage = 20 + candidateProgress;
                } else if (subStep === "complete") {
                    percentage = 30;
                }
                break;

            case "OCR":
                // 30-65%: 35% distributed per candidate
                if (subStep === "start") {
                    percentage = 30;
                } else if (subStep === "progress") {
                    const ocrWeight = 35;
                    const ocrProgress = total > 0 ? (current / total) * ocrWeight : 0;
                    percentage = 30 + ocrProgress;
                } else if (subStep === "complete") {
                    percentage = 65;
                }
                break;

            case "SORTING":
                // 65-100%: 35% distributed per candidate
                if (subStep === "start") {
                    percentage = 65;
                } else if (subStep === "progress") {
                    const sortWeight = 35;
                    const sortProgress = total > 0 ? (current / total) * sortWeight : 0;
                    percentage = 65 + sortProgress;
                } else if (subStep === "complete") {
                    percentage = 100;
                }
                break;

            default:
                console.warn(`[LocalFileProgressTracker] Unknown step: ${step}`);
                return;
        }

        // Round to 1 decimal place
        percentage = Math.round(percentage * 10) / 10;

        // Clamp between 0 and 100
        percentage = Math.max(0, Math.min(100, percentage));

        console.log(`[LocalFileProgressTracker] Interview ${interviewId}: ${step}/${subStep} → ${percentage}%`);

        // Emit to frontend
        await recruiterEmit(ownerId, "INTERVIEW_COMPLETE__CURRENT_PERCENTAGE", {
            interview: interviewId,
            percentage,
            step,
            subStep,
            current,
            total,
            integrationType: "LOCALFILES",
        });

        // Also update the interview document with current progress
        await Interview.findByIdAndUpdate(interviewId, {
            $set: { 
                processingPercentage: percentage,
                processingStep: step,
                processingSubStep: subStep
            }
        });

    } catch (error) {
        console.error(`[LocalFileProgressTracker] Error emitting progress:`, error?.message || error);
        // Don't throw - progress tracking shouldn't break the main flow
    }
}

/**
 * Helper to get LocalFile progress tracker for a specific interview
 * Returns bound functions for easier usage within workers
 */
export function createLocalFileProgressTracker(interviewId, ownerId) {
    return {
        start: (step) => emitLocalFileProgress({ interviewId, ownerId, step, subStep: "start" }),
        reading: (step) => emitLocalFileProgress({ interviewId, ownerId, step, subStep: "reading" }),
        converting: (step) => emitLocalFileProgress({ interviewId, ownerId, step, subStep: "converting" }),
        analyzing: (step) => emitLocalFileProgress({ interviewId, ownerId, step, subStep: "analyzing" }),
        progress: (step, current, total) => emitLocalFileProgress({ interviewId, ownerId, step, subStep: "progress", current, total }),
        complete: (step) => emitLocalFileProgress({ interviewId, ownerId, step, subStep: "complete" }),
    };
}

export default { emitLocalFileProgress, createLocalFileProgressTracker };
