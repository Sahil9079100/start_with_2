// socket/index.js
import { Server } from "socket.io";
import authSocket from "./middleware/authSocket.js";
import { addLiveSession, removeLiveSession, clearAllLiveSessions } from "../utils/liveSessionTracker.js";

let io; // we'll export this later for other modules to use

export function initSocket(server) {
    console.log("In the socket", process.env.FRONTEND_URL)
    io = new Server(server, {
        cors: {
            origin: [`${process.env.FRONTEND_URL}`, 'http://localhost:5173', 'https://60f01cb99d34.ngrok-free.app', 'https://coruscating-crumble-6992a8.netlify.app'],
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // Clear all live sessions on server startup to ensure clean state
    clearAllLiveSessions().then(() => {
        console.log("[LIVE SESSION] Cleared all previous live sessions on server startup");
    }).catch(err => {
        console.error("[LIVE SESSION] Failed to clear live sessions on startup:", err.message);
    });

    // Apply middleware for authentication
    io.use(authSocket);

    // Handle connections
    io.on("connection", async (socket) => {
        const ownerId = socket.user?.id;
        const ownerEmail = socket.user?.email;

        console.log("Socket connected:", socket.id, "User:", ownerEmail || ownerId);

        if (!ownerId) {
            console.error("No owner ID found for socket:", socket.id);
            socket.disconnect(true);
            return;
        }

        const ownerRoom = `owner:${ownerId}`;
        socket.join(ownerRoom);
        console.log(`Joined owner room: ${ownerRoom}`);

        // Get client IP address for fallback location
        const clientIP = socket.handshake.headers['x-forwarded-for']?.split(',')[0].trim() 
            || socket.handshake.address 
            || "";

        // Wait for client to send session info (device/location)
        // The client will emit this shortly after connecting
        let sessionInfoReceived = false;
        
        // Set a timeout - if client doesn't send session info within 5 seconds, 
        // register with basic info
        const sessionTimeout = setTimeout(async () => {
            if (!sessionInfoReceived) {
                console.log(`[LiveSession] No session info received from ${socket.id}, registering with basic info`);
                await addLiveSession(socket.id, ownerId, {
                    deviceString: "Unknown Device",
                    locationString: "Location Not Provided",
                    ipAddress: clientIP,
                    userAgent: socket.handshake.headers['user-agent'] || ""
                });
            }
        }, 5000);

        // Handle session info from client
        socket.on("SESSION_INFO", async (sessionInfo) => {
            if (sessionInfoReceived) return; // Prevent duplicate registrations
            sessionInfoReceived = true;
            clearTimeout(sessionTimeout);
            
            console.log(`[LiveSession] Received session info from ${socket.id}:`, {
                device: sessionInfo.deviceString,
                location: sessionInfo.locationString
            });
            
            // Track this live session in Redis with full info
            await addLiveSession(socket.id, ownerId, {
                ...sessionInfo,
                ipAddress: clientIP,
                userAgent: socket.handshake.headers['user-agent'] || sessionInfo.userAgent || ""
            });
        });

        console.log("-----------------------------------------------------------------------");

        // Example event handler
        socket.on("test:send", (data) => {
            console.log("Received test:send:", data);
            socket.emit("test:receive", { msg: "Got your message!" });
        });

        // Handle manual request for live session count
        socket.on("GET_LIVE_SESSION_COUNT", async () => {
            const { emitLiveCountToOwner } = await import("../utils/liveSessionTracker.js");
            await emitLiveCountToOwner(ownerId);
        });

        socket.on("disconnect", async (reason) => {
            console.log("Socket disconnected:", socket.id, "Reason:", reason);
            clearTimeout(sessionTimeout);

            // Remove this session from Redis and emit updated count to remaining sockets
            await removeLiveSession(socket.id);

            console.log("-----------------------------------------------------------------------");
        });
    });

    console.log("Socket.io initialized successfully");
    return io;
}

// Helper to get io instance anywhere in your backend
export function getIO() {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
}
