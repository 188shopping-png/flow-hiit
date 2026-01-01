
import React, { useState, useEffect } from 'react';
import { TimerItem, TimerType, COLORS } from '../types';
import { X, Check, Clock, RotateCcw, ListTodo } from 'lucide-react';

interface EditDialogProps {
  isOpen: boolean;
  initialItem?: TimerItem | null;
  onClose: () => void;
  onSave: (item: TimerItem) => void;
}

const DEFAULT_ITEM: TimerItem = {
  id: '',
  type: TimerType.SIMPLE,
  name: '新项目',
  duration: 30,
  restDuration: 10,
  rounds: 4,
  roundNames: [],
  color: COLORS[0],
  soundEnabled: true,
  vibrationEnabled: true
};

export const EditDialog: React.FC<EditDialogProps> = ({ isOpen, initialItem, onClose, onSave }) => {
  const [formData, setFormData] = useState<TimerItem>(DEFAULT_ITEM);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialItem ? { ...initialItem } : { ...DEFAULT_ITEM, id: crypto.randomUUID(), color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    }
  }, [isOpen, initialItem]);

  const handleRoundsChange = (val: number) => {
    const newRoundNames = [...(formData.roundNames || [])];
    // Adjust array size to match rounds
    if (newRoundNames.length < val) {
      for (let i = newRoundNames.length; i < val; i++) {
        newRoundNames[i] = "";
      }
    } else if (newRoundNames.length > val) {
      newRoundNames.length = val;
    }
    setFormData({ ...formData, rounds: val, roundNames: newRoundNames });
  };

  const handleRoundNameChange = (index: number, name: string) => {
    const newRoundNames = [...(formData.roundNames || [])];
    newRoundNames[index] = name;
    setFormData({ ...formData, roundNames: newRoundNames });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#1C1B1F] w-full max-w-md rounded-[2rem] p-6 shadow-2xl border border-[#49454F]/30 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-[#E6E1E5]">
              {initialItem ? '编辑项目' : '添加新动作'}
            </h2>
            <p className="text-xs text-[#938F99] mt-0.5">定制你的专属训练节奏</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 rounded-full hover:bg-[#49454F]/40 text-[#E6E1E5] transition-colors active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-1 pb-4">
          
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-2 bg-[#2B2930] p-1.5 rounded-2xl border border-[#49454F]/20">
            <button
              className={`py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                formData.type === TimerType.SIMPLE 
                ? 'bg-[#D0BCFF] text-[#381E72] shadow-lg' 
                : 'text-[#CAC4D0] hover:bg-[#49454F]/30'
              }`}
              onClick={() => setFormData({ ...formData, type: TimerType.SIMPLE })}
            >
              <Clock size={18} />
              普通计时
            </button>
            <button
              className={`py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                formData.type === TimerType.INTERVAL 
                ? 'bg-[#D0BCFF] text-[#381E72] shadow-lg' 
                : 'text-[#CAC4D0] hover:bg-[#49454F]/30'
              }`}
              onClick={() => setFormData({ ...formData, type: TimerType.INTERVAL })}
            >
              <RotateCcw size={18} />
              循环/间隔
            </button>
          </div>

          {/* Name */}
          <div className="group">
            <label className="block text-xs font-bold text-[#D0BCFF] mb-2 ml-1 uppercase tracking-widest">项目总名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#2B2930] text-[#E6E1E5] p-4 rounded-2xl border border-[#49454F] focus:border-[#D0BCFF] focus:ring-1 focus:ring-[#D0BCFF] focus:outline-none text-lg font-medium transition-all placeholder:text-[#49454F]"
              placeholder="例如：腹部轰炸"
            />
          </div>

          {/* Durations */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#D0BCFF] mb-2 ml-1 uppercase tracking-widest">运动 (秒)</label>
              <input
                type="number"
                pattern="[0-9]*"
                inputMode="numeric"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Math.max(0, Number(e.target.value)) })}
                className="w-full bg-[#2B2930] text-[#E6E1E5] p-5 rounded-2xl border border-[#49454F] focus:border-[#D0BCFF] focus:outline-none text-2xl font-mono font-bold text-center"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#D0BCFF] mb-2 ml-1 uppercase tracking-widest">休息 (秒)</label>
              <input
                type="number"
                pattern="[0-9]*"
                inputMode="numeric"
                value={formData.restDuration ?? 0}
                onChange={(e) => setFormData({ ...formData, restDuration: Math.max(0, Number(e.target.value)) })}
                className="w-full bg-[#2B2930] text-[#E6E1E5] p-5 rounded-2xl border border-[#49454F] focus:border-[#D0BCFF] focus:outline-none text-2xl font-mono font-bold text-center"
                placeholder="0"
              />
            </div>
          </div>

          {/* Rounds & Individual Names */}
          {formData.type === TimerType.INTERVAL && (
            <div className="space-y-4">
              <div className="bg-[#2B2930]/50 p-4 rounded-2xl border border-[#49454F]/30">
                <label className="block text-xs font-bold text-[#D0BCFF] mb-4 ml-1 uppercase tracking-widest">重复组数 (ROUNDS)</label>
                <div className="flex items-center gap-6">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={formData.rounds}
                    onChange={(e) => handleRoundsChange(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-[#49454F] rounded-lg appearance-none cursor-pointer accent-[#D0BCFF]"
                  />
                  <div className="min-w-[4rem] text-center">
                    <span className="text-3xl font-mono text-[#D0BCFF] font-black">{formData.rounds}</span>
                    <span className="text-[10px] block text-[#938F99] font-bold">组</span>
                  </div>
                </div>
              </div>

              {/* Individual Round Names */}
              <div className="bg-[#2B2930]/30 p-4 rounded-2xl border border-[#49454F]/20 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                   <ListTodo size={16} className="text-[#D0BCFF]" />
                   <label className="text-xs font-bold text-[#D0BCFF] uppercase tracking-widest">分步朗读名称 (可选)</label>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: formData.rounds || 1 }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-8 text-[10px] font-mono text-[#938F99] font-bold">R{idx + 1}</span>
                      <input
                        type="text"
                        value={formData.roundNames?.[idx] || ""}
                        onChange={(e) => handleRoundNameChange(idx, e.target.value)}
                        placeholder={`组 ${idx + 1} 的动作名称`}
                        className="flex-1 bg-[#1C1B1F] text-[#E6E1E5] p-3 rounded-xl border border-[#49454F]/50 focus:border-[#D0BCFF] focus:outline-none text-sm transition-all"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#938F99] mt-2 italic px-1">如果不填写，将默认朗读项目总名称。</p>
              </div>
            </div>
          )}

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-bold text-[#D0BCFF] mb-3 ml-1 uppercase tracking-widest">视觉主题</label>
            <div className="grid grid-cols-4 gap-4 px-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFormData({ ...formData, color: c })}
                  className={`aspect-square rounded-2xl transition-all duration-300 relative flex items-center justify-center ${
                    formData.color === c 
                    ? 'scale-110 shadow-[0_0_20px_rgba(208,188,255,0.3)]' 
                    : 'opacity-40 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {formData.color === c && (
                    <div className="absolute inset-0 border-4 border-white/40 rounded-2xl animate-pulse" />
                  )}
                  {formData.color === c && <Check size={20} className="text-white drop-shadow-md" />}
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="mt-4 pt-6 border-t border-[#49454F]/30 flex justify-end shrink-0 gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl font-bold text-[#D0BCFF] hover:bg-[#D0BCFF]/10 transition-colors active:scale-95"
          >
            取消
          </button>
          <button
            onClick={() => onSave(formData)}
            className="flex-[2] bg-[#D0BCFF] text-[#381E72] px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-[#EADDFF] shadow-lg hover:shadow-[#D0BCFF]/20 transition-all active:scale-95"
          >
            <Check size={24} strokeWidth={3} />
            完成并保存
          </button>
        </div>
      </div>
    </div>
  );
};
