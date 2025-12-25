import mongoose from "mongoose";

const interviewDetailsSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Owner",
        required: true
    },
    launguage: { type: String, default: "English" },
    candidateSheetId: { type: String },
    jobPosition: { type: String, required: true },
    jobDescription: { type: String, required: true },
    useremail: {
        type: [String],
        required: true,
    },
    expiryDate: {
        type: Date,
    },
    interviewUrl: {
        type: String,
        unique: true
    },
    roleofai: {
        type: String,
        default: "You are a helpful assistant",
    },
    usercompleteintreviewemailandid: [{
        email: {
            type: String,
            required: true,
        },
        intreviewid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Intreview',
            required: true,
        }
    }],
    duration: {
        type: String,
    },
    minimumQualification: {
        type: String,
    },
    questions: {
        type: [String],
        default: []
    },
    minimumSkills: {
        type: String,
    },
    minimumExperience: { type: String },
    resumeCollected: {
        type: Number,
        default: 0,
    },
    reviewedCandidates: {
        type: Number,
        default: 0,
    },
    integrationType: {
        type: String,
        enum: ["GOOGLESHEET", "WORKDAY", "LOCALFILES", "GREENHOUSE"],
        default: "GOOGLESHEET"
    },
    integrationData: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: [
            "initial",
            "sheet_data_structure",
            "sheet_data_extract_json",
            "separate_resume_urls_and_save",
            "extract_text_from_resumeurl",
            "sort_resume_as_job_description",
            "waiting_for_recruiter",
            "send_email_to_candidates",
            "interview_successfully_processed",
            // Workday-specific statuses
            "workday_data_fetched",
            "workday_candidates_separated",
            "workday_ocr_complete",
            "workday_sorting_complete",
            // LocalFile-specific statuses
            "localfile_parsed",
            "localfile_candidates_separated",
            "localfile_ocr_complete",
            "localfile_sorting_complete"
        ],
        default: "initial",
    },
    currentStatus: {
        type: String,
        enum: [
            "CREATED",
            // GoogleSheet pipeline statuses
            "STRUCTURING",
            "EXTRACTING_SHEET",
            "RESUME_SEPARATION",
            "OCR",
            "SORTING",
            // Workday pipeline statuses
            "WD_FETCHING",
            "WD_SEPARATING",
            "WD_OCR",
            "WD_SORTING",
            // LocalFile pipeline statuses
            "LF_PARSING",
            "LF_SEPARATING",
            "LF_OCR",
            "LF_SORTING",
            // Common statuses
            "COMPLETED",
            "FAILED"
        ],
        default: "CREATED"
    },
    lastProcessedStep: {
        type: String,
        default: null
    },
    // Global retry counters used by the centralized retry engine
    retryCount: {
        type: Number,
        default: 0,
    },
    maxRetries: {
        type: Number,
        default: 3,
    },
    // Optional per-step attempt counters to avoid global counter collisions across steps
    stepAttempts: {
        type: Map,
        of: Number,
        default: {},
    },
    currentLimit: { type: Number, default: 25 },
    logs: [
        {
            message: String,
            level: { type: String, enum: ["info", "error", "success"], default: "info" },
            timestamp: { type: Date, default: Date.now },
        },
    ],
    isSingle: {
        type: Boolean,
        default: false
    },
    userlogs: [
        {
            message: String,
            level: { type: String, enum: ["INFO", "ERROR", "SUCCESS"], default: "INFO" },
            timestamp: { type: Date, default: Date.now },
            data: { type: mongoose.Schema.Types.Mixed }
        },
    ],
    sortedList: [
        {
            candidateId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Candidate",
            },
            matchLevel: { type: String },
            matchScore: { type: Number },
        },
    ],
    totalCandidates: { type: Number, default: 0 },
    isSheduled: { type: Boolean, default: false },
    processingPercentage: { type: Number, default: 0 },
    processingStep: { type: String, default: null },
    processingSubStep: { type: String, default: null }
},
    { timestamps: true }
);

export const Interview = mongoose.model(
    "Interview",
    interviewDetailsSchema
);





// import mongoose from "mongoose";

// const interviewSchema = new mongoose.Schema({
//     owner: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Owner",
//         required: true,
//     },
//     company: { type: String, default: "" },
//     launguage: { type: String, default: "English" },
//     candidateSheetId: { type: String, required: true },
//     jobPosition: { type: String, required: true },
//     jobDescription: { type: String, required: true },
//     duration: { type: String, required: true },
//     expiryDate: { type: Date, required: true },
//     minimumQualification: { type: String },
//     minimumSkillsRequired: { type: String },
//     questions: [{ type: String }],
//     interviewUrl: {
//         type: String,
//         unique: true,
//         required: true,
//     },
//     status: {//separate_resume_urls_and_save
//         type: String,
//         enum: ["initial", "sheet_data_structure", "sheet_data_extract_json", "separate_resume_urls_and_save", "extract_text_from_resumeurl", "sort_resume_as_job_description", "waiting_for_recruiter", "send_email_to_candidates", "interview_successfully_processed"],
//         default: "initial",
//     },
//     logs: [
//         {
//             message: String,
//             level: { type: String, enum: ["info", "error", "success"], default: "info" },
//             timestamp: { type: Date, default: Date.now },
//         },
//     ],
// }, { timestamps: true });

// const Interview = mongoose.model("Interview", interviewSchema);
// export default Interview;


// const url = "http://localhost:5000/interview/" + new_interview._id + "/login";
