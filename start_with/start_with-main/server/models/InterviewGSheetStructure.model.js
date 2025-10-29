// server/models/InterviewGSheetStructure.model.js
import mongoose from "mongoose";

const InterviewGSheetStructureSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Owner",
            required: true,
        },

        interview: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Interview",
            required: true,
            unique: true,
        },

        candidateSheetId: {
            type: String,
            required: true,
        },

        rawSampleData: {
            type: Array, // top 3–5 rows fetched from sheet
            default: [],
        },

        columnMapping: {
            type: Object, // e.g. { A1: "Name", B1: "Resume URL", C1: "Email" }
            default: {},
        },

        aiAgentUsed: {
            type: String,
            default: "sheet_structure_finder_agent",
        },

        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },

        logs: [
            {
                message: String,
                level: {
                    type: String,
                    enum: ["info", "error", "success"],
                    default: "info",
                },
                timestamp: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.model("InterviewGSheetStructure", InterviewGSheetStructureSchema);
