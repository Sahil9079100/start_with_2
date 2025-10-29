// socket/middleware/authSocket.js
import jwt from "jsonwebtoken";

export default async function authSocket(socket, next) {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            console.log("❌ No token provided in socket handshake");
            return next(new Error("Authentication error: No token"));
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach decoded user to socket for future use
        socket.user = decoded;

        console.log("🔐 Socket authenticated:", socket.user.email || socket.user.id);
        next();
    } catch (err) {
        console.error("❌ Socket auth failed:", err.message);
        next(new Error("Authentication error: Invalid token"));
    }
}
