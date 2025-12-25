/**
 * LocalFile Data Model
 * 
 * Stores the raw data parsed from CSV/XLSX files and tracks processing status.
 * This is similar to WorkdayData but for LocalFile integration.
 */

import mongoose from "mongoose";

const localFileDataSchema = new mongoose.Schema({
    // Reference to the interview
    interview: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Interview",
        required: true,
        index: true
    },
    
    // Reference to the owner
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Owner",
        required: true
    },
    
    // Original file name
    originalFileName: {
        type: String,
        required: true
    },
    
    // File type (csv or xlsx)
    fileType: {
        type: String,
        enum: ["csv", "xlsx", "xls"],
        required: true
    },
    
    // Path to the file on server (temporary)
    serverFilePath: {
        type: String,
        default: null
    },
    
    // Raw data from file (array of row objects)
    rawData: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    
    // Headers/columns from the file
    headers: [{
        type: String
    }],
    
    // Parsed/normalized candidate entries
    entries: [{
        // Row index from original file
        rowIndex: { type: Number },
        // Candidate name
        name: { type: String },
        // Email address
        email: { type: String },
        // Resume URL from file
        resumeUrl: { type: String },
        // Phone number
        phone: { type: String },
        // Any additional dynamic fields from file
        dynamicData: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }],
    
    // Column/field mapping discovered from file
    fieldMapping: {
        nameColumn: { type: String, default: null },
        emailColumn: { type: String, default: null },
        resumeUrlColumn: { type: String, default: null },
        phoneColumn: { type: String, default: null },
        dynamicColumns: [{ type: String }]
    },
    
    // Processing status
    status: {
        type: String,
        enum: ["pending", "parsing", "processing", "completed", "failed"],
        default: "pending"
    },
    
    // Error message if status is failed
    errorMessage: {
        type: String,
        default: null
    },
    
    // Statistics
    totalRowsParsed: {
        type: Number,
        default: 0
    },
    totalCandidatesSaved: {
        type: Number,
        default: 0
    },
    
    // Whether to cleanup file after processing
    cleanupFile: {
        type: Boolean,
        default: true
    },
    
    // Processing logs
    logs: [{
        message: { type: String },
        level: { 
            type: String, 
            enum: ["info", "success", "warning", "error"], 
            default: "info" 
        },
        timestamp: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Indexes for faster queries
localFileDataSchema.index({ interview: 1, status: 1 });
localFileDataSchema.index({ owner: 1 });

export const LocalFileData = mongoose.model("LocalFileData", localFileDataSchema);
