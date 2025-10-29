// routes/google.route.js
import express from "express";
import * as googleCtrl from "../controllers/google.controller.js";
// import { ensureAuth } from "../middleware/auth.js"; // your existing auth middleware to protect endpoints
import { ownerTokenAuth } from "../middlewares/ownerTokenAuth.middleware.js";
const router = express.Router();

// return auth url (frontend will redirect user to this)
router.get("/auth-url", ownerTokenAuth, googleCtrl.getAuthUrl);

// OAuth2 callback - Google will call this
router.get("/callback", googleCtrl.oauthCallback);

router.get("/get-sheets-names", ownerTokenAuth, googleCtrl.getGoogleSheets);


// endpoint to fetch sheet values using stored tokens (protected)
router.get("/sheet-data", ownerTokenAuth, googleCtrl.getSheetData);


export default router;
