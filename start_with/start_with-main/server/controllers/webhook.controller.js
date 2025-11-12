export const _WEBHOOK_EmailStatus = async (req, res) => {
    try {
        const { ownerId, roomId, interviewId, data } = req.body;

        console.log("Webhook Email Status Received:", req.body);

        
        if (global.io && roomId) {
            global.io.to(roomId).emit("INTERVIEW_PROGRESS_LOG", {
                interview: interviewId,
                step: data.message || "Email status update",
                data: { emailStatus: data.emailStatus }
            });
        }

        res.status(200).json({ message: "Webhook received successfully" });

    } catch (error) {
        console.log("webhook email status error", error);
        res.status(500).json({ message: "Webhook processing failed" });
    }
}
