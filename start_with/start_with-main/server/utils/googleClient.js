// utils/googleClient.js
import { google } from "googleapis";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

export function createOAuthClient() {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
    );
}

/**
 * Create an auth URL
 * scopes: array of scopes, and optional state (string)
 */
export function generateAuthUrl({ scopes = [], state = "" } = {}) {
    const oAuth2Client = createOAuthClient();
    const url = oAuth2Client.generateAuthUrl({
        access_type: "offline",        // ask for refresh token
        prompt: "consent",            // force refresh_token on first consent
        scope: scopes,
        state,
    });
    return url;
}
