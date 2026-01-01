
import React, { useState, useEffect } from 'react';
import { TimerItem, TimerType, ExecutionStep, COLORS, WorkoutRoutine, CustomVoices } from './types';
import { TimerEditor } from './components/TimerEditor';
import { EditDialog } from './components/EditDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { AIGeneratorDialog } from './components/AIGeneratorDialog';
import { RunSession } from './components/RunSession';
import { HomeScreen } from './components/HomeScreen';
import { Plus, Play, ArrowLeft, Settings } from 'lucide-react';
import { playStart } from './utils/sound';

const INITIAL_ROUTINES: WorkoutRoutine[] = [
  {
    id: '1',
    name: '4 minute tabata',
    createdAt: Date.now(),
    items: [
      { id: '1', type: TimerType.SIMPLE, name: '准备', duration: 10, color: COLORS[6], soundEnabled: true, vibrationEnabled: true },
      { id: '2', type: TimerType.INTERVAL, name: '高强度运动 / 休息', duration: 20, restDuration: 10, rounds: 8, color: COLORS[3], soundEnabled: true, vibrationEnabled: true },
    ]
  }
];

export default function App() {
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(() => {
    try {
      const saved = localStorage.getItem('flow-hiit-routines');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_ROUTINES;
  });

  const [customVoices, setCustomVoices] = useState<CustomVoices>(() => {
    try {
      const saved = localStorage.getItem('flow-hiit-voices');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    return localStorage.getItem('flow-hiit-voice-uri') || '';
  });

  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimerItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [runQueue, setRunQueue] = useState<ExecutionStep[] | null>(null);

  const activeRoutine = routines.find(r => r.id === activeRoutineId);

  useEffect(() => {
    localStorage.setItem('flow-hiit-routines', JSON.stringify(routines));
  }, [routines]);

  useEffect(() => {
    localStorage.setItem('flow-hiit-voices', JSON.stringify(customVoices));
  }, [customVoices]);

  useEffect(() => {
    localStorage.setItem('flow-hiit-voice-uri', selectedVoiceURI);
  }, [selectedVoiceURI]);

  const handleCreateRoutine = () => {
    const newRoutine: WorkoutRoutine = {
      id: crypto.randomUUID(),
      name: `新训练 ${routines.length + 1}`,
      items: [],
      createdAt: Date.now()
    };
    setRoutines([newRoutine, ...routines]);
    setActiveRoutineId(newRoutine.id);
  };

  const handleAIDone = (newRoutine: WorkoutRoutine) => {
    setRoutines([newRoutine, ...routines]);
    setActiveRoutineId(newRoutine.id);
  };

  const handleDeleteRoutine = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个训练计划吗?')) {
      setRoutines(routines.filter(r => r.id !== id));
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(routines, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flow_hiit_backup.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          setRoutines([...json, ...routines]);
          setIsSettingsOpen(false);
        }
      } catch (error) {
        alert('导入失败');
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateItems = (newItems: TimerItem[]) => {
    if (!activeRoutineId) return;
    setRoutines(routines.map(r => r.id === activeRoutineId ? { ...r, items: newItems } : r));
  };

  const handleSaveItem = (item: TimerItem) => {
    if (!activeRoutine) return;
    const newItems = editingItem ? activeRoutine.items.map(i => i.id === item.id ? item : i) : [...activeRoutine.items, item];
    handleUpdateItems(newItems);
    setIsEditOpen(false);
    setEditingItem(null);
  };

  const handleStart = () => {
    if (!activeRoutine || activeRoutine.items.length === 0) return;
    const queue: ExecutionStep[] = [];
    activeRoutine.items.forEach(item => {
      if (item.type === TimerType.SIMPLE) {
        queue.push({ name: item.name, itemName: item.name, duration: item.duration, color: item.color, type: '运动', totalSteps: 1, currentStep: 1, originalId: item.id });
        if (item.restDuration && item.restDuration > 0) {
           queue.push({ name: `休息`, itemName: '休息', duration: item.restDuration, color: '#444', type: '休息', totalSteps: 1, currentStep: 1, originalId: item.id });
        }
      } else {
        const rounds = item.rounds || 1;
        for (let i = 0; i < rounds; i++) {
          const specificName = item.roundNames?.[i] || item.name;
          queue.push({ 
            name: specificName + (item.roundNames?.[i] ? '' : ` (第 ${i+1}/${rounds} 组)`), 
            itemName: specificName, 
            duration: item.duration, 
            color: item.color, 
            type: '运动', 
            totalSteps: rounds, 
            currentStep: i + 1, 
            originalId: item.id 
          });
          if (item.restDuration && item.restDuration > 0) {
            queue.push({ 
              name: `休息`, 
              itemName: '休息', 
              duration: item.restDuration, 
              color: '#444', 
              type: '休息', 
              totalSteps: rounds, 
              currentStep: i + 1, 
              originalId: item.id 
            });
          }
        }
      }
    });
    playStart();
    setRunQueue(queue);
  };

  if (runQueue) return <RunSession queue={runQueue} onExit={() => setRunQueue(null)} customVoices={customVoices} selectedVoiceURI={selectedVoiceURI} />;

  return (
    <div className="h-screen w-full bg-[#121212] text-white flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
      <header className="px-6 py-5 flex items-center bg-[#1E1E1E] shadow-sm z-10 h-[72px]">
        {activeRoutine ? (
          <>
            <button onClick={() => setActiveRoutineId(null)} className="mr-4 p-2 -ml-2 rounded-full hover:bg-[#333] text-white"><ArrowLeft size={24} /></button>
            <div className="flex-1">
              <input className="text-xl font-bold bg-transparent text-white focus:outline-none w-full" value={activeRoutine.name} onChange={(e) => setRoutines(routines.map(r => r.id === activeRoutine.id ? {...r, name: e.target.value} : r))} />
              <p className="text-xs text-[#888]">{activeRoutine.items.length} 个项目</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#D0BCFF] to-[#00E5FF] bg-clip-text text-transparent">Flow 训练</h1>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-[#333] text-[#888]"><Settings size={24} /></button>
          </div>
        )}
      </header>

      {activeRoutineId && activeRoutine ? (
        <>
          <TimerEditor items={activeRoutine.items} setItems={handleUpdateItems} onEdit={(i) => { setEditingItem(i); setIsEditOpen(true); }} onDelete={(id) => handleUpdateItems(activeRoutine.items.filter(i => i.id !== id))} />
          <div className="absolute bottom-6 right-6 flex flex-col gap-4">
            {activeRoutine.items.length > 0 && (
              <button onClick={handleStart} className="w-16 h-16 bg-[#D0BCFF] rounded-2xl shadow-xl flex items-center justify-center text-[#381E72] hover:scale-110 transition-transform active:scale-95"><Play size={28} fill="currentColor" className="ml-1" /></button>
            )}
            <button onClick={() => { setEditingItem(null); setIsEditOpen(true); }} className="w-12 h-12 bg-[#444] rounded-xl shadow-lg flex items-center justify-center text-white hover:bg-[#555] transition-colors"><Plus size={24} /></button>
          </div>
        </>
      ) : (
        <HomeScreen routines={routines} onSelectRoutine={setActiveRoutineId} onCreateRoutine={handleCreateRoutine} onDeleteRoutine={handleDeleteRoutine} onOpenAI={() => setIsAIOpen(true)} />
      )}

      <EditDialog isOpen={isEditOpen} initialItem={editingItem} onClose={() => setIsEditOpen(false)} onSave={handleSaveItem} />
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onExport={handleExport} onImport={handleImport} customVoices={customVoices} onUpdateVoices={setCustomVoices} selectedVoiceURI={selectedVoiceURI} onSelectVoiceURI={setSelectedVoiceURI} />
      <AIGeneratorDialog isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} onGenerated={handleAIDone} />
    </div>
  );
}
