import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Upload, Mic, Volume2, PlayCircle, Sparkles, Loader2, Wand2, MessageSquare, Save, ToggleLeft, ToggleRight, Key, RefreshCw, AlertCircle } from 'lucide-react';
import { CustomVoices } from '../types';
import { VoiceRecorder } from './VoiceRecorder';
import { speakText, getSystemVoices, generateAIVoice, playAudio } from '../utils/sound';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  customVoices: CustomVoices;
  onUpdateVoices: (voices: CustomVoices) => void;
  selectedVoiceURI: string;
  onSelectVoiceURI: (uri: string) => void;
}

export const AI_VOICES = [
  { id: 'Zephyr', name: '阳光 Zephyr', desc: '活力充沛，适合高强度训练' },
  { id: 'Kore', name: '严厉 Kore', desc: '充满力量，像你的私人教官' },
  { id: 'Puck', name: '热情 Puck', desc: '亲切友好，运动不再孤单' },
  { id: 'Charon', name: '冷静 Charon', desc: '平和稳定，适合瑜伽和拉伸' },
  { id: 'Fenrir', name: '深沉 Fenrir', desc: '磁性嗓音，富有节奏感' },
];

const ACTION_LABELS: Record<string, string> = {
  start: '开始训练',
  work: '运动开始',
  rest: '休息时间',
  complete: '全部完成'
};

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ 
  isOpen, 
  onClose, 
  onExport, 
  onImport,
  customVoices,
  onUpdateVoices,
  selectedVoiceURI,
  onSelectVoiceURI
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showTTS, setShowTTS] = useState(false);
  const [showAILab, setShowAILab] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  
  // Custom AI Input states
  const [customText, setCustomText] = useState('');
  const [targetAction, setTargetAction] = useState<string>('start');

  useEffect(() => {
    if (isOpen) {
      const loadVoices = () => setAvailableVoices(getSystemVoices());
      loadVoices();
      checkApiKey();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, [isOpen]);

  const checkApiKey = async () => {
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    setHasApiKey(hasKey);
  };

  const handleOpenKeySelector = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    checkApiKey(); // 重新检查状态
  };

  const handleGenerateAI = async (key: string, text: string) => {
    const textToUse = text.trim();
    if (!textToUse) return;

    setIsGenerating(key);
    try {
      const base64Wav = await generateAIVoice(textToUse, customVoices.aiVoiceId || 'Zephyr');
      onUpdateVoices({ ...customVoices, [key]: base64Wav });
      await playAudio(base64Wav);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "AI 语音生成失败，请检查 API 密钥设置或网络连接。");
    } finally {
      setIsGenerating(null);
    }
  };

  const handleToggleAICoach = () => {
    onUpdateVoices({ ...customVoices, useAICoach: !customVoices.useAICoach });
  };

  const handleSelectAIVoice = (id: string) => {
    onUpdateVoices({ ...customVoices, aiVoiceId: id });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1C1B1F] w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-[#49454F]/30 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-bold text-[#E6E1E5]">设置</h2>
          <button onClick={onClose} className="p-3 rounded-full hover:bg-[#49454F]/40 text-[#E6E1E5]">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1 pb-4">
          
          {!showVoiceSettings && !showTTS && !showAILab && (
            <div className="space-y-3">
              {/* API Key Management Card */}
              <div className="bg-[#2B2930] p-4 rounded-2xl border border-[#49454F]/30 flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${hasApiKey ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    <Key size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#E6E1E5]">AI 项目密钥</div>
                    <div className="text-[10px] text-[#938F99]">{hasApiKey ? '已连接付费项目' : '未配置项目'}</div>
                  </div>
                </div>
                <button 
                  onClick={handleOpenKeySelector}
                  className="px-3 py-1.5 rounded-xl bg-[#49454F] hover:bg-[#555] text-[#D0BCFF] text-[10px] font-bold flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={12} />
                  {hasApiKey ? '切换账号/项目' : '选择付费项目'}
                </button>
              </div>

              <button
                onClick={() => setShowAILab(true)}
                className="w-full bg-gradient-to-br from-[#D0BCFF] to-[#AF52DE] p-4 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-all text-left group shadow-lg"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <Sparkles size={22} />
                </div>
                <div>
                  <div className="text-[#381E72] font-black">AI 语音实验室</div>
                  <div className="text-[#381E72]/70 text-xs font-bold">使用 Gemini AI 实时朗读训练</div>
                </div>
              </button>

              <button onClick={() => setShowVoiceSettings(true)} className="w-full bg-[#2B2930] p-4 rounded-2xl flex items-center gap-4 hover:bg-[#49454F]/50 transition-all border border-[#49454F]/30 text-left">
                <div className="w-10 h-10 rounded-full bg-[#49454F] flex items-center justify-center text-[#D0BCFF]"><Mic size={20} /></div>
                <div><div className="text-[#E6E1E5] font-medium">手动录制提示音</div><div className="text-xs text-[#938F99]">录制你自己的声音</div></div>
              </button>

              <button onClick={() => setShowTTS(true)} className="w-full bg-[#2B2930] p-4 rounded-2xl flex items-center gap-4 hover:bg-[#49454F]/50 transition-all border border-[#49454F]/30 text-left">
                <div className="w-10 h-10 rounded-full bg-[#49454F] flex items-center justify-center text-[#D0BCFF]"><Volume2 size={20} /></div>
                <div><div className="text-[#E6E1E5] font-medium">系统 TTS 设置</div><div className="text-xs text-[#938F99]">调整内置合成语音</div></div>
              </button>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={onExport} className="bg-[#2B2930] p-4 rounded-2xl flex flex-col items-center gap-2 border border-[#49454F]/30 hover:bg-[#49454F]/50">
                  <Download size={20} className="text-[#D0BCFF]" /><span className="text-xs text-[#E6E1E5]">备份计划</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-[#2B2930] p-4 rounded-2xl flex flex-col items-center gap-2 border border-[#49454F]/30 hover:bg-[#49454F]/50">
                  <Upload size={20} className="text-[#D0BCFF]" /><span className="text-xs text-[#E6E1E5]">导入计划</span>
                </button>
              </div>
            </div>
          )}

          {showAILab && (
            <div className="animate-in slide-in-from-right duration-200 space-y-4">
              <button onClick={() => setShowAILab(false)} className="text-[#D0BCFF] text-sm font-bold flex items-center gap-1 mb-2">&larr; 返回</button>
              
              {/* Billing Info Notice */}
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex gap-3">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/80 leading-relaxed font-bold">
                  Gemini 预览版语音功能必须使用已关联结算账户 (Billing Account) 的 Google Cloud 付费项目。免费层级可能无法正常使用。
                </p>
              </div>

              {/* Dynamic AI Coach Toggle */}
              <div className="bg-[#381E72]/40 p-5 rounded-3xl border border-[#D0BCFF]/30 flex items-center justify-between shadow-inner">
                <div className="flex-1">
                  <div className="text-[#D0BCFF] font-black text-sm">AI 动态朗读模式</div>
                  <div className="text-[#D0BCFF]/60 text-[10px] font-bold">开启后 AI 教练将朗读你的所有动作名称</div>
                </div>
                <button onClick={handleToggleAICoach} className="text-[#D0BCFF] transition-transform active:scale-90">
                  {customVoices.useAICoach ? <ToggleRight size={48} /> : <ToggleLeft size={48} className="opacity-40" />}
                </button>
              </div>

              {/* Voice Selector */}
              <div className="bg-[#2B2930] p-4 rounded-2xl border border-[#49454F]/30">
                <label className="block text-[#D0BCFF] text-[10px] font-black uppercase tracking-widest mb-3">选择你的专属教练</label>
                <div className="grid grid-cols-1 gap-2">
                  {AI_VOICES.map(v => (
                    <button 
                      key={v.id}
                      onClick={() => handleSelectAIVoice(v.id)}
                      className={`w-full p-3 rounded-xl flex items-center justify-between border transition-all ${customVoices.aiVoiceId === v.id ? 'bg-[#D0BCFF] border-[#D0BCFF] text-[#381E72]' : 'bg-[#1C1B1F] border-[#49454F] text-[#E6E1E5]'}`}
                    >
                      <div className="text-left">
                        <div className="font-bold text-sm">{v.name}</div>
                        <div className={`text-[10px] ${customVoices.aiVoiceId === v.id ? 'text-[#381E72]/70' : 'text-[#938F99]'}`}>{v.desc}</div>
                      </div>
                      {customVoices.aiVoiceId === v.id && <Wand2 size={16} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input Lab */}
              <div className="bg-[#2B2930] p-4 rounded-2xl border border-[#49454F]/30 space-y-3">
                <div className="flex items-center gap-2 text-[#D0BCFF]">
                  <MessageSquare size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">固定话术定制</span>
                </div>
                
                <textarea 
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="输入话术，如：加油，再来一组！"
                  className="w-full bg-[#1C1B1F] text-[#E6E1E5] p-3 rounded-xl border border-[#49454F] text-sm focus:outline-none focus:border-[#D0BCFF] min-h-[60px] resize-none"
                />

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-[#938F99] font-bold uppercase ml-1">应用于哪个环节？</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['start', 'work', 'rest', 'complete'].map(key => (
                      <button 
                        key={key}
                        onClick={() => setTargetAction(key)}
                        className={`py-2 px-3 rounded-lg text-[10px] font-bold border transition-all ${targetAction === key ? 'bg-[#D0BCFF] text-[#381E72] border-[#D0BCFF]' : 'bg-[#2B2930] text-[#938F99] border-[#49454F]'}`}
                      >
                        {ACTION_LABELS[key]}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => handleGenerateAI(targetAction, customText)}
                  disabled={!customText.trim() || isGenerating !== null}
                  className="w-full bg-[#D0BCFF]/20 text-[#D0BCFF] border border-[#D0BCFF]/30 py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-[#D0BCFF]/30 transition-all disabled:opacity-30"
                >
                  {isGenerating === targetAction ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  更新该环节录音
                </button>
              </div>
            </div>
          )}

          {showVoiceSettings && (
            <div className="animate-in slide-in-from-right duration-200">
               <button onClick={() => setShowVoiceSettings(false)} className="mb-4 text-[#D0BCFF] text-sm font-bold flex items-center gap-1">&larr; 返回</button>
               <VoiceRecorder label="开始训练 (Start)" existingAudio={customVoices.start} onSave={(data) => onUpdateVoices({...customVoices, start: data})} />
               <VoiceRecorder label="运动开始 (Workout)" existingAudio={customVoices.work} onSave={(data) => onUpdateVoices({...customVoices, work: data})} />
               <VoiceRecorder label="休息开始 (Rest)" existingAudio={customVoices.rest} onSave={(data) => onUpdateVoices({...customVoices, rest: data})} />
               <VoiceRecorder label="训练完成 (Finished)" existingAudio={customVoices.complete} onSave={(data) => onUpdateVoices({...customVoices, complete: data})} />
            </div>
          )}

          {showTTS && (
            <div className="animate-in slide-in-from-right duration-200">
              <button onClick={() => setShowTTS(false)} className="mb-4 text-[#D0BCFF] text-sm font-bold flex items-center gap-1">&larr; 返回</button>
               <div className="bg-[#2B2930] p-4 rounded-2xl border border-[#49454F]/30">
                 <label className="block text-[#E6E1E5] font-medium text-sm mb-3">系统自带合成语音</label>
                 <select value={selectedVoiceURI} onChange={(e) => onSelectVoiceURI(e.target.value)} className="w-full bg-[#1C1B1F] text-[#E6E1E5] p-3 rounded-xl border border-[#49454F] text-sm focus:outline-none focus:border-[#D0BCFF] mb-4">
                   <option value="">默认系统语音</option>
                   {availableVoices.map(voice => (<option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>))}
                 </select>
                 <button onClick={() => speakText("测试语音，准备开始运动", selectedVoiceURI)} className="w-full bg-[#49454F] hover:bg-[#555] text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"><PlayCircle size={18} /> 试听</button>
               </div>
            </div>
          )}
          
          <input type="file" ref={fileInputRef} onChange={(e) => { if(e.target.files?.[0]) onImport(e.target.files[0]); e.target.value = ''; }} accept=".json" className="hidden" />
        </div>
        
        <div className="mt-4 text-center shrink-0"><p className="text-[10px] text-[#49454F] font-bold tracking-widest uppercase">Flow HIIT AI Edition</p></div>
      </div>
    </div>
  );
};