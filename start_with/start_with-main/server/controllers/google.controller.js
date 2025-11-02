// controllers/google.controller.js
import jwt from "jsonwebtoken";
import { createOAuthClient, generateAuthUrl } from "../utils/googleClient.js";
import GoogleIntegration from "../models/googleIntegration.model.js";
import { google } from "googleapis";
import { RegisterOwner } from "./owner.controller.js";
import Owner from "../models/owner.model.js";

const SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
];

export const getAuthUrl = async (req, res) => {
    try {
        // we will include a signed state to map callback -> logged-in user
        const state = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: "10m" });
        const url = generateAuthUrl({ scopes: SCOPES, state });
        return res.json({ url });
    } catch (err) {
        console.error("getAuthUrl error:", err);
        return res.status(500).json({ error: "Failed to create auth url" });
    }
};

export const oauthCallback = async (req, res) => {
    try {
        const code = req.query.code;
        const state = req.query.state || "";
        // decode state to find which user this belongs to
        let payload = null;
        try {
            payload = jwt.verify(state, process.env.JWT_SECRET);
        } catch (err) {
            // state invalid: you might still attempt to proceed but we prefer to abort
            console.warn("Invalid/expired OAuth state:", err.message);
            // redirect to frontend with error
            return res.redirect(`${process.env.FRONTEND_ORIGIN}/integrations?error=invalid_state`);
        }

        const oAuth2Client = createOAuthClient();
        const { tokens } = await oAuth2Client.getToken(code);
        // tokens contains access_token, refresh_token, expiry_date etc.
        oAuth2Client.setCredentials(tokens);

        // store tokens in DB linked to payload.userId
        const ownerId = payload.userId;
        const update = {
            owner: ownerId,
            provider: "google",
            tokens,
            updatedAt: new Date(),
        };

        // upsert
        await GoogleIntegration.findOneAndUpdate(
            { owner: ownerId, provider: "google" },
            update,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // redirect back to your frontend app with success
        const ownerFind = await Owner.findById(ownerId);
        if (ownerFind) {
            ownerFind.googleSheetsConnected = true;
            await ownerFind.save();
        }

        console.log(`${process.env.FRONTEND_ORIGIN}/integrations?connected=google`);
        return res.redirect(`${process.env.FRONTEND_ORIGIN}/integrations?connected=google`);
    } catch (err) {
        console.error("oauthCallback error:", err);
        return res.redirect(`${process.env.FRONTEND_ORIGIN}/integrations?error=server_error`);
    }
};

export const getGoogleSheets = async (req, res) => {
    try {
        const userId = req.user._id || req.user; // assuming you’re using JWT middleware
        const integration = await GoogleIntegration.findOne({ owner: userId });

        if (!integration) {
            return res.status(404).json({ message: "Google account not connected" });
        }

        const { access_token, refresh_token, expiry_date } = integration.tokens;

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BACKEND_ORIGIN}/api/google/callback`
        );

        oauth2Client.setCredentials({
            access_token,
            refresh_token,
            expiry_date,
        });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // Function to fetch sheets list
        const fetchSheets = async () => {
            const response = await drive.files.list({
                q: "mimeType='application/vnd.google-apps.spreadsheet'",
                fields: "files(id, name)",
            });
            return response.data.files || [];
        };

        let sheets;
        try {
            sheets = await fetchSheets();
        } catch (err) {
            // token may be expired
            if (err.code === 401) {
                const newTokens = await oauth2Client.refreshAccessToken();
                oauth2Client.setCredentials(newTokens.credentials);

                // update tokens in DB
                integration.tokens = {
                    ...integration.tokens,
                    ...newTokens.credentials,
                };
                await integration.save();

                sheets = await fetchSheets(); // retry
            } else {
                throw err;
            }
        }

        res.json(sheets);
    } catch (error) {
        console.error("Error fetching Google Sheets:", error);
        res.status(500).json({ message: "Failed to fetch sheets" });
    }
};

/**
 * GET /api/google/sheet-data?spreadsheetId=xxx&range=Sheet1!A1:E50
 * This endpoint uses stored tokens for req.user to fetch sheet values
 */
export const getSheetData = async (req, res) => {
    try {
        const { spreadsheetId, range } = req.query;
        if (!spreadsheetId || !range) return res.status(400).json({ error: "spreadsheetId and range required" });

        const integration = await GoogleIntegration.findOne({ owner: req.user._id, provider: "google" });
        if (!integration || !integration.tokens) return res.status(400).json({ error: "No Google integration found" });

        // create oauth client and set stored credentials
        const oAuth2Client = createOAuthClient();
        oAuth2Client.setCredentials(integration.tokens);

        // google client will use refresh_token to refresh access_token automatically when necessary
        const sheets = google.sheets({ version: "v4", auth: oAuth2Client });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        return res.json({ values: response.data.values || [] });
    } catch (err) {
        console.error("getSheetData error:", err);
        return res.status(500).json({ error: "Failed to fetch sheet data" });
    }
};
