// a basic Owner schema with all the personal details and it has the "company" field of which he is the owner
import mongoose from "mongoose";

const ownerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        // required: true
    },
    company: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    }],
    companyName: {
        type: String,
    },
    companyImage: {
        type: String,
        default: ""
    },
    recrutier: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    }],
    password: {
        type: String,
        required: true
    },
    secretKey: {
        type: String,
        // required: true
    },
    googleSheetsConnected: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Owner = mongoose.model("Owner", ownerSchema);

export default Owner;

/**
 * name
 * email
 * phone
 * company [{each company _id form company collection}]
 * recrutier [{all companies recrutier}]
 * password
 * secretKey (for extra security during login, so that only those who have the secret key can login)
 * 
 */