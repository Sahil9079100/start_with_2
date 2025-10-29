// server/models/SheetDataExtractJson.model.js

import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
    message: { type: String, required: true },
    level: { type: String, enum: ["info", "error", "success"], default: "info" },
    timestamp: { type: Date, default: Date.now },
});

const sheetDataExtractJsonSchema = new mongoose.Schema({
    interview: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Interview",
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Owner",
        required: true,
    },
    rows: {
        type: [Object], // Each row mapped using columnMapping
        default: [],
    },
    status: {
        type: String,
        enum: ["processing", "completed", "failed"],
        default: "processing",
    },
    logs: {
        type: [logSchema],
        default: [],
    },
}, { timestamps: true });

export default mongoose.model("SheetDataExtractJson", sheetDataExtractJsonSchema);
