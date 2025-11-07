import mongoose from 'mongoose';

const APICounterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        default: 'geminiApiKeyIndex'
    },
    sequence: {
        type: Number,
        default: 0
    }
});

export const APICounter = mongoose.model('APICounter', APICounterSchema);