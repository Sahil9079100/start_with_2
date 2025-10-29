// models/googleIntegration.model.js
import mongoose from "mongoose";

const GoogleIntegrationSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // recruiter/owner id
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
});

GoogleIntegrationSchema.index({ owner: 1, provider: 1 }, { unique: true });

export default mongoose.model("GoogleIntegration", GoogleIntegrationSchema);
