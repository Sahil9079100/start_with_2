import express from "express";
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const router = express.Router();

// Use environment variable for API keys
const deepgramApiKey = process.env.DEEPGRAM_API_KEY || null;
// Require ELEVENLABS_API_KEY to be set in environment. Do NOT fallback to a hard-coded key.
const elevenApiKey = process.env.ELEVENLABS_API_KEY || null;

// Initialize ElevenLabs client if API key is present
let elevenClient = null;
if (elevenApiKey) {
  try {
    elevenClient = new ElevenLabsClient({ apiKey: elevenApiKey });
    console.log('🔑 ElevenLabs API Key detected - ElevenLabs TTS enabled');
  } catch (e) {
    console.warn('⚠️ Failed to initialize ElevenLabs client:', e?.message || e);
    elevenClient = null;
  }
}

console.log('🌐 ElevenLabs TTS Router initialized');
if (elevenApiKey) {
  console.log('🔑 ELEVENLABS_API_KEY detected. ElevenLabs TTS/STT enabled.');
} else {
  console.warn('⚠️ ELEVENLABS_API_KEY not set. ElevenLabs TTS/STT endpoints will be disabled or return errors. Set ELEVENLABS_API_KEY in environment.');
}

// Test endpoint to check Deepgram connection
router.get("/test", async (req, res) => {
  try {
    console.log('🧪 Testing Deepgram TTS connection...');
    
    const deepgram = createClient(deepgramApiKey);
    
    const testResponse = await deepgram.speak.request(
      { text: "Hello! This is a test of the text-to-speech system. If you can hear this message, the audio generation is working correctly." },
      { 
        model: 'aura-2-thalia-en'
      }
    );

    const stream = await testResponse.getStream();
    
    if (!stream) {
      throw new Error('No audio stream received');
    }

    // Just test if we can get the stream
    if (stream.destroy && typeof stream.destroy === 'function') {
      stream.destroy(); // Close the stream if it's a readable stream
    }
    // For other types (Buffer, Uint8Array), no cleanup needed
    
    console.log('✅ Deepgram TTS connection test successful');
    res.json({ 
      success: true, 
      message: 'Deepgram TTS connection test successful',
      apiKeyValid: true
    });

  } catch (error) {
    console.error('❌ Deepgram TTS test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      apiKeyValid: false,
      suggestion: 'Please check your Deepgram API key in the .env file'
    });
  }
});

router.post("/speak", async (req, res) => {
  try {
    const { text, elevenVoiceId } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Text is required.' });
    }

    console.log('🎯 Generating speech for text:', text.substring(0, 100) + '...');

    if (!elevenClient) {
      console.error('❌ ElevenLabs client not configured. Set ELEVENLABS_API_KEY in environment.');
      return res.status(500).json({ success: false, error: 'ElevenLabs not configured on server.' });
    }

    const selectedVoiceId = elevenVoiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID;
    // If frontend passed sentinel id, map it to server default if configured
    let resolvedVoiceId = selectedVoiceId;
    if (resolvedVoiceId === 'eleven_multilingual_default') {
      resolvedVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "KSsyodh37PbfWy29kPtx";
    }
    

    if (!resolvedVoiceId) {
      console.error('❌ No ElevenLabs voice id provided and ELEVENLABS_DEFAULT_VOICE_ID is not set.');
      return res.status(400).json({ success: false, error: 'No ElevenLabs voice id provided. Set ELEVENLABS_DEFAULT_VOICE_ID environment variable or pass elevenVoiceId in the request.' });
    }

    // Call ElevenLabs TTS
    try {
      const convertResult = await elevenClient.textToSpeech.convert(resolvedVoiceId, {
        text,
        modelId: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128'
      });

      // Normalize into Buffer
      let audioBuffer = null;
      if (Buffer.isBuffer(convertResult)) audioBuffer = convertResult;
      else if (convertResult instanceof ArrayBuffer) audioBuffer = Buffer.from(new Uint8Array(convertResult));
      else if (convertResult && convertResult.constructor && convertResult.constructor.name === 'Uint8Array') audioBuffer = Buffer.from(convertResult);
      else if (convertResult && typeof convertResult.getReader === 'function') {
        const reader = convertResult.getReader();
        const chunks = [];
        while (true) {
          // eslint-disable-next-line no-await-in-loop
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(new Uint8Array(value));
        }
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const out = new Uint8Array(total);
        let off = 0; for (const c of chunks) { out.set(c, off); off += c.length; }
        audioBuffer = Buffer.from(out);
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        console.error('❌ ElevenLabs returned no audio data');
        return res.status(500).json({ success: false, error: 'ElevenLabs returned no audio' });
      }

      const audioBase64 = audioBuffer.toString('base64');
      console.log('✅ ElevenLabs TTS conversion successful, size:', audioBuffer.length);
      return res.json({ success: true, audioBase64, textLength: text.length, voice: selectedVoiceId, message: 'Speech generated successfully using ElevenLabs', method: 'eleven' });

    } catch (eleErr) {
      console.error('❌ ElevenLabs TTS error:', eleErr?.message || eleErr);
      // Return error message to client for debugging (no secrets)
      return res.status(500).json({ success: false, error: 'ElevenLabs TTS failed', details: eleErr?.message || String(eleErr) });
    }

  } catch (err) {
    console.error('❌ ElevenLabs TTS endpoint error:', err);
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
  }
});







// Handle preflight requests for transcribe endpoint (kept for CORS)
router.options("/transcribe", (req, res) => {
  const origin = req.headers.origin;
  if (['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'].includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.sendStatus(200);
});

// Speech-to-Text endpoint using ElevenLabs Speech-to-Text
router.post("/transcribe", async (req, res) => {
  try {
    if (!elevenApiKey) {
      return res.status(501).json({
        success: false,
        error: 'STT not implemented on server. ELEVENLABS_API_KEY not configured. Please set ELEVENLABS_API_KEY or implement another STT provider.',
        suggestion: 'Use client-side STT (Web Speech API) for low latency or implement another STT provider on the server.'
      });
    }

    // Add CORS headers - specific origin instead of wildcard for credentials
    const origin = req.headers.origin;
    if (['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'].includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    console.log('🎙️ Starting speech transcription (ElevenLabs)...');

    // Check if audio data is provided
    if (!req.body.audio) {
      return res.status(400).json({
        success: false,
        error: 'Audio data is required'
      });
    }

    let { audio, format = 'webm', language = '' } = req.body;
    console.log('🔍 Audio format:', format);
    console.log('📏 Received audio payload type:', typeof audio);

    // If the client sent a data: URI (data:audio/webm;base64,AAA...), strip the prefix
    if (typeof audio === 'string' && audio.startsWith('data:')) {
      const idx = audio.indexOf(',');
      if (idx !== -1) audio = audio.slice(idx + 1);
    }

    // Convert base64 audio to buffer with validation
    let audioBuffer;
    try {
      if (typeof audio === 'string') {
        audioBuffer = Buffer.from(audio, 'base64');
      } else if (Buffer.isBuffer(audio)) {
        audioBuffer = audio;
      } else if (audio instanceof ArrayBuffer) {
        audioBuffer = Buffer.from(new Uint8Array(audio));
      } else {
        console.warn('⚠️ Unsupported audio payload type:', audio && audio.constructor && audio.constructor.name);
        return res.status(400).json({ success: false, error: 'Unsupported audio payload type' });
      }
    } catch (decodeErr) {
      console.error('❌ Failed to decode base64 audio:', decodeErr?.message || decodeErr);
      return res.status(400).json({ success: false, error: 'Invalid base64 audio data', details: decodeErr?.message || String(decodeErr) });
    }

    console.log('🎵 Processing audio buffer, size:', audioBuffer.length, 'bytes');

    if (!audioBuffer || audioBuffer.length < 100) {
      console.log('⚠️ Audio buffer too small or might be empty');
      return res.status(400).json({
        success: false,
        error: 'Audio data too small or empty'
      });
    }

    // Map client format to content-type
    let contentType = 'application/octet-stream';
    if (format === 'webm') contentType = 'audio/webm';
    else if (format === 'wav') contentType = 'audio/wav';
    else if (format === 'ogg') contentType = 'audio/ogg';
    else if (format === 'mp3' || format === 'mpeg') contentType = 'audio/mpeg';

    // Call ElevenLabs Speech-to-Text REST API
    const url = 'https://api.elevenlabs.io/v1/speech-to-text';
    try {
      // Ensure we have a fetch implementation (Node 18+ has global.fetch). If not, try dynamic import of node-fetch.
      let fetchFn = global.fetch;
      if (!fetchFn) {
        try {
          // dynamic import to avoid adding node-fetch as a top-level dependency unless necessary
          // eslint-disable-next-line no-await-in-loop
          const mod = await import('node-fetch');
          fetchFn = mod.default || mod;
        } catch (impErr) {
          console.error('❌ No global fetch and failed to import node-fetch:', impErr?.message || impErr);
          return res.status(500).json({ success: false, error: 'Server missing fetch implementation. Run on Node 18+ or install node-fetch.' });
        }
      }

  // ElevenLabs STT expects a multipart/form-data body which includes a `model_id` field
  // and the audio file. Use a real STT model id. Valid models depend on your ElevenLabs
  // account and API version; common options are 'scribe_v1' or 'scribe_v1_experimental'.
  // You can override with ELEVENLABS_STT_MODEL_ID in your environment.
  const modelId = process.env.ELEVENLABS_STT_MODEL_ID || 'scribe_v1';
  console.log('🔎 Using ElevenLabs STT model:', modelId);
      const boundary = '----elevenlabs_form_boundary_' + Date.now();
      const prefixParts = [];

      // model_id field
      prefixParts.push(`--${boundary}\r\n`);
      prefixParts.push('Content-Disposition: form-data; name="model_id"\r\n\r\n');
      prefixParts.push(String(modelId) + '\r\n');

      // file field header
      prefixParts.push(`--${boundary}\r\n`);
      prefixParts.push('Content-Disposition: form-data; name="file"; filename="audio.' + format + '"\r\n');
      prefixParts.push('Content-Type: ' + contentType + '\r\n\r\n');

      const prefixBuffer = Buffer.from(prefixParts.join(''));
      const suffixBuffer = Buffer.from('\r\n--' + boundary + '--\r\n');
      const multipartBody = Buffer.concat([prefixBuffer, audioBuffer, suffixBuffer]);

      const resp = await fetchFn(url, {
        method: 'POST',
        headers: {
          // ElevenLabs STT requires a single API header; use xi-api-key.
          'xi-api-key': elevenApiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          ...(language ? { 'Accept-Language': language } : {})
        },
        body: multipartBody
      });

      const rawText = await resp.text();
      if (!resp.ok) {
        console.error('❌ ElevenLabs STT returned error:', resp.status, rawText);
        // If the API returned 401/403, surface a clear message indicating invalid API key
        if (resp.status === 401 || resp.status === 403) {
          return res.status(401).json({ success: false, error: 'ElevenLabs STT failed', status: resp.status, details: rawText, hint: 'Check ELEVENLABS_API_KEY and that it has STT permissions. ElevenLabs expects a single API header (xi-api-key).' });
        }
        // If the model id is invalid, surface a clear hint to set the correct STT model
        if (resp.status === 400 && rawText && rawText.includes('invalid_model_id')) {
          return res.status(400).json({ success: false, error: 'ElevenLabs STT failed', status: resp.status, details: rawText, hint: "Invalid model_id. Set ELEVENLABS_STT_MODEL_ID to a valid STT model (e.g. 'scribe_v1' or 'scribe_v1_experimental')." });
        }
        return res.status(500).json({ success: false, error: 'ElevenLabs STT failed', status: resp.status, details: rawText });
      }

      let j;
      try {
        j = JSON.parse(rawText);
      } catch (parseErr) {
        // If response was plain text, return it for debugging
        console.warn('⚠️ ElevenLabs STT returned non-JSON response; returning text for debugging');
        return res.json({ success: true, transcript: rawText.trim(), confidence: 0, audioLength: audioBuffer.length, message: 'Speech transcribed (raw text response)', debug: { raw: rawText } });
      }

      // Try to extract transcript from common fields
      const transcript = j.text || j.transcript || j.results?.[0]?.text || j.data?.text || null;
      const confidence = j.confidence || j.results?.[0]?.confidence || null;

      console.log('📝 ElevenLabs STT response:', { transcript, confidence, raw: j });

      if (!transcript || transcript.trim().length === 0) {
        return res.json({ success: true, transcript: '', confidence: 0, message: 'No speech detected in audio', debug: { response: j } });
      }

      return res.json({ success: true, transcript: transcript.trim(), confidence: confidence || 0, audioLength: audioBuffer.length, message: 'Speech transcribed successfully' });

    } catch (apiErr) {
      console.error('❌ ElevenLabs STT API error:', apiErr?.message || apiErr);
      return res.status(500).json({ success: false, error: 'ElevenLabs STT request failed', details: apiErr?.message || String(apiErr) });
    }

  } catch (error) {
    console.error('❌ ElevenLabs STT endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available Deepgram voices
router.get("/voices", (req, res) => {
  try {
    // ElevenLabs SDK may provide a way to list voices; to keep this simple we return a small
    // curated list of common ElevenLabs multilingual voice IDs. Replace these with real IDs
    // from your ElevenLabs account or call the ElevenLabs API to list voices dynamically.
    const availableVoices = [
      { id: 'eleven_multilingual_v1_female_1', name: 'Eleven Female 1', description: 'Multilingual female voice (sample id)'} ,
      { id: 'eleven_multilingual_v1_male_1', name: 'Eleven Male 1', description: 'Multilingual male voice (sample id)'} ,
      { id: process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'eleven_multilingual_default', name: 'Default ElevenLabs Voice', description: 'Server default ElevenLabs voice' }
    ];

    res.json({
      success: true,
      voices: availableVoices,
      message: 'Available ElevenLabs voices (placeholder values)'
    });
  } catch (error) {
    console.error('❌ Error getting voices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
