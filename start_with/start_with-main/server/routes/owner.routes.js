// basic  routes for owner
import express from "express";
// import { LoginOwner, RegisterOwner, CreateCompany, getProfile, CreateRecruiter, CreateInterview } from "../controller/owner.controller.js";
import { LoginOwner, RegisterOwner, getProfile, enhanceJobDescription, FetchAllInterviews, DeleteInterviews, FetchSortedListCandidates, FetchCandiateCompletedInterviewDetails, getSkillsUsingAI, SendEmailToCandidates, Logout, extractPdfText } from "../controllers/owner.controller.js";
import { ownerTokenAuth } from "../middlewares/ownerTokenAuth.middleware.js";
import { createInterview, scheduleInterview } from "../controllers/workers/createInterview.controller.js";
import multer from "multer";


const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Max size is 10MB.' });
        }
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
};

const router = express.Router();

// POST /api/owners/register
router.post("/owner/register", RegisterOwner);
router.post("/owner/login", LoginOwner);
router.get("/owner/logout", ownerTokenAuth, Logout);
//owner/profile
router.get("/owner/profile", ownerTokenAuth, getProfile);
// router.get("/owner/profile", ownerTokenAuth, getProfile);

// enhance-job-description
router.post("/owner/enhance-job-description", ownerTokenAuth, enhanceJobDescription);

// router.post("/owner/create/company", ownerTokenAuth, CreateCompany);

// router.post("/owner/add/company", ownerTokenAuth, CreateCompany);
// router.post("/owner/add/recruiter", ownerTokenAuth, CreateRecruiter);


router.post("/owner/create/interview", ownerTokenAuth, createInterview);
router.post("/owner/fetch/interviews", ownerTokenAuth, FetchAllInterviews);
router.post("/owner/delete/interview", ownerTokenAuth, DeleteInterviews);
router.get("/owner/fetch/interview/:id/sorted-list", ownerTokenAuth, FetchSortedListCandidates);
router.get("/owner/fetch/interview/result/:id", ownerTokenAuth, FetchCandiateCompletedInterviewDetails);
router.get("/owner/get-skills-ai/:jobPosition", ownerTokenAuth, getSkillsUsingAI);
router.post("/owner/schedule/interview", ownerTokenAuth, scheduleInterview);
router.post("/owner/send/email", ownerTokenAuth, SendEmailToCandidates);
router.post("/owner/extract-pdf-text", ownerTokenAuth, upload.single('pdf'), handleMulterError, extractPdfText);


//`/api/owner/get-skills-ai/${jobPosition}`
// add/recruiter
export default router;





