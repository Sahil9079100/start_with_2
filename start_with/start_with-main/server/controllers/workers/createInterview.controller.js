// server/controllers/workers/createInterview.controller.js

// import { schedule } from "node-cron";
import { Interview } from "../../models/Interview.model.js";
import { sheet_data_structure_worker } from "./sheet_data_structure.controller.js";

export const createInterview = async (req, res) => {
    try {
        const ownerId = req.user; // contains user id from middleware.
        const data = req.body;
        console.log(ownerId)
        console.log(req.body)
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