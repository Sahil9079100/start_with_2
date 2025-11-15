import { Candidate } from "../models/Candidate.model.js";
import recruiterEmit from "../socket/emit/recruiterEmit.js";

export const _WEBHOOK_EmailStatus = async (req, res) => {
    try {
        const { ownerId, roomId, interviewId, candidateId, data } = req.body;

        console.log("Webhook Email Status Received:", req.body);


        // if (global.io && roomId) {
        //     global.io.to(roomId).emit("INTERVIEW_PROGRESS_LOG", {
        //         interview: interviewId,
        //         step: data.message || "Email status update",
        //         data: { emailStatus: data.emailStatus }
        //     });
        // }

        const findCandidate = await Candidate.findById(candidateId);
        if (findCandidate) {
            findCandidate.emailStatus = 'NONE'
            await findCandidate.save();
        }

        findCandidate.emailStatus = 'SUCCESS';

        await recruiterEmit(ownerId, "EMAIL_SUCCESS_PROGRESS_LOG", {
            interview: interviewId,
            level: "SUCCESS",
            step: `Email sent successfully for candidate : ${candidateId}`,
            data: {
                ownerId,
                interviewId,
                roomId,
                candidateId,
                data
            }
        });

        res.status(200).json({ message: "Webhook received successfully" });

    } catch (error) {
        console.log("webhook email status error", error);
        res.status(500).json({ message: "Webhook processing failed" });
    }
}
