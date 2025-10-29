import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Play, Square, Send } from 'lucide-react';
import socket from "./socket/socket";
import { useParams, useNavigate } from "react-router-dom";
import { textToSpeech } from "../services/deepgramTTS";
import { SimpleVoiceRecorder } from "../services/voiceRecorder"; 
import ImageKit from 'imagekit-javascript';



export default function Interview() {
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [finalVideoBlob, setFinalVideoBlob] = useState(null); 
  const [stream, setStream] = useState(null);
  const [aiPulse, setAiPulse] = useState(false);

  const [messages, setMessages] = useState([]); 
  const [userMessage, setUserMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(socket && socket.connected ? true : false);

  const [voiceRecorder, setVoiceRecorder] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);



  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const { id: sessionId } = useParams(); 
  const navigate = useNavigate();


  useEffect(() => {
    const handleAiResponse = async (data) => {
      console.log("🤖 AI Response:", data);
      setMessages((prev) => [...prev, { sender: "ai", text: data.response }]);
      
  
      if (voiceRecorder && isInterviewActive) {
        voiceRecorder.stopListening();
      }
      
     
      try {
        await textToSpeech(data.response);
        
        if (voiceRecorder && isInterviewActive) {
          voiceRecorder.startListening();
        }
      } catch (err) {
        console.error('TTS playback failed:', err);
        setMessages((prev) => [...prev, { sender: "system", text: "AI audio playback failed" }]);

        if (voiceRecorder && isInterviewActive) {
          voiceRecorder.startListening();
        }
      }
    };

    const handleError = (err) => {
      console.error("Socket error:", err);
      setMessages((prev) => [...prev, { sender: "system", text: " Error: " + (err.message || err) }]);
    };

    const handleFinalFeedback = (feedback, details) => {
      console.log("Final Feedback:", feedback);
      setMessages((prev) => [...prev, { sender: "system", text: `Interview Complete! Feedback: ${feedback}` }]);
      setIsInterviewActive(false);
    };

    socket.on("ai-response", handleAiResponse);
    socket.on("error", handleError);
    socket.on("final-feedback", handleFinalFeedback);

    return () => {
      socket.off("ai-response", handleAiResponse);
      socket.off("error", handleError);
      socket.off("final-feedback", handleFinalFeedback);
    };
  }, [sessionId, voiceRecorder, isInterviewActive]);

  useEffect(() => {
    const onConnect = () => {
      console.log('🔌 Socket connected (Interview.jsx):', socket.id);
      setSocketConnected(true);
    };
    const onDisconnect = (reason) => {
      console.log('🔌 Socket disconnected (Interview.jsx):', reason);
      setSocketConnected(false);
    };


    if (socket && socket.connected) setSocketConnected(true);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (stream && isInterviewActive && videoRef.current) {
      try {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {
          console.log('Autoplay prevented');
        });
      } catch (err) {
        console.error('Failed to attach stream:', err);
      }
    }
  }, [stream, isInterviewActive]);

  useEffect(() => {
    if (isInterviewActive) {
      const interval = setInterval(() => setAiPulse(prev => !prev), 2000);
      return () => clearInterval(interval);
    }
  }, [isInterviewActive]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (voiceRecorder) {
        voiceRecorder.cleanup();
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);


  const startInterview = async () => {
    if (!sessionId) {
      alert('Session ID not found');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;

      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => e.data && e.data.size > 0 && chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          setRecordedChunks([blob]);
          setFinalVideoBlob(blob);
          console.log('Video recorded (full blob ready, size=' + (blob.size || 0) + ')');
        } catch (err) {
          console.error('Failed to build final blob on stop:', err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsInterviewActive(true);

      const hardcodedValue = 'Hello, introduce yourself to start the interview.';
      await textToSpeech(hardcodedValue);

      const recorder = new SimpleVoiceRecorder();
      setVoiceRecorder(recorder);

      recorder.onTranscriptReady = async (transcript) => {
        if (!transcript.trim()) {
          console.log('Empty transcript, ignoring');
          return;
        }
        console.log('🎤 User transcript ready:', transcript);
        setMessages((prev) => [...prev, { sender: "user", text: transcript }]);

        const messageData = {
          sessionId,
          messageContent: transcript
        };
        socket.emit("user-message", messageData);
        console.log("Sent user-message:", messageData);

        recorder.stopListening();

      };

      recorder.onNoSpeech = () => {
        console.log('No speech detected');
        setMessages((prev) => [...prev, { sender: "system", text: "No speech detected. Please speak clearly." }]);
        setTimeout(() => {
          if (voiceRecorder && isInterviewActive) {
            voiceRecorder.startListening();
          }
        }, 1000);
      };

      await recorder.startListening();
      console.log(' Voice listening started after intro');

    } catch (err) {
      console.error('Start interview failed:', err);
      alert('Failed to access camera/microphone: ' + err.message);
    }
  };





  
  const uploadVideoToImageKit = useCallback(async (videoBlob, sessionId) => {      
    try {
      const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, '');
      const authUrl = `${API_BASE_URL}/api/user/imagekit-auth`;

      const authResponse = await fetch(authUrl, { credentials: 'include' });

      const contentType = authResponse.headers.get('content-type') || '';
      if (!authResponse.ok) {
        const text = await authResponse.text().catch(() => '');
        throw new Error(`Failed to get ImageKit auth params: ${authResponse.status} ${authResponse.statusText} - ${text.slice(0,200)}`);
      }
      if (!contentType.includes('application/json')) {
        const text = await authResponse.text().catch(() => '');
        throw new Error(`ImageKit auth did not return JSON. Response content-type=${contentType}. Body starts with: ${text.slice(0,200)}`);
      }

      const { signature, expire, token, publicKey, urlEndpoint } = await authResponse.json();


      const ik = new ImageKit({ publicKey, urlEndpoint });
      const uploadParams = {
        file: videoBlob,
        fileName: `interview-${sessionId}.webm`,
      };


      uploadParams.signature = signature;
      uploadParams.expire = expire;
      uploadParams.token = token;


      console.log(' Uploading to ImageKit...');
      const response = await ik.upload(uploadParams);


      if (response && response.url) {
        console.log(' Upload success:', response.url);
        return response.url;
      } else {
        throw new Error('Upload failed: No URL returned');
      }
    } catch (error) {
      console.error(' ImageKit upload error:', error);
      throw error;
    }
  }, []);






  const stopInterview = async () => {
    if (mediaRecorderRef.current && isRecording) {
      const recorder = mediaRecorderRef.current;
      await new Promise((resolve) => {
        const onStop = () => {
          try { resolve(); } catch (e) { resolve(); }
          recorder.removeEventListener('stop', onStop);
        };
        recorder.addEventListener('stop', onStop);
        try {
          if (recorder.state !== 'inactive') recorder.stop();
          else setTimeout(onStop, 0);
        } catch (err) {
          console.warn('Error calling recorder.stop():', err);
          setTimeout(onStop, 0);
        }
      });
      setIsRecording(false);
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (voiceRecorder) {
      try { voiceRecorder.stopListening(); } catch(e){}
      try { voiceRecorder.cleanup(); } catch(e){}
      setVoiceRecorder(null);
    }

    setIsInterviewActive(false);

    if ((!finalVideoBlob || finalVideoBlob.size === 0) && chunksRef.current && chunksRef.current.length > 0) {
      try {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedChunks([blob]);
        setFinalVideoBlob(blob);


        
        let videoUrl = null;
        try {
          setIsUploading(true);
          videoUrl = await uploadVideoToImageKit(blob, sessionId);
          console.log("Uploaded video URL:", videoUrl);

          if (sessionId && videoUrl) {
            const baseUrl = videoUrl.split('?')[0];
            const mp4Url = baseUrl.endsWith('/ik-video.mp4') ? baseUrl : baseUrl + '/ik-video.mp4';
            socket.emit('end-interview', { sessionId, videoUrl: mp4Url });

            console.log('End interview sent with ImageKit MP4 URL', mp4Url);

            setMessages((prev) => [...prev, { sender: 'system', text: 'Interview end and here is your interview video', url: mp4Url }]);
            setUploadedVideoUrl(mp4Url);

            // After showing the message for a short time, redirect to login
            setTimeout(() => {
              navigate(`/${sessionId}/login`);
            }, 3500);
          } else {
            console.warn('Upload succeeded but missing sessionId or videoUrl', { sessionId, videoUrl });
            setMessages((prev) => [...prev, { sender: "system", text: ' Video uploaded but URL/session missing' }]);
          }
        } catch (uploadErr) {
          console.error('Upload error in stopInterview:', uploadErr);
          setMessages((prev) => [...prev, { sender: 'system', text: 'Video upload failed: ' + (uploadErr.message || uploadErr) }]);
        } finally {
          setIsUploading(false);
        }







if(sessionId && blob && blob.size > 0){ 



  console.log("📤 Emitted upload-video with blob size:", blob.size);

}




        console.log('Final video blob assembled in stopInterview, size=', blob.size);
      } catch (err) {
        console.error('Failed to assemble final video blob in stopInterview:', err);
      }
    }

    setMessages((prev) => [...prev, { sender: "system", text: "Interview ended. Recording saved locally." }]);
  };

  const sendMessage = () => {
    if (!userMessage.trim() || !sessionId) return;

    const messageData = {
      sessionId,
      messageContent: userMessage
    };



    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    socket.emit("user-message", messageData);
    console.log("Sent user-message (text):", messageData);

    setUserMessage(""); 
  };

  return (
   <div class="min-h-screen bg-gray-950 text-gray-200 p-6 flex items-center justify-center">
  <div class="w-full max-w-6xl space-y-10">

    <div class="text-center">
      <h1 class="text-6xl font-extrabold text-white tracking-tighter drop-shadow-lg">
        AI Interview Portal
      </h1>
      <p class="text-gray-400 text-lg mt-3 font-light">
        {isInterviewActive ? 'Interview in Progress' : 'Ready to Begin Your Interview'}
      </p>
      {!socketConnected && (
        <p class="text-red-500 text-sm mt-2 animate-pulse font-medium">Socket disconnected – Reconnect to start</p>
      )}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="relative rounded-3xl overflow-hidden bg-gray-900 border border-gray-700 shadow-2xl transition-all duration-300 transform hover:scale-[1.01] hover:shadow-purple-500/10">
        <div class="aspect-video bg-gray-950 relative">
          {isInterviewActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                class="w-full h-full object-cover"
              />
              {isRecording && (
                <div class="absolute top-5 right-5 flex items-center gap-2 bg-red-600/90 px-4 py-2 rounded-full shadow-lg">
                  <div class="w-3 h-3 bg-white rounded-full animate-pulse" />
                  <span class="text-white text-sm font-semibold uppercase">Rec</span>
                </div>
              )}
            </>
          ) : (
            <div class="w-full h-full flex items-center justify-center bg-gray-950">
              <VideoOff class="w-24 h-24 text-gray-700 opacity-60" />
            </div>
          )}
        </div>
        <div class="p-5 bg-gray-800/50 backdrop-blur-sm border-t border-gray-700">
          <div class="flex items-center justify-between">
            <span class="text-white font-bold text-xl tracking-wide">You</span>
            <div class="flex gap-3">
              {isInterviewActive ? (
                <>
                  <div class="p-3 bg-green-500/20 rounded-xl transition-colors duration-200">
                    <Video class="w-6 h-6 text-green-400" />
                  </div>
                  <div class="p-3 bg-green-500/20 rounded-xl transition-colors duration-200">
                    <Mic class="w-6 h-6 text-green-400" />
                  </div>
                </>
              ) : (
                <>
                  <div class="p-3 bg-gray-700/50 rounded-xl">
                    <VideoOff class="w-6 h-6 text-gray-500" />
                  </div>
                  <div class="p-3 bg-gray-700/50 rounded-xl">
                    <MicOff class="w-6 h-6 text-gray-500" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div class="relative rounded-3xl overflow-hidden bg-gray-900 border border-gray-700 shadow-2xl transition-all duration-300 transform hover:scale-[1.01] hover:shadow-purple-500/10">
        <div class="aspect-video relative overflow-hidden bg-gray-950">
          <div class="absolute inset-0 flex items-center justify-center">
            <div class={`relative transition-all duration-1000 ${aiPulse && isInterviewActive ? 'scale-110' : 'scale-100'}`}>
              <div class="w-48 h-48 rounded-full bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center shadow-inner-lg shadow-purple-900/50">
                <div class="w-40 h-40 rounded-full bg-gray-900 flex items-center justify-center border-4 border-purple-600/50">
                  <svg class="w-24 h-24 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                    <path d="M2 17L12 22L22 17" />
                    <path d="M2 12L12 17L22 12" />
                  </svg>
                </div>
              </div>
              {isInterviewActive && (
                <>
                  <div class="absolute inset-0 rounded-full border-4 border-purple-500 animate-ping opacity-30" />
                  <div class="absolute inset-0 rounded-full border-2 border-purple-400 animate-pulse opacity-40" />
                </>
              )}
            </div>
          </div>
        </div>
        <div class="p-5 bg-gray-800/50 backdrop-blur-sm border-t border-gray-700">
          <div class="flex items-center justify-between">
            <span class="text-white font-bold text-xl tracking-wide">AI Interviewer</span>
            <div class={`px-4 py-1.5 rounded-full ${isInterviewActive ? 'bg-green-500/20' : 'bg-gray-700/50'}`}>
              <span class={`text-sm font-semibold uppercase ${isInterviewActive ? 'text-green-400' : 'text-gray-400'}`}>
                {isInterviewActive ? 'Active' : 'Standby'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row justify-center gap-6">
      <button
        onClick={startInterview}
        disabled={isInterviewActive}
        class={`flex items-center justify-center gap-3 px-10 py-4 rounded-full font-bold text-lg shadow-lg transition-all duration-300
          ${isInterviewActive
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:scale-105 hover:shadow-green-500/30'
          }`}
      >
        <Play class="w-6 h-6" />
        Start Interview
      </button>

      <button
        onClick={stopInterview}
        disabled={!isInterviewActive}
        class={`flex items-center justify-center gap-3 px-10 py-4 rounded-full font-bold text-lg shadow-lg transition-all duration-300
          ${!isInterviewActive
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-red-600 to-rose-700 text-white hover:scale-105 hover:shadow-red-500/30'
          }`}
      >
        <Square class="w-6 h-6" />
        End Interview
      </button>
    </div>

    {isInterviewActive && (
      <div class="bg-gray-900 rounded-3xl border border-gray-700 p-6 h-96 overflow-y-auto mb-4 custom-scrollbar-thin">
        {messages.map((msg, index) => (
          <div
            key={index}
            class={`my-4 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              class={`p-4 rounded-3xl max-w-[75%] shadow-lg
                ${msg.sender === 'user'
                  ? 'bg-purple-600 text-white rounded-br-none'
                  : msg.sender === 'ai'
                  ? 'bg-gray-700 text-white rounded-bl-none'
                  : 'bg-yellow-800 text-yellow-200 rounded-3xl'
                }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Uploading overlay */}
    {isUploading && (
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div class="bg-gray-900 p-8 rounded-2xl flex flex-col items-center gap-4 border border-gray-700">
          <div class="w-16 h-16 border-4 border-t-transparent border-purple-500 rounded-full animate-spin" />
          <div class="text-white text-lg font-semibold">Uploading interview video...</div>
          <div class="text-gray-400 text-sm">Please wait — you'll be redirected when complete.</div>
        </div>
      </div>
    )}

    {/* Uploaded message modal (brief) */}
    {uploadedVideoUrl && !isUploading && (
      <div class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div class="pointer-events-auto bg-green-900/90 text-white p-6 rounded-xl border border-green-600 shadow-lg">
          <div class="font-bold text-xl">Interview end and here is your interview video</div>
          <div class="text-sm mt-2 break-all">{uploadedVideoUrl}</div>
        </div>
      </div>
    )}

    {isInterviewActive && (
      <div class="flex items-center gap-4">
        <input
          type="text"
          placeholder="Type your message... (voice is primary)"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          class="flex-grow p-4 rounded-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200"
        />
        <button
          onClick={sendMessage}
          class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-full shadow-lg flex items-center gap-2 transition-transform duration-200 transform hover:scale-105"
        >
          <Send class="w-5 h-5" />
          Send
        </button>
      </div>
    )}
  </div>
</div>
  );
}