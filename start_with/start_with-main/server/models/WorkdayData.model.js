/**
 * Workday Data Model
 * 
 * Stores the raw data fetched from Workday RaaS API and tracks processing status.
 * This is similar to SheetDataExtractJson but for Workday integration.
 */

import mongoose from "mongoose";

const workdayDataSchema = new mongoose.Schema({
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
    
    // Workday RaaS URL used to fetch data
    raasUrl: {
        type: String,
        required: true
    },
    
    // Raw data from Workday (array of Report_Entry objects)
    rawData: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    
    // Parsed/normalized candidate entries
    entries: [{
        // Original Workday ID
        workdayId: { type: String },
        // Candidate name
        name: { type: String },
        // Email address
        email: { type: String },
        // Resume URL from Workday
        resumeUrl: { type: String },
        // Phone number
        phone: { type: String },
        // Job application details
        jobApplication: {
            position: { type: String },
            appliedDate: { type: Date },
            status: { type: String }
        },
        // Any additional dynamic fields from Workday
        dynamicData: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }],
    
    // Column/field mapping discovered from Workday data
    fieldMapping: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Processing status
    status: {
        type: String,
        enum: ["pending", "fetching", "processing", "completed", "failed"],
        default: "pending"
    },
    
    // Error message if status is failed
    errorMessage: {
        type: String,
        default: null
    },
    
    // Statistics
    totalEntriesFetched: {
        type: Number,
        default: 0
    },
    totalCandidatesSaved: {
        type: Number,
        default: 0
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
workdayDataSchema.index({ interview: 1, status: 1 });
workdayDataSchema.index({ owner: 1 });

export const WorkdayData = mongoose.model("WorkdayData", workdayDataSchema);
