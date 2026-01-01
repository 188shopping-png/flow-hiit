import React, { useEffect, useState, useRef } from 'react';
import { ExecutionStep, CustomVoices } from '../types';
import { vibrate, speakText, playAudio, generateAIVoice } from '../utils/sound';
import { Pause, Play, X, SkipForward, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

interface RunSessionProps {
  queue: ExecutionStep[];
  onExit: () => void;
  customVoices: CustomVoices;
  selectedVoiceURI: string;
}

export const RunSession: React.FC<RunSessionProps> = ({ queue, onExit, customVoices, selectedVoiceURI }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(queue[0]?.duration || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [aiVoiceFailedCount, setAiVoiceFailedCount] = useState(0);
  
  const currentStep = queue[stepIndex];
  const nextStep = queue[stepIndex + 1];

  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.log('Wake Lock Error:', err);
    }
  };

  const announceStep = async (step: ExecutionStep) => {
    // 1. Handle Rest (Fixed to say "休息" specifically as requested)
    if (step.type === '休息') {
      if (customVoices.rest) {
        await playAudio(customVoices.rest);
      } else if (customVoices.useAICoach && aiVoiceFailedCount < 2) {
        setIsVoiceLoading(true);
        try {
          const voiceWav = await generateAIVoice("休息", customVoices.aiVoiceId || 'Zephyr');
          await playAudio(voiceWav);
        } catch (e: any) {
          setAiVoiceFailedCount(prev => prev + 1);
          speakText('休息', selectedVoiceURI);
        } finally {
          setIsVoiceLoading(false);
        }
      } else {
        speakText('休息', selectedVoiceURI);
      }
      return;
    }
    
    // 2. Handle Workout or Prep
    if (step.type === '运动' || step.type === '准备') {
      // Priority 1: User recorded voice for this action type
      const recordedVoice = step.type === '准备' ? customVoices.start : customVoices.work;
      if (recordedVoice) {
        await playAudio(recordedVoice);
      }

      // Priority 2: Dynamic AI Coach
      if (customVoices.useAICoach && aiVoiceFailedCount < 2) {
        setIsVoiceLoading(true);
        try {
          // Use specific group name if it exists (itemName is already pre-filled in App.tsx)
          const voiceWav = await generateAIVoice(step.itemName, customVoices.aiVoiceId || 'Zephyr');
          await playAudio(voiceWav);
        } catch (e: any) {
          console.warn("AI Voice failed, falling back:", e.message || e);
          setAiVoiceFailedCount(prev => prev + 1);
          speakText(step.itemName, selectedVoiceURI);
        } finally {
          setIsVoiceLoading(false);
        }
      } else {
        // Priority 3: System TTS
        speakText(step.itemName, selectedVoiceURI);
      }
    }
  };

  useEffect(() => {
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    setIsRunning(true);
    
    if (queue[0]) {
      announceStep(queue[0]);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch((e: any) => console.log(e));
      }
      setIsRunning(false);
    };
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 0) {
          return prev - 1;
        }
        return 0;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, stepIndex]);

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      handleStepComplete();
    }
  }, [timeLeft, isRunning]);

  const handleStepComplete = async () => {
    if (stepIndex >= queue.length - 1) {
      setIsRunning(false);
      setIsFinished(true);
      
      if (customVoices.complete) {
        await playAudio(customVoices.complete);
      } else {
        speakText("训练完成", selectedVoiceURI);
      }
      vibrate([200, 100, 200]);
    } else {
      const nextIdx = stepIndex + 1;
      const nextItem = queue[nextIdx];
      
      setStepIndex(nextIdx);
      setTimeLeft(nextItem.duration);
      
      vibrate(200);
      announceStep(nextItem);
    }
  };

  const togglePlay = () => {
    setIsRunning(!isRunning);
  };

  const skipStep = () => {
    handleStepComplete();
  };

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-40 bg-[#1C1B1F] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="w-32 h-32 bg-[#D0BCFF] rounded-[2.5rem] flex items-center justify-center mb-8 text-[#381E72] shadow-xl">
          <CheckCircle2 size={64} strokeWidth={2.5} />
        </div>
        <h1 className="text-5xl font-black text-white mb-4">训练完成</h1>
        <p className="text-[#CCC2DC] mb-16 text-lg">汗水不会欺骗你。</p>
        <button 
          onClick={onExit}
          className="bg-[#D0BCFF] text-[#381E72] px-12 py-5 rounded-2xl font-black text-xl active:scale-95"
        >
          返回主页
        </button>
      </div>
    );
  }

  if (!currentStep) return null;

  const duration = currentStep.duration || 1; 
  const progress = 100 - (timeLeft / duration) * 100;
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = 880 - (880 * safeProgress) / 100;

  return (
    <div className="fixed inset-0 z-40 bg-[#121212] flex flex-col">
      <div className="flex justify-between items-center p-6 bg-gradient-to-b from-black/40 to-transparent">
        <button 
          onClick={onExit} 
          className="p-3 rounded-2xl bg-[#1C1B1F]/60 text-white backdrop-blur-md border border-white/10"
        >
          <X size={24} />
        </button>
        <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#1C1B1F]/60 backdrop-blur-md border border-white/10">
          <span className="text-[#D0BCFF] font-black font-mono">{stepIndex + 1}</span>
          <span className="text-white/40 text-xs font-bold">/ {queue.length}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
          <div 
            className="absolute inset-4 rounded-full blur-[40px] opacity-20 transition-all duration-1000"
            style={{ backgroundColor: currentStep.color }}
          />
          
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" stroke="#1C1B1F" strokeWidth="10" fill="transparent" />
            <circle
              cx="150"
              cy="150"
              r="140"
              stroke={currentStep.color}
              strokeWidth="14"
              fill="transparent"
              strokeDasharray="880"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-9xl font-black font-mono text-white drop-shadow-2xl">
              {timeLeft}
            </span>
            <div 
              className="mt-2 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em]"
              style={{ backgroundColor: currentStep.color, color: '#000' }}
            >
              {currentStep.type}
            </div>
          </div>

          {isVoiceLoading && (
            <div className="absolute -top-4 right-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D0BCFF] text-[#381E72] text-[10px] font-black shadow-lg animate-bounce">
              <Loader2 size={12} className="animate-spin" />
              AI 朗读中...
            </div>
          )}
        </div>

        <div className="mt-12 text-center max-w-full">
           <h2 className="text-4xl font-black text-white leading-tight break-words px-4">
            {currentStep.name}
          </h2>
          {currentStep.totalSteps > 1 && (
            <div className="mt-2 text-[#938F99] font-bold tracking-widest uppercase text-sm">
              ROUND {currentStep.currentStep} OF {currentStep.totalSteps}
            </div>
          )}
        </div>
      </div>

      <div className="mx-6 mb-4 bg-[#1C1B1F] rounded-[2rem] p-5 border border-white/5 flex items-center justify-between">
        <div className="flex flex-col flex-1 min-w-0 pr-4">
          <span className="text-[10px] text-[#D0BCFF] font-black uppercase tracking-widest mb-1 opacity-80">下一步 UP NEXT</span>
          {nextStep ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xl text-white font-bold truncate">{nextStep.name}</span>
            </div>
          ) : (
            <span className="text-xl text-[#4CD964] font-bold">准备庆祝!</span>
          )}
        </div>
        <div 
          className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center shadow-inner relative overflow-hidden shrink-0"
          style={{ backgroundColor: nextStep ? `${nextStep.color}20` : '#121212' }}
        >
          {nextStep && <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: nextStep.color }} />}
          <span className="text-2xl font-black font-mono" style={{ color: nextStep ? nextStep.color : '#333' }}>
            {nextStep ? nextStep.duration : '0'}
          </span>
        </div>
      </div>

      <div className="p-8 pb-12 flex justify-center items-center gap-10">
        <button 
          onClick={skipStep}
          className="w-16 h-16 bg-[#2B2930] rounded-full flex items-center justify-center text-[#E6E1E5] active:scale-90"
        >
          <SkipForward size={28} />
        </button>

        <button 
          onClick={togglePlay}
          className="w-24 h-24 bg-[#D0BCFF] rounded-[2.5rem] flex items-center justify-center text-[#381E72] shadow-xl active:scale-90"
        >
          {isRunning ? (
            <Pause size={42} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play size={42} fill="currentColor" strokeWidth={0} className="ml-2" />
          )}
        </button>
        
        <div className="w-16 h-16" />
      </div>
    </div>
  );
};