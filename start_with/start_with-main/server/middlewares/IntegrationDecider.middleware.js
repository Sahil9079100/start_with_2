/**
 * Integration Decider Middleware
 * 
 * This middleware decides which integration pipeline to use based on the integration ID.
 * Supports: GOOGLESHEET, WORKDAY, LOCALFILES, GREENHOUSE
 * 
 * The middleware sets req.integrationConfig which contains:
 * - integrationType: The type of integration (e.g., "GOOGLESHEET", "WORKDAY")
 * - integrationId: The integration ID
 * - integrationData: Additional integration-specific data (e.g., RaaS URL for Workday)
 */

export const INTEGRATIONS = {
    GOOGLESHEET: "og1ci0cNel9ZAMr02NAPq61CT8myVYBP",
    WORKDAY: "1otW6v71irL9DYOkKc4AcVAILNZsvsRM",
    LOCALFILES: "c4n3FfW6cK9amZ1ljCYFAKBdVlKtYlfR*",
    GREENHOUSE: "qpYffv0VJlDlXOJvsvHYWi07H7w9QyP2"
};

// Human-readable integration type names
export const INTEGRATION_TYPES = {
    [INTEGRATIONS.GOOGLESHEET]: "GOOGLESHEET",
    [INTEGRATIONS.WORKDAY]: "WORKDAY",
    [INTEGRATIONS.LOCALFILES]: "LOCALFILES",
    [INTEGRATIONS.GREENHOUSE]: "GREENHOUSE"
};

export const WORKER_INTEGRATIONS = [
    INTEGRATIONS.GOOGLESHEET,
    INTEGRATIONS.WORKDAY,
    INTEGRATIONS.LOCALFILES,
    INTEGRATIONS.GREENHOUSE
];

export const isWorkerIntegration = (integrationId) => {
    return WORKER_INTEGRATIONS.includes(integrationId);
};

export const isGoogleSheetIntegration = (integrationId) => {
    return integrationId === INTEGRATIONS.GOOGLESHEET;
};

export const isLocalFilesIntegration = (integrationId) => {
    return integrationId === INTEGRATIONS.LOCALFILES;
};

export const isWorkdayIntegration = (integrationId) => {
    return integrationId === INTEGRATIONS.WORKDAY;
};

export const isGreenhouseIntegration = (integrationId) => {
    return integrationId === INTEGRATIONS.GREENHOUSE;
};

/**
 * Get integration type name from integration ID
 * @param {string} integrationId 
 * @returns {string|null} Integration type name or null if not found
 */
export const getIntegrationType = (integrationId) => {
    return INTEGRATION_TYPES[integrationId] || null;
};

/**
 * Middleware to decide which integration to use
 * Sets req.integrationConfig for downstream handlers
 */
export const integrationDecider = (req, res, next) => {
    try {
        const data = req.body;
        console.log("IntegrationDecider middleware called with data:", data);

        // res.status(200).json({ success: true, message: "IntegrationDecider middleware reached" });
        // return;

        // Check if iObj exists - if not, default to GOOGLESHEET for backward compatibility 
        if (!data.iObj || !data.iObj.iId) {
            console.log("No integration object found, defaulting to GOOGLESHEET integration");
            req.integrationConfig = {
                integrationType: "GOOGLESHEET",
                integrationId: INTEGRATIONS.GOOGLESHEET,
                integrationData: null
            };
            return next();
        }

        const integrationId = data.iObj.iId;
        const integrationType = getIntegrationType(integrationId);

        if (!integrationType) {
            console.error(`Unknown integration ID: ${integrationId}`);
            return res.status(400).json({
                success: false,
                message: `Unknown integration ID: ${integrationId}`
            });
        }

        console.log(`Integration decided: ${integrationType} (ID: ${integrationId})`);

        // Set integration config on request object for downstream handlers
        req.integrationConfig = {
            integrationType,
            integrationId,
            integrationData: data.iObj.iData || null
        };

        // Log which integration was selected
        switch (integrationType) {
            case "GOOGLESHEET":
                console.log("GoogleSheet integration selected");
                break;
            case "WORKDAY":
                console.log("Workday integration selected");
                console.log("Workday RaaS URL:", data.iObj.iData);
                break;
            case "LOCALFILES":
                console.log("LocalFiles integration selected");
                console.log("LocalFiles file path:", data.iObj.iData);
                break;
            case "GREENHOUSE":
                console.log("Greenhouse integration selected");
                break;
        }

        next();
    } catch (error) {
        console.error("Error in IntegrationDecider middleware:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error in IntegrationDecider middleware"
        });
    }
};