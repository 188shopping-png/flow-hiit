import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, Loader2, Key, Info, RefreshCw } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { TimerType, COLORS, WorkoutRoutine } from '../types';

interface AIGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (routine: WorkoutRoutine) => void;
}

const PRESETS = ["15分钟核心强化", "极速燃脂 Tabata", "全身耐力挑战", "办公室久坐拉伸"];

export const AIGeneratorDialog: React.FC<AIGeneratorDialogProps> = ({ isOpen, onClose, onGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkKey();
    }
  }, [isOpen]);

  const checkKey = async () => {
    // @ts-ignore
    const selected = await window.aistudio.hasSelectedApiKey();
    setHasKey(selected);
  };

  const handleOpenKeySelector = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasKey(true); 
    setErrorMessage(null); // 重置错误状态
  };

  const generateWorkout = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `作为一个专业的 HIIT 健身教练，请根据我的需求生成一套训练计划：${prompt}。`,
        config: {
          systemInstruction: "你必须输出且仅输出一个合法的 JSON 对象，代表一套 HIIT 训练计划。JSON 结构必须匹配：{ name: string, items: Array<{ type: 'SIMPLE'|'INTERVAL', name: string, duration: number, restDuration: number, rounds: number, color: string }> }。颜色必须从以下数组中选择：['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#00E5FF', '#2979FF', '#AF52DE', '#FF2D55']。",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["SIMPLE", "INTERVAL"] },
                    name: { type: Type.STRING },
                    duration: { type: Type.NUMBER },
                    restDuration: { type: Type.NUMBER },
                    rounds: { type: Type.NUMBER },
                    color: { type: Type.STRING }
                  },
                  required: ["type", "name", "duration", "color"]
                }
              }
            },
            required: ["name", "items"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("AI 返回了空内容");
      
      const data = JSON.parse(text);
      
      const newRoutine: WorkoutRoutine = {
        id: crypto.randomUUID(),
        name: data.name || "AI 生成计划",
        createdAt: Date.now(),
        items: data.items.map((item: any) => ({
          ...item,
          id: crypto.randomUUID(),
          soundEnabled: true,
          vibrationEnabled: true,
          rounds: item.rounds || 1,
          restDuration: item.restDuration || 0
        }))
      };

      onGenerated(newRoutine);
      setPrompt('');
      onClose();
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      const errorStr = typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error));
      
      if (errorStr.includes("API_KEY_HTTP_REFERRER_BLOCKED") || errorStr.includes("403")) {
        setHasKey(false);
        setErrorMessage("当前密钥受限 (403)。请在 Google Cloud 控制台取消 API Key 的 HTTP 网站来源限制。");
      } else if (errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("429") || errorStr.includes("limit: 0")) {
        setHasKey(false);
        if (errorStr.includes("limit: 0") || errorStr.includes("billing")) {
          setErrorMessage("项目未就绪 (429: limit 0)。\n原因：当前选用的项目未开启结算(Billing)或配额被禁用。\n解决：请点击下方按钮，重新选择一个已开启‘按需计费’的付费项目。");
        } else {
          setErrorMessage("配额暂时耗尽 (429)。请稍后再试，或切换到一个已付费项目。");
        }
      } else if (errorStr.includes("not found")) {
        setHasKey(false);
        setErrorMessage("找不到所选的 API 项目或密钥已失效。请点击下方按钮重新配置。");
      } else {
        setErrorMessage("生成失败，请检查您的网络连接。原因: " + (error.message || "未知错误"));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-[#1E1E1E] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-[#333] animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D0BCFF] to-[#AF52DE] flex items-center justify-center text-[#1E1E1E]">
              <Sparkles size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">AI 智能教练</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#333] text-white">
            <X size={24} />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-2xl">
            <p className="text-xs text-red-200 leading-relaxed whitespace-pre-line">{errorMessage}</p>
            <button 
              onClick={handleOpenKeySelector}
              className="mt-3 text-xs text-white bg-red-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-red-500/60 transition-colors"
            >
              <RefreshCw size={12} /> 重新选择 API 项目
            </button>
          </div>
        )}

        {!hasKey && !errorMessage ? (
          <div className="bg-[#2C2C2C] p-6 rounded-2xl border border-dashed border-[#444] text-center">
            <Key size={48} className="mx-auto mb-4 text-[#D0BCFF] opacity-50" />
            <h3 className="text-white font-medium mb-2">需要配置 API</h3>
            <p className="text-sm text-[#888] mb-6 leading-relaxed">
              为了使用 AI 功能，请选择一个<b>已启用结算</b>的付费 Google Cloud 项目。
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleOpenKeySelector}
                className="w-full bg-[#D0BCFF] text-[#381E72] py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all"
              >
                选择付费项目 Key
              </button>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                className="text-[#D0BCFF] text-xs flex items-center justify-center gap-1 hover:underline"
              >
                <Info size={12} /> 查看计费文档与说明
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs text-[#888] uppercase tracking-wider">你的健身目标</label>
                <button 
                  onClick={handleOpenKeySelector}
                  className="text-[10px] text-[#D0BCFF] opacity-60 hover:opacity-100 flex items-center gap-1"
                >
                  <RefreshCw size={10} /> 更换项目
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：我想在15分钟内快速燃烧热量，重点练习腹部..."
                className="w-full bg-[#2C2C2C] text-white p-4 rounded-2xl border border-[#444] focus:border-[#D0BCFF] focus:outline-none h-32 resize-none text-sm transition-colors"
                disabled={isGenerating}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button 
                  key={p} 
                  onClick={() => setPrompt(p)}
                  className="px-3 py-1.5 rounded-full bg-[#333] text-[#aaa] text-xs hover:bg-[#444] hover:text-white transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={generateWorkout}
              disabled={isGenerating || !prompt.trim()}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                isGenerating || !prompt.trim() 
                ? 'bg-[#333] text-[#666] cursor-not-allowed' 
                : 'bg-gradient-to-r from-[#D0BCFF] to-[#AF52DE] text-white shadow-lg hover:shadow-[#D0BCFF40] active:scale-95'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  正在设计定制计划...
                </>
              ) : (
                <>
                  <Send size={20} />
                  开始 AI 生成
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};