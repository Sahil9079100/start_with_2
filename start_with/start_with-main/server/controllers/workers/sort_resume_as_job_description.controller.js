import { Interview } from "../../models/Interview.model.js";
import { Candidate } from "../../models/Candidate.model.js";
import InterviewGSheetStructure from "../../models/InterviewGSheetStructure.model.js";
import { geminiAPI } from "../../server.js";
import { APICounter } from "../../models/APICounter.model.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKeys = [
    process.env.G1A, process.env.G1B, process.env.G1C,
    process.env.G2A, process.env.G2B, process.env.G2C,
    process.env.G3A, process.env.G3B, process.env.G3C,
    process.env.G4A, process.env.G4B, process.env.G4C,
    process.env.G5A, process.env.G5B, process.env.G5C,
    process.env.G6A, process.env.G6B, process.env.G6C,
    process.env.G7A, process.env.G7B, process.env.G7C,
    process.env.G8A, process.env.G8B, process.env.G8C,
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

        // 3️⃣ Sequential processing (so delay actually works)
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];

            if (!candidate.resumeSummary) {
                console.warn(`Candidate ${candidate._id} missing resume text, skipped.`);
                continue;
            }

            console.log(`🔹 [${i + 1}/${candidates.length}] Sorting candidate: ${candidate._id}`);

            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "INFO",
                step: `🔹 [${i + 1}/${candidates.length}] Sorting candidate: ${candidate.email}`
            });

            const aiResult = await resume_sorter_agent({
                jobDescription,
                resumeSummary: candidate.resumeSummary,
                jobminimumqualifications,
                jobminimumskillsrequired
            });

            if (aiResult?.matchScore && aiResult?.matchLevel) {
                candidate.matchScore = aiResult.matchScore;
                candidate.matchLevel = aiResult.matchLevel;
                await candidate.save();
            }

            console.log(
                `Candidate ${candidate._id} → ${aiResult.matchLevel} (${aiResult.matchScore})`
            );

            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "INFO",
                step: `Candidate ${candidate.email} → ${aiResult.matchLevel} (${aiResult.matchScore})`
            });

            // ⏳ Wait 6 seconds between each AI call
            // await sleep(6000);
        }

        // 4️⃣ Update interview status
        interview.status = "sort_resume_as_job_description";
        await interview.save();

        // 5️⃣ Log progress
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

        console.log(`✅ Step F completed: Sorted ${candidates.length} candidates`);

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
        sortedCandidates.forEach(async (candidate, index) => {
            console.log(
                `${index + 1}. Candidate ID: ${candidate.email}, Match Level: ${candidate.matchLevel}, Match Score: ${candidate.matchScore}`
            );
            await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                level: "INFO",
                step: `${index + 1}. Candidate ID: ${candidate.email}, Match Level: ${candidate.matchLevel}, Match Score: ${candidate.matchScore}.`
            });
        });

        interview.sortedList = sortedCandidates.map((candidate) => ({
            candidateId: candidate._id,
            matchLevel: candidate.matchLevel,
            matchScore: candidate.matchScore,
        }));
        await interview.save();

        console.log(`Sorted list saved to interview ${interviewId}`);

        await recruiterEmit(interview.owner, "INTERVIEW_PROGRESS_LOG", {
            interview: interviewId,
            level: "INFO",
            step: `Waiting for recruiter to review sorted candidates and allow to send emails...`
        });

        return { success: true };
    } catch (error) {
        console.error("❌ Error in sort_resume_as_job_description:", error);
        return { success: false, error: error.message || "Internal server error" };
    }
};


/**
 * 🧠 AI Agent: resume_sorter_agent
 * Evaluates resume vs job description.
 */
export async function resume_sorter_agent({ jobDescription, resumeSummary, jobminimumqualifications, jobminimumskillsrequired }) {
    try {
        const new_geminiAPI = await getRotatingGeminiAPI();
        const model = new_geminiAPI.getGenerativeModel({ model: "gemini-2.5-pro" });

        const prompt = `
You are an expert technical recruiter with 20+ years of experience.
Your job: Evaluate how well a candidate's resume matches a given job description.

Analyze these two inputs carefully:

--- JOB DESCRIPTION ---
${jobDescription}

-- JOB REQUIREMENTS ---
Minimum Qualifications: ${jobminimumqualifications}
Minimum Skills Required: ${jobminimumskillsrequired}

--- RESUME TEXT ---
${resumeSummary}

Now determine the candidate's suitability with very high accuracy.

Your output *must* be strictly valid JSON in this format:
\`\`\`json
{
  "matchLevel": "High Match" | "Medium Match" | "Low Match" | "Unqualified",
  "matchScore": number (0 to 100)
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

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const match = text.match(/```json([\s\S]*?)```/);
        const jsonText = match ? match[1] : text;

        const parsed = JSON.parse(jsonText);

        console.log("Teh AI output: ", parsed)
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
        console.error("[resume_sorter_agent] Error:", error.message);
        return {
            matchLevel: "Unqualified",
            matchScore: 0,
            error: error.message,
        };
    }
}
