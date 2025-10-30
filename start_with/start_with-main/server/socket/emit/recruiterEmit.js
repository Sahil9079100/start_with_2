// Socket/emit/recruiterEmit.js
import { getIO } from "../index.js";

/**
 * Emit data to a specific recruiter’s room
 * @param {string} ownerid - The interview ID or unique process ID
 * @param {string} event - The socket event name (e.g. "sort_status")
 * @param {object} data - The payload to send
 */
export default async function recruiterEmit(ownerid, event, data = {}) {
    try {
        const io = getIO();

        // Example: emit to a recruiter room
        const room = `owner:${ownerid}`;

        io.to(room).emit(event, data);

        console.log(`📡 [Socket Emit] → Room: ${room} | Event: ${event}`);
    } catch (err) {
        console.error("❌ recruiterEmit failed:", err.message);
    }
}
