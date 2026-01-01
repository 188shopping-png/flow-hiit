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

/**
 * 严格净化文本，防止 Gemini 产生对话欲望
 */
const sanitizeForTTS = (text: string): string => {
  let cleaned = text
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ') 
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!cleaned || cleaned.length < 1) return "开始运动";
  
  // 限制长度，防止模型超时或产生幻觉
  return cleaned.substring(0, 50);
};

export const generateAIVoice = async (text: string, voiceName: string): Promise<string> => {
  // 注意：在调用此函数前，环境必须注入 API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const sanitizedText = sanitizeForTTS(text);
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        // 关键：不加任何前缀，只发送朗读内容
        parts: [{ text: sanitizedText }] 
      }],
      config: {
        // 强制仅音频模式
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
          },
        }
      },
    });

    if (!response.candidates?.[0]) {
      throw new Error("模型响应为空");
    }

    const candidate = response.candidates[0];

    // 检查模型是否误输出了文字内容（这是 400 错误的根源）
    const textPart = candidate.content?.parts.find(p => p.text);
    if (textPart && textPart.text) {
      console.warn("检测到模型输出了文本而非纯音频，强制重试或降级。内容:", textPart.text);
      // 如果模型输出了文本，说明它违背了 TTS 模式，直接抛出错误触发降级
      throw new Error("RecitationError: Model generated text instead of audio.");
    }

    if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'OTHER') {
      throw new Error(`生成失败 (原因: ${candidate.finishReason})`);
    }

    let base64PCM: string | undefined;
    if (candidate.content?.parts) {
      const audioPart = candidate.content.parts.find(p => p.inlineData?.data);
      if (audioPart) {
        base64PCM = audioPart.inlineData!.data;
      }
    }

    if (!base64PCM) {
      throw new Error("响应中缺失音频流");
    }
    
    const pcmBytes = decodeBase64(base64PCM);
    return await pcmToWavBase64(pcmBytes, 24000);
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};