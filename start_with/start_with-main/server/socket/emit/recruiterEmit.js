// Socket/emit/recruiterEmit.js
import { getIO } from "../index.js";
import { Interview } from "../../models/Interview.model.js";

/**
 * Emit data to a specific recruiter’s room
 * @param {string} ownerid - The Owner ID
 * @param {string} event - Socket event name (e.g. "INTERVIEW_PROGRESS_LOG")
 * @param {object} data - The payload to send (should include interviewId, level, step)
 */
export default async function recruiterEmit(ownerid, event, data = {}) {
    try {
        const io = getIO();

        // Example: emit to a recruiter room
        const room = `owner:${ownerid}`;

        io.to(room).emit(event, data);

        // console.log(`📡 [Socket Emit] → Room: ${room} | Event: ${event}`);

        if (data?.interview) {
            const userLogData = {
                message: data.step || "NO_STEP_PROVIDED",
                level: data.level?.toUpperCase() || "NONE",
                timestamp: new Date(),
            };

            await Interview.findByIdAndUpdate(
                data.interview,
                { $push: { userlogs: userLogData } },
                { new: true }
            );
        }
        else {
            console.log("⚠️ recruiterEmit called without interview ID in data");
        }
    } catch (err) {
        console.error("❌ recruiterEmit failed:", err.message);
    }
}
