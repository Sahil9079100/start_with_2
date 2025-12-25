// utils/liveSessionTracker.js
import IORedis from "ioredis";
import { getIO } from "../socket/index.js";
import { Session } from "../models/Session.model.js";

// Redis connection (reuse same config as queues)
const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

// Create a dedicated Redis client for live session tracking
const redis = new IORedis(redisPort, redisHost, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on("error", (err) => {
    console.error("[REDIS] Redis (liveSessionTracker) error:", err.message);
});

redis.on("connect", () => {
    console.log("[REDIS] Redis (liveSessionTracker) connected");
});

// Redis key patterns
const LIVE_SESSIONS_KEY = "live:sessions"; // Hash: socketId -> JSON{ownerId, sessionData}
const OWNER_SOCKETS_PREFIX = "live:owner:"; // Set per owner: owner:{ownerId} -> [socketIds]

/**
 * Add a socket connection to the live session tracker
 * @param {string} socketId - The socket ID
 * @param {string} ownerId - The owner's MongoDB ID
 * @param {Object} sessionInfo - Additional session info (device, location, etc.)
 */
export async function addLiveSession(socketId, ownerId, sessionInfo = {}) {
    try {
        const connectedAt = new Date().toISOString();
        
        const sessionData = JSON.stringify({
            ownerId,
            connectedAt,
            // Device info
            deviceType: sessionInfo.deviceType || "unknown",
            browser: sessionInfo.browser || "unknown",
            browserVersion: sessionInfo.browserVersion || "",
            os: sessionInfo.os || "unknown",
            osVersion: sessionInfo.osVersion || "",
            deviceString: sessionInfo.deviceString || "Unknown Device",
            userAgent: sessionInfo.userAgent || "",
            // Location info
            location: sessionInfo.location || {},
            locationString: sessionInfo.locationString || "Location Not Provided",
            locationPermissionGranted: sessionInfo.locationPermissionGranted || false,
            ipAddress: sessionInfo.ipAddress || ""
        });

        // Use pipeline for atomic operations
        const pipeline = redis.pipeline();

        // Add to global sessions hash
        pipeline.hset(LIVE_SESSIONS_KEY, socketId, sessionData);

        // Add socket to owner's set
        pipeline.sadd(`${OWNER_SOCKETS_PREFIX}${ownerId}`, socketId);

        await pipeline.exec();

        console.log(`[LiveSession] Added: socketId=${socketId}, ownerId=${ownerId}, device=${sessionInfo.deviceString || 'unknown'}`);

        // Save session to database for history
        try {
            const dbSession = new Session({
                owner: ownerId,
                socketId,
                deviceType: sessionInfo.deviceType || "unknown",
                browser: sessionInfo.browser || "unknown",
                browserVersion: sessionInfo.browserVersion || "",
                os: sessionInfo.os || "unknown",
                osVersion: sessionInfo.osVersion || "",
                deviceString: sessionInfo.deviceString || "Unknown Device",
                location: sessionInfo.location || {},
                locationString: sessionInfo.locationString || "Location Not Provided",
                locationPermissionGranted: sessionInfo.locationPermissionGranted || false,
                ipAddress: sessionInfo.ipAddress || "",
                userAgent: sessionInfo.userAgent || "",
                connectedAt: new Date(connectedAt),
                isActive: true
            });
            await dbSession.save();
            console.log(`[LiveSession] Saved to DB: sessionId=${dbSession._id}`);
        } catch (dbErr) {
            console.error("[LiveSession] Error saving session to DB:", dbErr.message);
        }

        // Emit updated count to the owner's room
        await emitLiveCountToOwner(ownerId);

        return true;
    } catch (err) {
        console.error("[LiveSession] Error adding session:", err.message);
        return false;
    }
}

/**
 * Remove a socket connection from the live session tracker
 * @param {string} socketId - The socket ID
 */
export async function removeLiveSession(socketId) {
    try {
        // First, get the session data to find the ownerId
        const sessionDataStr = await redis.hget(LIVE_SESSIONS_KEY, socketId);

        if (!sessionDataStr) {
            console.log(`[LiveSession] Socket ${socketId} not found in sessions`);
            return false;
        }

        const sessionData = JSON.parse(sessionDataStr);
        const { ownerId } = sessionData;

        // Use pipeline for atomic operations
        const pipeline = redis.pipeline();

        // Remove from global sessions hash
        pipeline.hdel(LIVE_SESSIONS_KEY, socketId);

        // Remove socket from owner's set
        pipeline.srem(`${OWNER_SOCKETS_PREFIX}${ownerId}`, socketId);

        await pipeline.exec();

        console.log(`[LiveSession] Removed: socketId=${socketId}, ownerId=${ownerId}`);

        // Update database session as disconnected
        try {
            await Session.markDisconnected(socketId);
            console.log(`[LiveSession] Marked as disconnected in DB: socketId=${socketId}`);
        } catch (dbErr) {
            console.error("[LiveSession] Error updating session in DB:", dbErr.message);
        }

        // Emit updated count to the owner's room
        await emitLiveCountToOwner(ownerId);

        return true;
    } catch (err) {
        console.error("[LiveSession] Error removing session:", err.message);
        return false;
    }
}

/**
 * Get the count of live sessions for a specific owner
 * @param {string} ownerId - The owner's MongoDB ID
 * @returns {Promise<number>} - The count of live sessions
 */
export async function getLiveSessionCount(ownerId) {
    try {
        const count = await redis.scard(`${OWNER_SOCKETS_PREFIX}${ownerId}`);
        return count;
    } catch (err) {
        console.error("[LiveSession] Error getting session count:", err.message);
        return 0;
    }
}

/**
 * Get all socket IDs for a specific owner
 * @param {string} ownerId - The owner's MongoDB ID
 * @returns {Promise<string[]>} - Array of socket IDs
 */
export async function getOwnerSocketIds(ownerId) {
    try {
        const socketIds = await redis.smembers(`${OWNER_SOCKETS_PREFIX}${ownerId}`);
        return socketIds;
    } catch (err) {
        console.error("[LiveSession] Error getting owner socket IDs:", err.message);
        return [];
    }
}

/**
 * Get detailed live session info for a specific owner
 * @param {string} ownerId - The owner's MongoDB ID
 * @returns {Promise<Object[]>} - Array of session objects with full details
 */
export async function getOwnerLiveSessions(ownerId) {
    try {
        const socketIds = await redis.smembers(`${OWNER_SOCKETS_PREFIX}${ownerId}`);

        if (socketIds.length === 0) {
            return [];
        }

        // Get session data for all sockets
        const sessionsData = await redis.hmget(LIVE_SESSIONS_KEY, ...socketIds);

        const sessions = socketIds.map((socketId, index) => {
            const dataStr = sessionsData[index];
            if (dataStr) {
                const data = JSON.parse(dataStr);
                return {
                    socketId,
                    connectedAt: data.connectedAt,
                    deviceType: data.deviceType || "unknown",
                    browser: data.browser || "unknown",
                    browserVersion: data.browserVersion || "",
                    os: data.os || "unknown",
                    osVersion: data.osVersion || "",
                    deviceString: data.deviceString || "Unknown Device",
                    location: data.location || {},
                    locationString: data.locationString || "Location Not Provided",
                    locationPermissionGranted: data.locationPermissionGranted || false
                };
            }
            return null;
        }).filter(session => session !== null);

        return sessions;
    } catch (err) {
        console.error("[LiveSession] Error getting owner live sessions:", err.message);
        return [];
    }
}

/**
 * Get all live sessions grouped by owner
 * @returns {Promise<Object>} - Object with ownerIds as keys and session arrays as values
 */
export async function getAllLiveSessionsGrouped() {
    try {
        // Get all sessions from the hash
        const allSessions = await redis.hgetall(LIVE_SESSIONS_KEY);

        const grouped = {};

        for (const [socketId, sessionDataStr] of Object.entries(allSessions)) {
            const sessionData = JSON.parse(sessionDataStr);
            const { ownerId, connectedAt } = sessionData;

            if (!grouped[ownerId]) {
                grouped[ownerId] = [];
            }

            grouped[ownerId].push({
                socketId,
                connectedAt,
            });
        }

        return grouped;
    } catch (err) {
        console.error("[LiveSession] Error getting all grouped sessions:", err.message);
        return {};
    }
}

/**
 * Get total count of all live sessions
 * @returns {Promise<number>} - Total count of all live sessions
 */
export async function getTotalLiveSessionCount() {
    try {
        const count = await redis.hlen(LIVE_SESSIONS_KEY);
        return count;
    } catch (err) {
        console.error("[LiveSession] Error getting total session count:", err.message);
        return 0;
    }
}

/**
 * Emit live session count to a specific owner's room
 * @param {string} ownerId - The owner's MongoDB ID
 */
export async function emitLiveCountToOwner(ownerId) {
    try {
        const io = getIO();
        const count = await getLiveSessionCount(ownerId);
        const sessions = await getOwnerLiveSessions(ownerId);

        const room = `owner:${ownerId}`;

        io.to(room).emit("LIVE_SESSION_COUNT", {
            count,
            sessions,
            ownerId,
            timestamp: new Date().toISOString(),
        });

        console.log(`[LiveSession] Emitted count=${count} to room=${room}`);
    } catch (err) {
        console.error("[LiveSession] Error emitting live count:", err.message);
    }
}

/**
 * Emit live session count to all owners who have active sessions
 * Useful for periodic updates or admin views
 */
export async function emitLiveCountToAllOwners() {
    try {
        const grouped = await getAllLiveSessionsGrouped();

        for (const ownerId of Object.keys(grouped)) {
            await emitLiveCountToOwner(ownerId);
        }
    } catch (err) {
        console.error("[LiveSession] Error emitting to all owners:", err.message);
    }
}

/**
 * Clean up stale sessions (for cases where disconnect wasn't properly handled)
 * This should be called periodically or on server startup
 * @param {number} maxAgeMinutes - Maximum age in minutes before a session is considered stale
 */
export async function cleanupStaleSessions(maxAgeMinutes = 60) {
    try {
        const allSessions = await redis.hgetall(LIVE_SESSIONS_KEY);
        const now = new Date();
        const affectedOwners = new Set();

        for (const [socketId, sessionDataStr] of Object.entries(allSessions)) {
            const sessionData = JSON.parse(sessionDataStr);
            const connectedAt = new Date(sessionData.connectedAt);
            const ageMinutes = (now - connectedAt) / (1000 * 60);

            if (ageMinutes > maxAgeMinutes) {
                // Check if socket is actually connected
                try {
                    const io = getIO();
                    const socket = io.sockets.sockets.get(socketId);

                    if (!socket || !socket.connected) {
                        // Socket is not connected, remove from Redis
                        const pipeline = redis.pipeline();
                        pipeline.hdel(LIVE_SESSIONS_KEY, socketId);
                        pipeline.srem(`${OWNER_SOCKETS_PREFIX}${sessionData.ownerId}`, socketId);
                        await pipeline.exec();

                        affectedOwners.add(sessionData.ownerId);
                        console.log(`[LiveSession] Cleaned up stale session: ${socketId}`);
                    }
                } catch (e) {
                    // If we can't check socket status, still try to clean based on age
                    console.warn(`[LiveSession] Could not verify socket ${socketId}, skipping cleanup`);
                }
            }
        }

        // Emit updated counts to affected owners
        for (const ownerId of affectedOwners) {
            await emitLiveCountToOwner(ownerId);
        }

        return affectedOwners.size;
    } catch (err) {
        console.error("[LiveSession] Error cleaning up stale sessions:", err.message);
        return 0;
    }
}

/**
 * Clear all live sessions (useful for server restarts)
 */
export async function clearAllLiveSessions() {
    try {
        // Get all owner keys
        const keys = await redis.keys(`${OWNER_SOCKETS_PREFIX}*`);

        const pipeline = redis.pipeline();

        // Delete the main sessions hash
        pipeline.del(LIVE_SESSIONS_KEY);

        // Delete all owner-specific sets
        for (const key of keys) {
            pipeline.del(key);
        }

        await pipeline.exec();

        console.log("[LiveSession] Cleared all live sessions");
        return true;
    } catch (err) {
        console.error("[LiveSession] Error clearing all sessions:", err.message);
        return false;
    }
}

/**
 * Get session history for an owner from the database
 * @param {string} ownerId - The owner's MongoDB ID
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Number of sessions per page
 * @returns {Promise<Object>} - { sessions, total, page, limit, totalPages }
 */
export async function getSessionHistory(ownerId, page = 1, limit = 20) {
    try {
        const skip = (page - 1) * limit;
        
        const [sessions, total] = await Promise.all([
            Session.find({ owner: ownerId })
                .sort({ connectedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Session.countDocuments({ owner: ownerId })
        ]);
        
        const formattedSessions = sessions.map(session => ({
            id: session._id,
            socketId: session.socketId,
            deviceType: session.deviceType,
            browser: session.browser,
            os: session.os,
            deviceString: session.deviceString,
            locationString: session.locationString,
            location: {
                city: session.location?.city || "",
                country: session.location?.country || "",
                countryCode: session.location?.countryCode || ""
            },
            connectedAt: session.connectedAt,
            disconnectedAt: session.disconnectedAt,
            duration: session.duration,
            isActive: session.isActive
        }));
        
        return {
            sessions: formattedSessions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    } catch (err) {
        console.error("[LiveSession] Error getting session history:", err.message);
        return {
            sessions: [],
            total: 0,
            page,
            limit,
            totalPages: 0
        };
    }
}

// Export the Redis client and Session model for external use if needed
export { redis as liveSessionRedis, Session };
