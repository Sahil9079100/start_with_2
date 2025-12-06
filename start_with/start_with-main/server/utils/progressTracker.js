/**
 * Progress Tracker Utility for Interview Pipeline
 * 
 * Calculates and emits completion percentage for the entire interview processing flow.
 * 
 * Flow breakdown (total 100%):
 * ─────────────────────────────────────────────────────────────
 * STEP 1: STRUCTURE_SHEET      →  5%  (fixed, one-time)
 * STEP 2: EXTRACT_SHEET        → 10%  (fixed, one-time)  
 * STEP 3: RESUME_SEPARATION    → 15%  (base 5% + 10% distributed per candidate saved)
 * STEP 4: OCR                  → 35%  (distributed per candidate resume extracted)
 * STEP 5: SORTING              → 35%  (distributed per candidate sorted)
 * ─────────────────────────────────────────────────────────────
 * 
 * The percentage is calculated based on:
 * - Completion of major steps (fixed percentages)
 * - Per-candidate progress within steps that iterate over candidates
 */

import recruiterEmit from "../socket/emit/recruiterEmit.js";
import { Interview } from "../models/Interview.model.js";

// Step weight configuration (must sum to 100)
const STEP_WEIGHTS = {
    STRUCTURE_SHEET: 5,
    EXTRACT_SHEET: 10,
    RESUME_SEPARATION: 15,  // 5% base + 10% for candidate saving
    OCR: 35,
    SORTING: 35,
};

// Base percentages for each step start
const STEP_BASE = {
    STRUCTURE_SHEET: 0,
    EXTRACT_SHEET: 5,
    RESUME_SEPARATION: 15,
    OCR: 30,
    SORTING: 65,
};

/**
 * Calculate and emit the current progress percentage
 * 
 * @param {Object} params
 * @param {string} params.interviewId - Interview MongoDB ID
 * @param {string} params.ownerId - Owner ID for socket emission
 * @param {string} params.step - Current step name (STRUCTURE_SHEET, EXTRACT_SHEET, etc.)
 * @param {string} params.subStep - Sub-step within the current step ('start', 'progress', 'complete')
 * @param {number} [params.current] - Current item number (for candidate-based steps)
 * @param {number} [params.total] - Total items (for candidate-based steps)
 */
export async function emitProgress({
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
            case "STRUCTURE_SHEET":
                // 0-5%
                if (subStep === "start") {
                    percentage = 0;
                } else if (subStep === "progress") {
                    percentage = 2;
                } else if (subStep === "complete") {
                    percentage = 5;
                }
                break;

            case "EXTRACT_SHEET":
                // 5-15%
                if (subStep === "start") {
                    percentage = 5;
                } else if (subStep === "progress") {
                    percentage = 10;
                } else if (subStep === "complete") {
                    percentage = 15;
                }
                break;

            case "RESUME_SEPARATION":
                // 15-30%: 5% base (15-20) + 10% for candidates (20-30)
                if (subStep === "start") {
                    percentage = 15;
                } else if (subStep === "analyzing") {
                    // AI agent analyzing columns
                    percentage = 18;
                } else if (subStep === "progress") {
                    // Saving candidates: 20-30% range
                    const candidateWeight = 10; // 10% total for saving candidates
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
                    // Per-candidate progress within OCR step
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
                    // Per-candidate progress within sorting step
                    const sortWeight = 35;
                    const sortProgress = total > 0 ? (current / total) * sortWeight : 0;
                    percentage = 65 + sortProgress;
                } else if (subStep === "complete") {
                    percentage = 100;
                }
                break;

            default:
                console.warn(`[ProgressTracker] Unknown step: ${step}`);
                return;
        }

        // Round to 1 decimal place
        percentage = Math.round(percentage * 10) / 10;

        // Clamp between 0 and 100
        percentage = Math.max(0, Math.min(100, percentage));

        console.log(`[ProgressTracker] Interview ${interviewId}: ${step}/${subStep} → ${percentage}%`);

        // Emit to frontend
        await recruiterEmit(ownerId, "INTERVIEW_COMPLETE__CURRENT_PERCENTAGE", {
            interview: interviewId,
            percentage,
            step,
            subStep,
            current,
            total,
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
        console.error(`[ProgressTracker] Error emitting progress:`, error?.message || error);
        // Don't throw - progress tracking shouldn't break the main flow
    }
}

/**
 * Helper to get progress tracker for a specific interview
 * Returns bound functions for easier usage within workers
 */
export function createProgressTracker(interviewId, ownerId) {
    return {
        start: (step) => emitProgress({ interviewId, ownerId, step, subStep: "start" }),
        progress: (step, current, total) => emitProgress({ interviewId, ownerId, step, subStep: "progress", current, total }),
        analyzing: (step) => emitProgress({ interviewId, ownerId, step, subStep: "analyzing" }),
        complete: (step) => emitProgress({ interviewId, ownerId, step, subStep: "complete" }),
    };
}

export default { emitProgress, createProgressTracker };
