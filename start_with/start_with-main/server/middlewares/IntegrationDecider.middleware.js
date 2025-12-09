import { tryCatch } from "bullmq";


export const INTEGRATIONS = {
    GOOGLESHEET: "og1ci0cNel9ZAMr02NAPq61CT8myVYBP",
    WORKDAY: "1otW6v71irL9DYOkKc4AcVAILNZsvsRM",
    LOCALFILES: "c4n3FfW6cK9amZ1ljCYFAKBdVlKtYlfR*",
    GREENHOUSE: "qpYffv0VJlDlXOJvsvHYWi07H7w9QyP2"
}


export const WORKER_INTEGRATIONS = [
    INTEGRATIONS.GOOGLESHEET,
    INTEGRATIONS.WORKDAY,
    INTEGRATIONS.LOCALFILES,
    INTEGRATIONS.GREENHOUSE
];

export const isWorkerIntegration = (integrationId) => {
    return WORKER_INTEGRATIONS.includes(integrationId);
}
export const isGoogleSheetIntegration = (integrationId) => {
    return integrationId === INTEGRATIONS.GOOGLESHEET;
}
export const isLocalFilesIntegration = (integrationId) => {
    return integrationId === INTEGRATIONS.LOCALFILES;
}
export const isWorkdayIntegration = (integrationId) => {
    return integrationId === INTEGRATIONS.WORKDAY;
}
export const isGreenhouseIntegration = (integrationId) => {
    return integrationId === INTEGRATIONS.GREENHOUSE;
}
// export const decideIntegrationWorker = (integrationId) => {
//     if (isGoogleSheetIntegration(integrationId)) {
//         return "GoogleSheetIntegrationWorker";
//     } else if (isLocalFilesIntegration(integrationId)) {
//         return "LocalFilesIntegrationWorker";
//     } else if (isWorkdayIntegration(integrationId)) {
//         return "WorkdayIntegrationWorker";
//     } else if (isGreenhouseIntegration(integrationId)) {
//         return "GreenhouseIntegrationWorker";
//     } else {
//         return null;
//     }
// }

export const integrationDecider = (req, res, next) => {
    try {
        const data = req.body;
        console.log("IntegrationDecider middleware called with data:", data);

        if (!data.iObj || !data.iObj.iId) {
            return res.status(400).json({ success: false, message: "Integration ID (iId) is missing in request body" });
        }

        const integrationId = data.iObj.iId;
        console.log("Decided integration ID:", integrationId);

        if (integrationId === INTEGRATIONS.GOOGLESHEET) {
            console.log("GoogleSheet integration selected");
        }
        if (integrationId === INTEGRATIONS.WORKDAY) {
            console.log("Workday integration selected");
        }
        if (integrationId === INTEGRATIONS.LOCALFILES) {
            console.log("LocalFiles integration selected");
        }
        if (integrationId === INTEGRATIONS.GREENHOUSE) {
            console.log("Greenhouse integration selected");
        }
        res.status(200).json({ success: true, message: "IntegrationDecider middleware reached successfully" });
    } catch (error) {
        console.error("Error in IntegrationDecider middleware:", error);
        return res.status(500).json({ success: false, message: "Internal server error in IntegrationDecider middleware" });
    }
}