// basic  routes for owner
import express from "express";
import { _WEBHOOK_EmailStatus } from "../controllers/webhook.controller.js";



const router = express.Router();

router.post("/status", _WEBHOOK_EmailStatus);

export default router;
