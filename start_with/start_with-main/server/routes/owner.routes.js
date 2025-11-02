// basic  routes for owner
import express from "express";
// import { LoginOwner, RegisterOwner, CreateCompany, getProfile, CreateRecruiter, CreateInterview } from "../controller/owner.controller.js";
import { LoginOwner, RegisterOwner, getProfile, enhanceJobDescription, FetchAllInterviews, DeleteInterviews } from "../controllers/owner.controller.js";
import { ownerTokenAuth } from "../middlewares/ownerTokenAuth.middleware.js";
import { createInterview } from "../controllers/workers/createInterview.controller.js";

const router = express.Router();

// POST /api/owners/register
router.post("/owner/register", RegisterOwner);
router.post("/owner/login", LoginOwner);
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

// add/recruiter
export default router;