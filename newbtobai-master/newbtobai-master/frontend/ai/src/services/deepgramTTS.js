// Backend API base URL (now ElevenLabs TTS backend)
const API_BASE_URL = 'http://localhost:8001/api/deepgram-tts';


/**
 * Creates an audio element from base64 data and plays it
 */
async function createAndPlayAudio(base64Data, autoPlay = true) {
    try {
        if (!base64Data) {
            throw new Error('No audio data provided');
        }

        console.log('🎵 Creating audio from base64 data...');
        console.log('📏 Data length:', base64Data.length);

        // Convert base64 to binary data
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
       
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
       
        // Create blob from binary data (Deepgram returns MP3)
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
       
        console.log('✅ Audio blob created:', audioBlob.size, 'bytes');
        
        // Create audio element
        const audio = new Audio(audioUrl);
        audio.preload = 'auto';

        if (autoPlay) {
            // Return a promise that resolves when playback ends
            return new Promise((resolve, reject) => {
                const cleanup = () => {
                    URL.revokeObjectURL(audioUrl);
                    audio.removeEventListener('ended', onEnded);
                    audio.removeEventListener('error', onError);
                };

                const onEnded = () => {
                    cleanup();
                    console.log('✅ Audio playback completed');
                    resolve({
                        audio: audio,
                        url: audioUrl,
                        success: true
                    });
                };

                const onError = (e) => {
                    cleanup();
                    console.error('❌ Audio playback error:', e);
                    reject({
                        success: false,
                        error: e.message,
                        audio: null,
                        url: null
                    });
                };

                audio.addEventListener('ended', onEnded);
                audio.addEventListener('error', onError);

                audio.play().catch(onError);
            });
        } else {
            // Non-autoPlay: return immediately
            return {
                audio: audio,
                url: audioUrl,
                success: true
            };
        }
       
    } catch (error) {
        console.error('❌ Error creating audio:', error);
        return {
            success: false,
            error: error.message,
            audio: null,
            url: null
        };
    }
}



/**
 * Fallback TTS using browser's Speech Synthesis API
 */
function browserTextToSpeech(text, options = {}) {
    return new Promise((resolve) => {
        try {
            if (!('speechSynthesis' in window)) {
                throw new Error('Speech synthesis not supported in this browser');
            }

            const { autoPlay = true, voiceName = 'default' } = options;
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configure voice if available
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                // Try to find a specific voice or use default
                const voice = voices.find(v => v.name.toLowerCase().includes('female')) || voices[0];
                utterance.voice = voice;
            }
            
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onend = () => {
                console.log(' Browser TTS playback completed');
                resolve({
                    success: true,
                    message: 'Text converted to speech using browser TTS',
                    method: 'browser',
                    textLength: text.length
                });
            };

            utterance.onerror = (event) => {
                console.error(' Browser TTS error:', event.error);
                resolve({
                    success: false,
                    error: `Browser TTS failed: ${event.error}`,
                    method: 'browser'
                });
            };

            if (autoPlay) {
                console.log(' Using browser TTS as fallback...');
                speechSynthesis.speak(utterance);
            }

            if (!autoPlay) {
                resolve({
                    success: true,
                    utterance: utterance,
                    message: 'Browser TTS utterance created (not played)',
                    method: 'browser'
                });
            }

        } catch (error) {
            console.error(' Browser TTS setup error:', error);
            resolve({
                success: false,
                error: error.message,
                method: 'browser'
            });
        }
    });
}



/**
 * Text-to-Speech using Deepgram API via backend with browser fallback
 */



async function textToSpeech(inputText, options = {}) {
    try {
        console.log(' Starting TTS conversion via Deepgram backend...');
        
        // Validate input
        if (!inputText || typeof inputText !== 'string' || inputText.trim().length === 0) {
            throw new Error('Invalid input: text must be a non-empty string');
        }

        const { autoPlay = true, elevenVoiceId = null } = options;

        // Provide a sensible default ElevenLabs voice id if none supplied by the caller.
        // You should set a real voice id in ELEVENLABS_DEFAULT_VOICE_ID on the server,
        // or pass an explicit elevenVoiceId from the UI.
        const voiceToUse = elevenVoiceId || 'eleven_multilingual_default';

        console.log(' Text:', inputText.substring(0, 100) + '...');
        console.log(' ElevenLabs voice id:', voiceToUse);

        // Call backend ElevenLabs TTS API (backend still mounted at /api/deepgram-tts)
        const response = await fetch(`${API_BASE_URL}/speak`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
                text: inputText,
                elevenVoiceId: voiceToUse
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }
            
            // If Deepgram fails due to auth issues, fall back to browser TTS
            if (response.status === 401 || errorData.error?.includes('credentials')) {
                console.warn(' Deepgram authentication failed, falling back to browser TTS...');
                return await browserTextToSpeech(inputText, options);
            }
            
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success || !data.audioBase64) {
            console.warn('Deepgram failed, falling back to browser TTS...');
            return await browserTextToSpeech(inputText, options);
        }

        console.log(' Audio data received from Deepgram backend, length:', data.audioBase64.length);

        // Create and play audio using the base64 data (now awaits end if autoPlay)
        const audioResult = await createAndPlayAudio(data.audioBase64, autoPlay);

        if (audioResult.success) {
            console.log(' ElevenLabs TTS conversion successful!');
            return {
                success: true,
                audioUrl: audioResult.url,
                audioElement: audioResult.audio,
                message: data.message || 'Text converted to speech successfully using ElevenLabs',
                textLength: inputText.length,
                method: data.method || 'eleven'
            };
        } else {
            console.warn('Audio creation failed, falling back to browser TTS...');
            return await browserTextToSpeech(inputText, options);
        }
    } catch (error) {
    console.error(' ElevenLabs TTS Error:', error);
    console.warn('Falling back to browser TTS...');
        
        // Try browser TTS as fallback
        const fallbackResult = await browserTextToSpeech(inputText, options);
        
        if (fallbackResult.success) {
            return fallbackResult;
        }
        
        // If both fail, return error
        return {
            success: false,
            error: `Both Deepgram and browser TTS failed. Deepgram: ${error.message}, Browser: ${fallbackResult.error}`,
            errorType: error.name,
            audioElement: null,
            audioUrl: null,
            method: 'failed'
        };
    }
}



/**
 * Get available voices from Deepgram backend
 */





async function getAvailableVoices() {
    try {
        const response = await fetch(`${API_BASE_URL}/voices`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.success ? data.voices : [];
    } catch (error) {
        console.error(' Error fetching Deepgram voices:', error);
        // No fallback placeholder voices — the frontend should request real voice IDs from the backend
        return [];
    }
}

/**
 * Available Deepgram voice options
 */
// Remove hardcoded placeholder voice mapping — prefer dynamic voices from backend
const AVAILABLE_VOICES = {};

// Export functions

export { 
    textToSpeech, 
    getAvailableVoices,
    createAndPlayAudio,
    browserTextToSpeech,
    AVAILABLE_VOICES 
 };