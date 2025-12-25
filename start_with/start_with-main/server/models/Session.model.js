// models/Session.model.js
import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Owner",
        required: true,
        index: true
    },
    socketId: {
        type: String,
        required: true
    },
    // Device Information
    deviceType: {
        type: String, // "mobile", "tablet", "desktop"
        default: "unknown"
    },
    browser: {
        type: String, // "Chrome", "Safari", "Firefox", etc.
        default: "unknown"
    },
    browserVersion: {
        type: String,
        default: ""
    },
    os: {
        type: String, // "Windows", "macOS", "Linux", "iOS", "Android"
        default: "unknown"
    },
    osVersion: {
        type: String,
        default: ""
    },
    // Combined device string for display (e.g., "Chrome on macOS")
    deviceString: {
        type: String,
        default: "Unknown Device"
    },
    // Location Information
    location: {
        city: {
            type: String,
            default: ""
        },
        region: {
            type: String, // State/Province
            default: ""
        },
        country: {
            type: String,
            default: ""
        },
        countryCode: {
            type: String,
            default: ""
        },
        latitude: {
            type: Number,
            default: null
        },
        longitude: {
            type: Number,
            default: null
        },
        timezone: {
            type: String,
            default: ""
        }
    },
    // Combined location string for display (e.g., "New York, US")
    locationString: {
        type: String,
        default: "Location Not Provided"
    },
    locationPermissionGranted: {
        type: Boolean,
        default: false
    },
    // IP Address (useful for fallback location detection)
    ipAddress: {
        type: String,
        default: ""
    },
    // Session timing
    connectedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    disconnectedAt: {
        type: Date,
        default: null
    },
    // Session duration in milliseconds (calculated on disconnect)
    duration: {
        type: Number,
        default: null
    },
    // Is this session currently active?
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    // User Agent string (raw)
    userAgent: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

// Index for efficient queries
sessionSchema.index({ owner: 1, connectedAt: -1 });
sessionSchema.index({ owner: 1, isActive: 1 });

// Static method to get active sessions for an owner
sessionSchema.statics.getActiveSessions = function(ownerId) {
    return this.find({ owner: ownerId, isActive: true }).sort({ connectedAt: -1 });
};

// Static method to get session history for an owner (paginated)
sessionSchema.statics.getSessionHistory = function(ownerId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.find({ owner: ownerId })
        .sort({ connectedAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Static method to mark a session as disconnected
sessionSchema.statics.markDisconnected = async function(socketId) {
    const session = await this.findOne({ socketId, isActive: true });
    if (session) {
        session.disconnectedAt = new Date();
        session.duration = session.disconnectedAt - session.connectedAt;
        session.isActive = false;
        await session.save();
        return session;
    }
    return null;
};

// Instance method to format session for frontend display
sessionSchema.methods.toDisplayFormat = function() {
    return {
        id: this._id,
        socketId: this.socketId,
        deviceString: this.deviceString,
        locationString: this.locationString,
        connectedAt: this.connectedAt,
        disconnectedAt: this.disconnectedAt,
        duration: this.duration,
        isActive: this.isActive,
        deviceType: this.deviceType,
        browser: this.browser,
        os: this.os,
        location: {
            city: this.location.city,
            country: this.location.country,
            countryCode: this.location.countryCode
        }
    };
};

export const Session = mongoose.model("Session", sessionSchema);
