import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2, RefreshCw } from 'lucide-react';

interface VoiceRecorderProps {
  label: string;
  existingAudio?: string;
  onSave: (base64: string | undefined) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ label, existingAudio, onSave }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(existingAudio);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setAudioUrl(base64);
          onSave(base64);
        };
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风，请检查权限设置");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const deleteRecording = () => {
    setAudioUrl(undefined);
    onSave(undefined);
  };

  return (
    <div className="bg-[#2C2C2C] p-4 rounded-xl border border-[#444] mb-3">
      <div className="flex justify-between items-center mb-3">
        <span className="text-white font-medium text-sm">{label}</span>
        {isRecording && <span className="text-[#FFB4AB] text-xs animate-pulse">● 录音中...</span>}
      </div>
      
      <div className="flex gap-2">
        {!isRecording ? (
          !audioUrl ? (
            <button onClick={startRecording} className="flex-1 bg-[#444] hover:bg-[#555] text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
              <Mic size={16} /> 录制
            </button>
          ) : (
            <>
              <button onClick={playRecording} className="flex-1 bg-[#D0BCFF] text-[#381E72] py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
                <Play size={16} /> 试听
              </button>
              <button onClick={deleteRecording} className="w-10 bg-[#333] text-[#FFB4AB] rounded-lg flex items-center justify-center hover:bg-[#3E2C2C]">
                <Trash2 size={16} />
              </button>
              <button onClick={startRecording} className="w-10 bg-[#333] text-white rounded-lg flex items-center justify-center hover:bg-[#444]">
                <RefreshCw size={16} />
              </button>
            </>
          )
        ) : (
          <button onClick={stopRecording} className="flex-1 bg-[#FFB4AB] text-[#690005] py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
            <Square size={16} fill="currentColor" /> 停止
          </button>
        )}
      </div>
    </div>
  );
};