# Deepgram TTS Setup Instructions

## Current Status
✅ **Google TTS has been completely removed**
✅ **Deepgram TTS is now the primary TTS service**
✅ **Browser TTS is available as a fallback**

---

## Getting a Valid Deepgram API Key

The current API key in your `.env` file is invalid. To get a new one:

1. **Visit the Deepgram Console**: https://console.deepgram.com/
2. **Sign up or Log in** to your account
3. **Create a new project** or use an existing one
4. **Navigate to "API Keys"** in the left sidebar
5. **Create a new API key** with the following permissions:
   - Speech-to-Text (STT)
   - Text-to-Speech (TTS)
6. **Copy the API key**

## Update Your Environment

Replace the `DEEPGRAM_API_KEY` in your `backend/.env` file:

```env
DEEPGRAM_API_KEY=your_new_deepgram_api_key_here
```

---

## How the New System Works

### Primary: Deepgram TTS
- High-quality AI voices
- Multiple voice options (Thalia, Luna, Stella, etc.)
- Professional audio output
- Requires valid API key

### Fallback: Browser TTS
- Uses browser's built-in Speech Synthesis API
- Works without internet connection
- No API key required
- Automatically used if Deepgram fails

---

## Available Deepgram Voices

The system supports these high-quality AI voices:
- `aura-2-thalia-en` - Warm female voice (default)
- `aura-2-luna-en` - Conversational female voice
- `aura-2-stella-en` - Friendly female voice
- `aura-2-athena-en` - Confident female voice
- `aura-2-hera-en` - Professional female voice
- `aura-2-orion-en` - Mature male voice
- `aura-2-arcas-en` - Youthful male voice
- `aura-2-perseus-en` - Strong male voice
- `aura-2-angus-en` - Warm male voice
- `aura-2-orpheus-en` - Melodic male voice

---

## Testing the Setup

1. **Restart your backend server** after updating the API key
2. **Start your frontend application**
3. **Begin an interview session**
4. **Check the browser console** for TTS logs:
   - ✅ Success: "Deepgram TTS conversion successful!"
   - ⚠️ Fallback: "Falling back to browser TTS..."

---

## Troubleshooting

### If you see "Invalid credentials" errors:
- Verify your API key is correctly set in `backend/.env`
- Make sure the API key has TTS permissions
- Check that you have remaining credits in your Deepgram account

### If audio doesn't play:
- Check browser console for errors
- Ensure your browser allows audio autoplay
- Try clicking the "Stop" button and starting again

### If fallback browser TTS is used:
- This is normal if Deepgram API is unavailable
- The system will work with browser TTS
- Update your Deepgram API key for better quality

---

## Files Modified

### Removed Files:
- ❌ `backend/route/ttsRoute.js` (Google TTS route)
- ❌ `frontend/ai/src/services/googlettsserves.js` (Google TTS service)

### New Files:
- ✅ `frontend/ai/src/services/deepgramTTS.js` (New Deepgram TTS service)

### Updated Files:
- ✅ `backend/app.js` (Removed Google TTS routes)
- ✅ `backend/route/deepgramTTS.js` (Enhanced with error handling)
- ✅ `frontend/ai/src/component/Interview.jsx` (Updated imports and audio handling)

---

## API Endpoints

### Deepgram TTS Endpoints:
- `POST /api/deepgram-tts/speak` - Convert text to speech
- `GET /api/deepgram-tts/voices` - Get available voices
- `GET /api/deepgram-tts/test` - Test API connection

---

The system now provides a much more robust TTS solution with automatic fallback capabilities!