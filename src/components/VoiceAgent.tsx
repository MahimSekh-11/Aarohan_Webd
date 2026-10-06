import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from './NotificationProvider';

export default function VoiceAgent() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  
  const { currentLang, translate } = useLanguageStore();
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const addNotification = useNotificationStore(state => state.addNotification);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processAudio(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        addNotification({
          id: Date.now().toString(),
          message: 'Could not access microphone',
          type: 'error'
        });
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    try {
      const res = await fetch('/api/ai/transcribe-and-intent', {
        method: 'POST',
        body: formData,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      
      if (data.intent) {
        const { action, message, data: payload } = data.intent;
        
        // Speak message back (if browser supports it)
        if ('speechSynthesis' in window && message) {
          const msg = new SpeechSynthesisUtterance(message);
          window.speechSynthesis.speak(msg);
        }

        addNotification({
          id: Date.now().toString(),
          message: `${translate('You said:')} "${data.transcript}".\n${translate('Action:')} ${message}`,
          type: 'success'
        });

        if (action === 'create_product' && user?.role === 'manager') {
          // Auto create product via API
          const createRes = await fetch('/api/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
          if (createRes.ok) {
            navigate('/manager'); // refresh or show manager dashboard
          }
        } else if (action === 'search_product') {
          navigate(`/?search=${encodeURIComponent(payload.search)}`);
        }
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      addNotification({
        id: Date.now().toString(),
        message: 'Failed to process audio command',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={toggleRecording}
        disabled={isProcessing}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-[#10B981] hover:bg-[#059669] cyber-btn-premium'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={translate(isRecording ? "Stop Recording" : "Speak to Agent")}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </button>
      
      {/* Optional helper text */}
      {(isRecording || isProcessing) && (
        <div className="absolute bottom-16 right-0 bg-[#1E293B] border border-[#334155] text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap text-[#10B981] animate-fade-in shadow-lg">
          {isProcessing ? translate("Processing...") : translate("Listening...")}
        </div>
      )}
    </div>
  );
}
