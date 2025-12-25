import mongoose from "mongoose";

const integrationsSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Owner",
        required: true,
        index: true,
        unique: true
    },
    allIntegration: {
        gsheets: {
            provider: { type: String, default: "google" },
            tokens: {
                access_token: String,
                refresh_token: String,
                scope: String,
                token_type: String,
                expiry_date: Number, // ms epoch
            },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now },
        },
        workday: {
            provider: { type: String, default: "workday" },
            tokens: {
                username: String,
                password: String,
            },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now },
        },
        greenhouse: {},
    }
},
    { timestamps: true }
);

export default mongoose.model(
    "Integrations",
    integrationsSchema
);