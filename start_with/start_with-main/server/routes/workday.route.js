///integrate/workday
import express from "express";
import { edit_workday_integration, workday_integration, disconnect_workday_integration } from "../controllers/workday.controller.js";
import { ownerTokenAuth } from "../middlewares/ownerTokenAuth.middleware.js";

const router = express.Router();

// POST /api/integrate/workday
router.post("/workday", ownerTokenAuth, workday_integration);
router.post("/edit/workday", ownerTokenAuth, edit_workday_integration);
router.get("/disconnect/workday", ownerTokenAuth, disconnect_workday_integration);

export default router;