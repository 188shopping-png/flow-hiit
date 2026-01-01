import React from 'react';
import { WorkoutRoutine, TimerType } from '../types';
import { Clock, ChevronRight, Plus, Dumbbell, Trash2, Sparkles } from 'lucide-react';

interface HomeScreenProps {
  routines: WorkoutRoutine[];
  onSelectRoutine: (routineId: string) => void;
  onCreateRoutine: () => void;
  onDeleteRoutine: (e: React.MouseEvent, id: string) => void;
  onOpenAI: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ routines, onSelectRoutine, onCreateRoutine, onDeleteRoutine, onOpenAI }) => {
  
  const calculateDuration = (routine: WorkoutRoutine) => {
    let totalSeconds = 0;
    routine.items.forEach(item => {
      const work = item.duration;
      const rest = item.restDuration || 0;
      if (item.type === TimerType.SIMPLE) {
        totalSeconds += work + rest;
      } else {
        const rounds = item.rounds || 1;
        totalSeconds += (work + rest) * rounds;
      }
    });
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      <div className="space-y-4">
        {routines.map((routine) => (
          <div 
            key={routine.id}
            onClick={() => onSelectRoutine(routine.id)}
            className="bg-[#2C2C2C] rounded-2xl p-5 flex items-center shadow-sm border border-[#444] active:scale-[0.98] transition-transform cursor-pointer relative group"
          >
            <div className="w-12 h-12 rounded-full bg-[#444] flex items-center justify-center text-[#D0BCFF] mr-4">
              <Dumbbell size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-medium text-white mb-1">{routine.name}</h3>
              <div className="text-sm text-[#aaa] flex items-center gap-2">
                <Clock size={14} />
                <span className="font-mono text-[#D0BCFF]">{calculateDuration(routine)}</span>
                <span className="w-1 h-1 rounded-full bg-[#666]"></span>
                <span>{routine.items.length} 个项目</span>
              </div>
            </div>
            <div className="text-[#666]">
              <ChevronRight size={24} />
            </div>
            <button 
              onClick={(e) => onDeleteRoutine(e, routine.id)}
              className="absolute top-2 right-2 p-2 text-[#666] hover:text-[#FFB4AB] hover:bg-[#3E2C2C] rounded-full transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {routines.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-[#666] border-2 border-dashed border-[#333] rounded-2xl">
            <Dumbbell size={48} className="mb-4 opacity-50" />
            <p>还没有训练计划</p>
            <p className="text-sm">点击下方 "+" 或 AI 按钮创建一个新的</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col gap-4">
        <button 
          onClick={onOpenAI}
          className="w-14 h-14 bg-gradient-to-br from-[#D0BCFF] to-[#AF52DE] rounded-2xl shadow-xl flex items-center justify-center text-[#1E1E1E] hover:scale-110 transition-transform active:scale-95 border-2 border-[#1E1E1E]"
        >
          <Sparkles size={28} />
        </button>
        <button 
          onClick={onCreateRoutine}
          className="w-16 h-16 bg-[#D0BCFF] rounded-2xl shadow-xl flex items-center justify-center text-[#381E72] hover:scale-110 transition-transform active:scale-95"
        >
          <Plus size={32} />
        </button>
      </div>
    </div>
  );
};