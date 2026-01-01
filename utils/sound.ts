import { GoogleGenAI, Modality } from "@google/genai";

export const playStart = () => {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn("Failed to play start sound", e);
  }
};

export const playAudio = (base64Audio: string): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(base64Audio);
      audio.onended = () => resolve();
      audio.onerror = (e) => {
        console.error("Audio playback error", e);
        resolve();
      };
      audio.play().catch(e => {
        console.error("Audio play() failed", e);
        resolve();
      });
    } catch (e) {
      console.error("Audio creation failed", e);
      resolve();
    }
  });
};

export const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const speakText = (text: string, voiceURI?: string) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    if (voiceURI) {
      const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
      if (selectedVoice) utterance.voice = selectedVoice;
    } 
    if (!utterance.voice) {
      utterance.lang = 'zh-CN';
      const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
      if (zhVoice) utterance.voice = zhVoice;
    }
    window.speechSynthesis.speak(utterance);
  }
};

export const getSystemVoices = (): SpeechSynthesisVoice[] => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.getVoices();
  }
  return [];
};

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function pcmToWavBase64(pcmData: Uint8Array, sampleRate: number = 24000): Promise<string> {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  view.setUint32(0, 0x52494646, false); 
  view.setUint32(4, 36 + pcmData.length, true); 
  view.setUint32(8, 0x57415645, false); 
  view.setUint32(12, 0x666d7420, false); 
  view.setUint16(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true); 
  view.setUint32(28, sampleRate * 2, true); 
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true); 
  view.setUint32(36, 0x64617461, false); 
  view.setUint32(40, pcmData.length, true); 

  const blob = new Blob([header, pcmData], { type: 'audio/wav' });
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

const sanitizeForTTS = (text: string): string => {
  // 移除所有可能干扰模型的符号，只保留文字和基本停顿
  let cleaned = text
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ') 
    .replace(/\s+/g, ' ')
    .trim();
  
  // 如果文本过短或为空，Gemini TTS 容易报错，补全它
  if (!cleaned || cleaned.length < 1) return "请运动";
  
  return cleaned;
};

export const generateAIVoice = async (text: string, voiceName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const sanitizedText = sanitizeForTTS(text);
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        // 关键修复：不再使用 "Say:" 前缀，因为在某些上下文模型会将其理解为对话指令
        // 直接发送要朗读的文本是 Gemini 2.5 TTS 的标准调用方式
        parts: [{ text: sanitizedText }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
          },
        }
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("模型未返回候选结果");
    }

    const candidate = response.candidates[0];

    // 处理特殊停止原因
    if (candidate.finishReason === 'SAFETY') {
      throw new Error("内容触发安全审核限制");
    }
    if (candidate.finishReason === 'OTHER' || candidate.finishReason === 'RECITATION') {
      throw new Error(`模型拒绝生成音频 (原因: ${candidate.finishReason})`);
    }

    let base64PCM: string | undefined;

    if (candidate.content?.parts) {
      const audioPart = candidate.content.parts.find(p => p.inlineData?.data);
      if (audioPart) {
        base64PCM = audioPart.inlineData!.data;
      }
    }

    if (!base64PCM) {
      throw new Error("响应中不包含有效的音频流数据");
    }
    
    const pcmBytes = decodeBase64(base64PCM);
    return await pcmToWavBase64(pcmBytes, 24000);
  } catch (error: any) {
    console.error("Gemini TTS 核心失败:", error);
    
    const errorStr = typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error));
    const code = error.status || error.code || (error.error?.code) || 0;

    // 针对 400 错误的特殊话术引导
    if (code === 400 || errorStr.includes("INVALID_ARGUMENT") || errorStr.includes("generate text")) {
      throw new Error("AI 朗读模式冲突 (400)。\n模型尝试进行文本对话而非单纯朗读。建议精简或更改动作名称。");
    }

    if (errorStr.includes("RESOURCE_EXHAUSTED") || code === 429) {
      throw new Error("AI 语音配额已耗尽或项目未开启计费。");
    }

    throw error;
  }
};