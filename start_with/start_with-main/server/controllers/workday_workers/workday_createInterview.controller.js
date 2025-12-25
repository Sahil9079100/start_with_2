// server/controllers/workday_workers/workday_createInterview.controller.js

/**
 * @deprecated This file is deprecated. Use the createInterview controller from workers folder
 * which now handles all integration types via the IntegrationDecider middleware.
 * 
 * The Workday pipeline is now managed by:
 * - queues/workdayPipelineQueue.js - BullMQ queue for Workday
 * - controllers/workday_workers/workday_fetchData.controller.js - Step 1
 * - controllers/workday_workers/workday_separateCandidates.controller.js - Step 2  
 * - controllers/workday_workers/workday_extractResumeText.controller.js - Step 3
 * - controllers/workday_workers/workday_sortResumes.controller.js - Step 4
 */

import { Interview } from "../../models/Interview.model.js";
import { Candidate } from "../../models/Candidate.model.js";
import { startWorkdayPipeline } from "../../queues/workdayPipelineQueue.js";
import axios from "axios";

/**
 * This function fetches a Workday report using RaaS (Report-as-a-Service).
 * @param {*} reportUrl 
 * @param {*} username 
 * @param {*} password 
 * @returns 
 */
async function fetchWorkdayReport(reportUrl, username, password) {
    const auth = {
        username: username,
        password: password
    };

    // If reportUrl already includes `?format=json`, fine. Otherwise append it
    let url = reportUrl;
    if (!url.includes("format=json")) {
        url += (url.includes("?") ? "&" : "?") + "format=json";
    }

    try {
        const resp = await axios.get(url, {
            auth,
            headers: {
                'Accept': 'application/json'
            },
            timeout: 30000
        });

        return resp.data;
    } catch (err) {
        console.error('Workday RaaS fetch error', err.response?.status, err.response?.data);
        throw err;
    }
}


/**
 * @deprecated Use the unified createInterview controller with IntegrationDecider middleware
 * 
 * This controller creates an interview using Workday integration.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export const workday_createInterview = async (req, res) => {
    try {
        const ownerId = req.user;
        const data = req.body;
        
        console.log("[Workday Create] Owner:", ownerId);
        console.log("[Workday Create] Data:", req.body);
        
        // For Workday, candidateSheetId can be optional or a placeholder
        if (!data.jobPosition) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Get Workday RaaS URL from integration object
        const workdayRaasUrl = data.iObj?.iData;
        if (!workdayRaasUrl) {
            return res.status(400).json({ error: "Missing Workday RaaS URL" });
        }

        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

        const newInterview = await Interview.create({
            ...data,
            owner: ownerId,
            interviewUrl: 'none',
            isSingle: false,
            status: "initial",
            currentStatus: "CREATED",
            integrationType: "WORKDAY",
            integrationData: workdayRaasUrl,
            candidateSheetId: data.candidateSheetId || `workday_${Date.now()}`,
            logs: [
                {
                    message: "Interview record created for Workday integration. Starting pipeline.",
                    level: "success",
                },
            ]
        });

        const url = `${FRONTEND_URL}/${newInterview._id}/login`;

        newInterview.interviewUrl = url;
        await newInterview.save();

        console.log(`[WORKDAY INTERVIEW CREATED] ${newInterview._id} by ${ownerId}`);

        // ✅ kick off Workday pipeline via BullMQ queue
        await startWorkdayPipeline(newInterview._id.toString(), workdayRaasUrl);

        res.status(201).json({
            success: true,
            status: newInterview.status,
            data: {
                id: newInterview._id,
                url: newInterview.interviewUrl,
            },
            Interview: newInterview,
            message: "Workday interview created and queued for processing",
        });
    } catch (error) {
        console.log("Error creating Workday interview:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create Workday interview",
            error: error.message,
        });
    }
};