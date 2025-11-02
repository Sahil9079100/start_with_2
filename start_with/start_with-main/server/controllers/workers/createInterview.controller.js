// server/controllers/workers/createInterview.controller.js

import { Interview } from "../../models/Interview.model.js";
import { sheet_data_structure_worker } from "./sheet_data_structure.controller.js";

export const createInterview = async (req, res) => {
    try {
        const ownerId = req.user; // contains user id from middleware.
        const data = req.body;
        if (!data.candidateSheetId || !data.jobPosition)
            return res.status(400).json({ error: "Missing required fields" });

        console.log(data)

        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"

        const newInterview = await Interview.create({
            ...data,
            owner: ownerId,
            interviewUrl: 'none',
            status: "initial",
            logs: [
                {
                    message: "Interview record created successfully. Waiting for next phase.",
                    level: "success",
                },
            ]
        });

        const url = `${FRONTEND_URL}/${newInterview._id}/login`;

        newInterview.interviewUrl = url;
        await newInterview.save();

        // return
        console.log(`[INTERVIEW CREATED] ${newInterview._id} by ${ownerId}`);

        // ✅ kick off next worker asynchronously
        setTimeout(() => {
            sheet_data_structure_worker(newInterview._id);
        }, 1000); // small delay to avoid blocking response

        res.status(201).json({
            success: true,
            status: newInterview.status,
            data: {
                id: newInterview._id,
                url: newInterview.interviewUrl,
            },
            Interview: newInterview,
            message: "Interview created and queued for processing",
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