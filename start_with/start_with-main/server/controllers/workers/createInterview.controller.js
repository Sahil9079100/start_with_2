// server/controllers/workers/createInterview.controller.js

// import { schedule } from "node-cron";
import { Interview } from "../../models/Interview.model.js";
import { Candidate } from "../../models/Candidate.model.js";
import { startPipeline } from "../../queues/interviewPipelineQueue.js";
import { startWorkdayPipeline } from "../../queues/workdayPipelineQueue.js";
import { startLocalFilePipeline } from "../../queues/localfilePipelineQueue.js";
import { TextExtractor } from "./extract_text_from_resumeurl.controller.js";
import { INTEGRATIONS } from "../../middlewares/IntegrationDecider.middleware.js";
import fs from "fs";
import path from "path";
import os from "os";

export const createInterview = async (req, res) => {
    try {
        const ownerId = req.user; // contains user id from middleware.
        const data = req.body;
        const integrationConfig = req.integrationConfig; // Set by integrationDecider middleware
        
        console.log(ownerId);
        console.log(req.body);
        console.log("Integration Config:", integrationConfig);

        // Validate required fields based on integration type
        if (integrationConfig?.integrationType === "WORKDAY") {
            // For Workday, we need integration data (RaaS URL) instead of sheet ID
            if (!integrationConfig.integrationData || !data.jobPosition) {
                return res.status(400).json({ error: "Missing required fields for Workday integration" });
            }
        } else if (integrationConfig?.integrationType === "LOCALFILES") {
            // For LocalFiles, we need integration data (file path) instead of sheet ID
            if (!integrationConfig.integrationData || !data.jobPosition) {
                return res.status(400).json({ error: "Missing required fields for LocalFile integration (file path and job position required)" });
            }
        } else {
            // For GoogleSheet and other integrations
            if (!data.candidateSheetId || !data.jobPosition) {
                return res.status(400).json({ error: "Missing required fields" });
            }
        }

        console.log(data);

        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

        // Create interview with integration info
        const newInterview = await Interview.create({
            ...data,
            owner: ownerId,
            interviewUrl: 'none',
            isSingle: false,
            status: "initial",
            currentStatus: "CREATED",
            // Store integration type for reference
            integrationType: integrationConfig?.integrationType || "GOOGLESHEET",
            integrationData: integrationConfig?.integrationData || null,
            logs: [
                {
                    message: `Interview record created successfully using ${integrationConfig?.integrationType || "GOOGLESHEET"} integration. Waiting for next phase.`,
                    level: "success",
                },
            ]
        });

        const url = `${FRONTEND_URL}/${newInterview._id}/login`;

        newInterview.interviewUrl = url;
        await newInterview.save();

        console.log(`[INTERVIEW CREATED] ${newInterview._id} by ${ownerId} using ${integrationConfig?.integrationType || "GOOGLESHEET"}`);

        // ✅ Kick off the appropriate pipeline based on integration type
        if (integrationConfig?.integrationType === "WORKDAY") {
            console.log(`[INTERVIEW] Starting Workday pipeline for interview ${newInterview._id}`);
            await startWorkdayPipeline(newInterview._id.toString(), integrationConfig.integrationData);
        } else if (integrationConfig?.integrationType === "GREENHOUSE") {
            // TODO: Implement Greenhouse pipeline
            console.log(`[INTERVIEW] Greenhouse pipeline not yet implemented`);
            // For now, mark as created but don't start pipeline
        } else if (integrationConfig?.integrationType === "LOCALFILES") {
            // LocalFiles pipeline - process uploaded CSV/XLSX file
            console.log(`[INTERVIEW] Starting LocalFile pipeline for interview ${newInterview._id}`);
            // For LOCALFILES, integrationData should contain the file path
            // We'll use the filename from the path as integrationData
            const fileName = integrationConfig.integrationData ? integrationConfig.integrationData.split('/').pop() : 'unknown.csv';
            await startLocalFilePipeline(newInterview._id.toString(), fileName, integrationConfig.integrationData);
        } else {
            // Default: GoogleSheet pipeline
            console.log(`[INTERVIEW] Starting GoogleSheet pipeline for interview ${newInterview._id}`);
            await startPipeline(newInterview._id.toString());
        }

        res.status(201).json({
            success: true,
            status: newInterview.status,
            data: {
                id: newInterview._id,
                url: newInterview.interviewUrl,
            },
            Interview: newInterview,
            message: `Interview created and queued for processing via ${integrationConfig?.integrationType || "GOOGLESHEET"}`,
        });
    } catch (error) {
        console.log("Error creating interview:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create interview",
            error: error.message,
        });
    }
}


export const scheduleInterview = async (req, res) => {
    try {
        console.log("Schedule Interview called with body:", req.body);
        const { interviewId, expiryDate, duration, questions, language } = req.body;

        if (!interviewId) {
            return res.status(400).json({
                success: false,
                message: "Missing required filed: interviewID",
            })
        }

        const findInterview = await Interview.findById(interviewId)
        if (!findInterview) return res.status(404).json({
            success: false,
            message: "Interview not found"
        });

        //launguage
        findInterview.questions = questions
        findInterview.launguage = language
        findInterview.duration = duration
        findInterview.expiryDate = expiryDate
        findInterview.isSheduled = true

        await findInterview.save();

        // const 
        res.status(200).json({
            success: true,
            message: "Interview scheduled successfully",
            data: findInterview
        });
    } catch (error) {
        console.log("Error in scheduling interview:", error);
        res.status(500).json({
            success: false,
            message: "Failed to schedule interview",
            error: error.message,
        });
    }
}



export const createSingleInterview = async (req, res) => {
    try {
        const ownerId = req.user; // contains user id from middleware.
        const data = req.body;
        console.log(ownerId)
        console.log(req.body)

        // Expecting fields in data: language, duration, questions (array or JSON string), expiryDate, jobPosition, jobDescription, resumeUrl, candidateEmail (optional)
        const {
            language = 'English',
            duration,
            questions,
            expiryDate,
            jobPosition,
            jobDescription,
            resumeUrl,
            candidateEmail,
        } = data || {};

        if (!jobPosition || !jobDescription) {
            return res.status(400).json({ success: false, message: 'Missing required fields: jobPosition or jobDescription' });
        }

        // normalize questions: client may send JSON string
        let parsedQuestions = [];
        try {
            if (typeof questions === 'string') parsedQuestions = JSON.parse(questions);
            else if (Array.isArray(questions)) parsedQuestions = questions;
        } catch (e) {
            parsedQuestions = [];
        }

        // create a synthetic candidateSheetId for single interviews
        const candidateSheetId = `single_${ownerId}_${Date.now()}`;

        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

        const newInterview = await Interview.create({
            owner: ownerId,
            launguage: language,
            candidateSheetId,
            jobPosition,
            duration,
            jobDescription,
            // useremail: [candidateEmail || `single_candidate_${Date.now()}@local`],
            expiryDate: expiryDate || null,
            // interviewUrl: 'none',
            isSingle: true,
            questions: questions,
            status: 'initial',
            logs: [
                { message: 'Single interview created', level: 'success' }
            ]
        });

        newInterview.interviewUrl = `${FRONTEND_URL}/${newInterview._id}/login`;
        await newInterview.save();

        // Create candidate document using provided resume (url or uploaded file)
        const candidateEmailFinal = candidateEmail || `single_candidate_${Date.now()}@local`;

        // Determine resume source
        let finalResumeUrl = resumeUrl || '';
        let resumeText = '';

        // If file uploaded (multer memoryStorage), req.file will be present
        const file = req.file;
        if (file && file.buffer) {
            // save uploaded file to a temp uploads directory so it can be referenced later
            const uploadsDir = path.join(process.cwd(), 'uploads', 'resumes');
            try {
                await fs.promises.mkdir(uploadsDir, { recursive: true });
            } catch (e) {
                // ignore
            }
            const filename = `single_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
            const filepath = path.join(uploadsDir, filename);
            await fs.promises.writeFile(filepath, file.buffer);
            finalResumeUrl = `/uploads/resumes/${filename}`; // note: adjust if you serve uploads statically

            // Try extracting text from buffer using pdf-parse
            try {
                const { default: pdfParse } = await import('pdf-parse');
                const pdfData = await pdfParse(file.buffer);
                resumeText = (pdfData && pdfData.text) ? pdfData.text.trim() : '';
            } catch (parseErr) {
                console.warn('pdf-parse failed on uploaded file:', parseErr?.message || parseErr);
                resumeText = '';
            }
        } else if (resumeUrl) {
            // Use existing TextExtractor which handles Drive and http(s) PDFs and OCR fallback
            try {
                resumeText = await TextExtractor(resumeUrl, ownerId);
            } catch (err) {
                console.warn('TextExtractor failed for resumeUrl:', err?.message || err);
                resumeText = '';
            }
        }

        const candidate = await Candidate.create({
            email: candidateEmailFinal,
            owner: ownerId,
            interview: newInterview._id,
            resumeUrl: finalResumeUrl || (resumeUrl || 'none'),
            resumeSummary: resumeText || '',
            isResumeScanned: !!(resumeText && resumeText.length > 0),
            matchLevel: '',
            matchScore: null,
            dynamicData: {},
            name: '',
        });

        // update interview counts/logs
        newInterview.resumeCollected = (newInterview.resumeCollected || 0) + 1;
        newInterview.totalCandidates = (newInterview.totalCandidates || 0) + 1;
        await newInterview.save();

        console.log(`[SINGLE INTERVIEW CREATED] interview=${newInterview._id} candidate=${candidate._id}`);

        res.status(201).json({ success: true, message: 'Single interview created', Interview: newInterview, Candidate: candidate });
    } catch (error) {
        console.log("Error in creating single interview:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create single interview",
            error: error.message,
        });
    }
}


/**
 * Create an interview with a LocalFile (CSV/XLSX) upload
 * 
 * This function handles file uploads for LocalFile integration.
 * The uploaded file is saved to the server and the pipeline is started.
 * 
 * @param {Request} req - Express request with file upload
 * @param {Response} res - Express response
 */
export const createLocalFileInterview = async (req, res) => {
    try {
        const ownerId = req.user;
        const data = req.body;
        const file = req.file;

        console.log(`[LocalFile Interview] Creating for owner: ${ownerId}`);
        console.log("Request body:", data);
        console.log("File:", file?.originalname);

        // Validate required fields
        if (!data.jobPosition) {
            return res.status(400).json({
                success: false,
                message: "Missing required field: jobPosition"
            });
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "Missing required file: candidateFile (CSV or XLSX)"
            });
        }

        // Validate file type
        const allowedMimeTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        const allowedExtensions = ['.csv', '.xlsx', '.xls'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file type. Only CSV and XLSX files are allowed."
            });
        }

        // Save file to uploads directory
        const uploadsDir = path.join(process.cwd(), 'uploads', 'localfiles');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const timestamp = Date.now();
        const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}_${safeFilename}`;
        const filePath = path.join(uploadsDir, filename);

        // Write file to disk
        fs.writeFileSync(filePath, file.buffer);
        console.log(`[LocalFile Interview] File saved: ${filePath}`);

        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

        // Create interview with LocalFile integration
        const newInterview = await Interview.create({
            ...data,
            owner: ownerId,
            interviewUrl: 'none',
            isSingle: false,
            status: "initial",
            currentStatus: "CREATED",
            integrationType: "LOCALFILES",
            integrationData: filePath, // Store file path
            logs: [
                {
                    message: `Interview record created with LocalFile integration. File: ${file.originalname}`,
                    level: "success",
                },
            ]
        });

        const url = `${FRONTEND_URL}/${newInterview._id}/login`;
        newInterview.interviewUrl = url;
        await newInterview.save();

        console.log(`[LocalFile Interview] Created: ${newInterview._id}`);

        // Start the LocalFile pipeline
        await startLocalFilePipeline(newInterview._id.toString(), file.originalname, filePath);

        res.status(201).json({
            success: true,
            status: newInterview.status,
            data: {
                id: newInterview._id,
                url: newInterview.interviewUrl,
            },
            Interview: newInterview,
            message: "Interview created and LocalFile pipeline started",
        });
    } catch (error) {
        console.error("[LocalFile Interview] Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create LocalFile interview",
            error: error.message,
        });
    }
}