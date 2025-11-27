import { Interview } from "../../models/Interview.model.js";
import { Candidate } from "../../models/Candidate.model.js";
import InterviewGSheetStructure from "../../models/InterviewGSheetStructure.model.js";
import { geminiAPI } from "../../server.js";
import { APICounter } from "../../models/APICounter.model.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import recruiterEmit from "../../socket/emit/recruiterEmit.js";
import { __RETRY_ENGINE } from "../../engines/retry.Engine.js";

// Rate limiter: allows up to RATE_LIMIT tokens per WINDOW_MS window
class RateLimiter {
    constructor({ tokens = 150, windowMs = 60000 }) {
        this.capacity = tokens;
        this.windowMs = windowMs;
        this.tokens = tokens;
        this.lastRefill = Date.now();
        this.ratePerMs = tokens / windowMs; // tokens per ms
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
            // calculate ms to wait for one token
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

// const apiKeys = [
//     process.env.G1A, process.env.G1B, process.env.G1C,
//     process.env.G2A, process.env.G2B, process.env.G2C,
//     process.env.G3A, process.env.G3B, process.env.G3C,
//     process.env.G4A, process.env.G4B, process.env.G4C,
//     process.env.G5A, process.env.G5B, process.env.G5C,
//     process.env.G6A, process.env.G6B, process.env.G6C,
//     process.env.G7A, process.env.G7B, process.env.G7C,
//     process.env.G8A, process.env.G8B, process.env.G8C,
// ].filter(Boolean);


const apiKeys = [
    process.env.G1A, process.env.G1B, process.env.G1C
].filter(Boolean);

if (apiKeys.length === 0) {
    console.error("FATAL: No Gemini API rotation keys provided in environment variables.");
}

async function getNextSequence(name) {
    const counter = await APICounter.findOneAndUpdate(
        { name: name },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
    );
    return counter.sequence;
}

const getRotatingGeminiAPI = async () => {
    if (apiKeys.length === 0) {
        throw new Error("No Gemini API keys available.");
    }

    const sequence = await getNextSequence('geminiApiKeyIndex');
    const currentKeyIndex = (sequence - 1) % apiKeys.length;
    const apiKey = apiKeys[currentKeyIndex];

    console.log(`Using Gemini API Key index: ${currentKeyIndex}`);

    return new GoogleGenerativeAI(apiKey);
};

// ⏳ Utility to pause execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const sort_resume_as_job_description = async (interviewId) => {
    try {
        if (!interviewId) throw new Error("Missing interviewId");

        // 1️⃣ Fetch Interview
        const interview = await Interview.findById(interviewId);
        if (!interview) throw new Error("Interview not found");

        const jobDescription = interview.jobDescription;
        const jobminimumqualifications = interview.minimumQualification;
        const jobminimumskillsrequired = interview.minimumSkillsRequired;

        if (!jobDescription)
            throw new Error("Interview missing job description");

        // 2️⃣ Fetch Candidates
        const candidates = await Candidate.find({ interview: interviewId });
        if (!candidates.length)
            throw new Error("No candidates found for this interview");

        console.log(`Processing ${candidates.length} candidates for matching...`);
        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: `Processing ${candidates.length} candidates for matching...`
        });
        // Persist initial processing log to DB to maintain ordering
        await InterviewGSheetStructure.findOneAndUpdate(
            { interview: interviewId },
            { $push: { logs: { step: 'processing_candidates', message: `Processing ${candidates.length} candidates for matching...`, level: 'INFO', timestamp: new Date() } } },
            { upsert: true }
        );

        // 3️⃣ Parallel processing with throttling to respect external rate limits
        const RATE_LIMIT_PER_MIN = Number(process.env.GEMINI_RATE_LIMIT_PER_MIN || 150);
        const WINDOW_MS = 60000;
        const concurrency = Number(process.env.GEMINI_CONCURRENCY || 5); // number of parallel calls allowed

        const limiter = new RateLimiter({ tokens: RATE_LIMIT_PER_MIN, windowMs: WINDOW_MS });
        const sem = createSemaphore(concurrency);

        // Process each candidate through a semaphore so only `concurrency` run at a time
        const tasks = candidates.map((candidate, idx) => sem.run(async () => {
            // Skip if resume is already sorted
            if (candidate.isResumeSorted) {
                console.log(`Skipping candidate ${candidate._id} - already sorted (isResumeSorted=true)`);
                await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                    interview: interviewId,
                    level: "INFO",
                    step: `Skipping ${candidate.email || candidate._id}: already sorted`
                }).catch(() => { });
                return { skipped: true };
            }

            if (!candidate.resumeSummary) {
                console.warn(`Candidate ${candidate._id} missing resume text, skipped.`);
                return { skipped: true };
            }

            // Wait for rate limiter token before making the AI call
            await limiter.removeToken();

            const progressLabel = `🔹 [${idx + 1}/${candidates.length}] Sorting candidate: ${candidate.email || candidate._id}`;
            console.log(progressLabel);

            try {
                await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                    interview: interviewId,
                    level: "INFO",
                    step: progressLabel
                });
                // Persist candidate sorting log to DB so DB log order follows emitted order
                await InterviewGSheetStructure.findOneAndUpdate(
                    { interview: interviewId },
                    { $push: { logs: { step: 'candidate_sorting', message: progressLabel, level: 'INFO', timestamp: new Date() } } },
                    { upsert: true }
                );

                const aiResult = await resume_sorter_agent({
                    jobPosition: interview.jobPosition,
                    jobDescription,
                    resumeSummary: candidate.resumeSummary,
                    dynamicData: candidate.dynamicData,
                    jobminimumqualifications,
                    jobminimumskillsrequired
                });

                candidate.matchScore = aiResult?.matchScore ?? null;
                candidate.matchLevel = aiResult?.matchLevel;
                candidate.aiReviewComment = aiResult.error ? "" : aiResult?.reviewComment || "";
                candidate.aiQuestions = aiResult.error ? [] : aiResult?.questions || [];
                candidate.aiImportantQuestions = aiResult.error ? [] : aiResult?.importantQuestions || [];
                // mark as sorted to avoid reprocessing in future runs
                candidate.isResumeSorted = true;
                await candidate.save();

                console.log(`Candidate ${candidate._id} → ${aiResult.matchLevel} (${aiResult.matchScore})`);

                await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                    interview: interviewId,
                    level: "INFO",
                    step: `Candidate ${candidate.email} → ${aiResult.matchLevel} (${aiResult.matchScore})`,
                    data: { reviewedCandidate: 'SUCCESS' }
                });

                await InterviewGSheetStructure.findOneAndUpdate(
                    { interview: interviewId },
                    { $push: { logs: { step: 'candidate_result', message: `Candidate ${candidate.email} → ${aiResult.matchLevel} (${aiResult.matchScore})`, level: 'INFO', timestamp: new Date() } } },
                    { upsert: true }
                );

                // Atomically increment reviewedCandidates to avoid race conditions
                await Interview.findByIdAndUpdate(interviewId, { $inc: { reviewedCandidates: 1 } });

                return { success: true };
            } catch (err) {
                console.error(`Error processing candidate ${candidate._id}:`, err?.message || err);
                await InterviewGSheetStructure.findOneAndUpdate(
                    { interview: interviewId },
                    { $push: { logs: { step: 'candidate_result_error', message: `Candidate ${candidate.email || candidate._id} processing error: ${err?.message || err}`, level: 'error', timestamp: new Date() } } },
                    { upsert: true }
                );
                return { success: false, error: err?.message || String(err) };
            }
        }));

        // Wait for all candidate processing tasks to finish (they're throttled by limiter+sem)
        await Promise.all(tasks);

        // Update interview status
        interview.status = "sort_resume_as_job_description";
        await interview.save();

        // Log progress
        await InterviewGSheetStructure.findOneAndUpdate(
            { interview: interviewId },
            {
                $push: {
                    logs: {
                        step: "sort_resume_as_job_description",
                        message: `Sorted ${candidates.length} candidates by job description`,
                        timestamp: new Date(),
                    },
                },
            },
            { upsert: true }
        );

        console.log(`Step F completed: Sorted ${candidates.length} candidates`);

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "SUCCESS",
            step: `Sorted all ${candidates.length} candidates by job description`
        });


        // find all candidates for that interview with top score to less score
        const sortedCandidates = await Candidate.find({ interview: interviewId })
            .sort({ matchScore: -1 });

        // console log all candiates with their score from highest to lowest
        console.log("Sorted Candidates by Match Score:");
        // Emit and persist sorted candidate logs sequentially to guarantee ordering
        for (let idx = 0; idx < sortedCandidates.length; idx++) {
            const candidate = sortedCandidates[idx];
            console.log(
                `${idx + 1}. Candidate ID: ${candidate.email}, Match Level: ${candidate.matchLevel}, Match Score: ${candidate.matchScore}`
            );
            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "INFO",
                step: `${idx + 1}. Candidate ID: ${candidate.email}, Match Level: ${candidate.matchLevel}, Match Score: ${candidate.matchScore}.`,
            });
            // Persist this sorted-candidate log into DB
            await InterviewGSheetStructure.findOneAndUpdate(
                { interview: interviewId },
                { $push: { logs: { step: 'sorted_candidate_entry', message: `${idx + 1}. Candidate ID: ${candidate.email}, Match Level: ${candidate.matchLevel}, Match Score: ${candidate.matchScore}.`, level: 'INFO', timestamp: new Date() } } },
                { upsert: true }
            );
        }

        // save sorted list to interview.sortedList
        interview.sortedList = sortedCandidates.map((candidate) => ({
            candidateId: candidate._id,
            matchLevel: candidate.matchLevel,
            matchScore: candidate.matchScore,
        }));
        await interview.save();

        console.log(`Sorted list saved to interview ${interviewId}`);

        await sleep(1000);

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: `Waiting for recruiter to review sorted candidates and allow to send emails...`,
            data: {
                waitForRecruiter: true,
                reviewedCandidate: interview.reviewedCandidates,
                sortedListArray: interview.sortedList
            }
        });

        console.log({
            interview: interviewId,
            level: "INFO",
            step: `Waiting for recruiter to review sorted candidates and allow to send emails...`,
            data: {
                waitForRecruiter: true,
                reviewedCandidate: interview.reviewedCandidates
            }
        });

        return { success: true };
    } catch (error) {
        console.error("❌ Error in sort_resume_as_job_description:", error);

        // Persist interview failure state so the retry engine can pick it up
        try {
            await Interview.findByIdAndUpdate(interviewId, {
                $set: { currentStatus: "FAILED", lastProcessedStep: "SORTING" },
                $push: { logs: { message: `Sorting failed: ${error.message}`, level: "error" } }
            });
        } catch (updateErr) {
            console.error(`[SORTING] failed to update interview status for ${interviewId}:`, updateErr?.message || updateErr);
        }

        // Attempt to emit progress log (fetch owner when possible)
        try {
            const interviewDoc = await Interview.findById(interviewId);
            await recruiterEmit(interviewDoc?.owner || null, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "ERROR",
                step: `Sorting failed: ${error.message}`
            });
        } catch (emitErr) {
            // ignore emit failures
        }

        // Trigger retry engine (it will decide whether to attempt retry)
        try {
            await __RETRY_ENGINE(interviewId);
        } catch (retryErr) {
            console.error(`[RETRY ENGINE ERROR] retry engine failed for interview=${interviewId}:`, retryErr?.message || retryErr);
        }

        return { success: false, error: error.message || "Internal server error" };
    }
};


/**
 * AI Agent: resume_sorter_agent
 * Evaluates resume vs job description.
 */
export async function resume_sorter_agent({ jobPosition, jobDescription, resumeSummary, dynamicData, jobminimumqualifications, jobminimumskillsrequired }, retries = 3) {
    try {
        const new_geminiAPI = await getRotatingGeminiAPI();
        const model = new_geminiAPI.getGenerativeModel({ model: "gemini-2.5-pro" });

        const prompt = `
You are an expert technical recruiter with 20+ years of experience.
Your job: Evaluate how well a candidate's resume matches a given job description.

Analyze these inputs carefully:

---JOB POSITION---
${jobPosition}

--- JOB DESCRIPTION ---
${jobDescription}

-- JOB REQUIREMENTS ---
Minimum Qualifications: ${jobminimumqualifications}
Minimum Skills Required: ${jobminimumskillsrequired}

--- CANDIDATE RESUME TEXT ---
${resumeSummary}

--- CANDIDATE DETAILS ---
${JSON.stringify(dynamicData)}

<strong>
If the JOB POSITION does not match with the job that candidate has applied for (you will most likely find applied job position in CANDIDATE DETAILS), then mark the candidate as Unqualified with a score of 0 immediately even if the candidate is otherwise qualified, if not proceed to evaluate the resume against the job description.
Before evaluating, first check if the JOB POSITION matches the applied job position in CANDIDATE DETAILS.
If the JOB POSITION does not match, respond with the following JSON:
\`\`\`json
{
  "matchLevel": "Unqualified",
  "matchScore": 0,
    "reviewComment": "string providing nice review comment",
    "questions": [],
    "importantQuestions": []
}
\`\`\`
</strong>

Now determine the candidate's suitability with very high accuracy.

Also give a small review comment (2-3 sentences) on why you rated the candidate that way.
Give 9-10 questions that you would ask the candidate in an interview based on their resume and the job description.
Give 3-4 important questions that the candidate must be able to answer based on the job description and resume.
Your output *must* be strictly valid JSON in this format:
\`\`\`json
{
  "matchLevel": "High Match" | "Medium Match" | "Low Match" | "Unqualified",
  "matchScore": number (0 to 100),
    "reviewComment": "string providing brief review comment",
    "questions": ["array of 9-10 questions based on resume and job description"],
    "importantQuestions": ["array of 3-4 important questions based on job description and resume"]
}
\`\`\`

Guidelines for scoring:
- 90–100 → "High Match": candidate fits almost perfectly.
- 70–89 → "Medium Match": candidate is good but not perfect.
- 40–69 → "Low Match": candidate is weak but possibly trainable.
- Below 40 → "Unqualified": candidate does not meet core requirements.

Important:
- Focus only on skills, experience, and role alignment.
- Ignore formatting or location.
- Be consistent — identical resumes  identical scores.
`;

        // console.log("Prompt to AI:", prompt);

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const match = text.match(/```json([\s\S]*?)```/);
        const jsonText = match ? match[1] : text;

        const parsed = JSON.parse(jsonText);

        // console.log("Teh AI output: ", parsed)
        if (
            !parsed.matchLevel ||
            typeof parsed.matchScore !== "number" ||
            parsed.matchScore < 0 ||
            parsed.matchScore > 100
        ) {
            throw new Error("Invalid or incomplete AI response");
        }

        return parsed;
    } catch (error) {
        console.error(`[resume_sorter_agent] Error: ${error.message}. Retries left: ${retries}`);
        if (retries > 0) {
            console.log("Retrying... (in 1 second)");
            await sleep(1000); // Wait for 1 second before retrying
            return resume_sorter_agent({ jobDescription, resumeSummary, jobminimumqualifications, jobminimumskillsrequired }, retries - 1);
        } else {
            console.error("[resume_sorter_agent] Max retries reached. Failing.");
            return {
                matchLevel: "Unqualified",
                matchScore: 0,
                error: error.message,
            };
        }
    }
}
