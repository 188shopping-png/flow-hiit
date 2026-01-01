import React from 'react';
import { Reorder, useDragControls, useMotionValue } from 'framer-motion';
import { TimerItem, TimerType } from '../types';
import { GripVertical, Clock, Repeat, Trash2 } from 'lucide-react';

interface TimerEditorProps {
  items: TimerItem[];
  setItems: (items: TimerItem[]) => void;
  onEdit: (item: TimerItem) => void;
  onDelete: (id: string) => void;
}

interface TimerRowProps {
  item: TimerItem;
  onEdit: (i: TimerItem) => void;
  onDelete: (id: string) => void;
}

const TimerRow: React.FC<TimerRowProps> = ({ item, onEdit, onDelete }) => {
  const dragControls = useDragControls();
  const y = useMotionValue(0);

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      style={{ y }}
      dragListener={false}
      dragControls={dragControls}
      className="mb-3"
    >
      <div 
        className="bg-[#2C2C2C] rounded-2xl p-4 flex items-center shadow-sm border border-[#444] select-none active:scale-[0.98] transition-transform"
        style={{ borderLeft: `6px solid ${item.color}` }}
      >
        {/* Drag Handle */}
        <div 
          className="mr-4 cursor-grab touch-none p-2 text-[#888] hover:text-white"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical size={24} />
        </div>

        {/* Content */}
        <div className="flex-1" onClick={() => onEdit(item)}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-medium text-white">{item.name}</h3>
            {item.type === TimerType.INTERVAL && (
              <span className="text-xs bg-[#444] text-[#ccc] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Repeat size={10} /> x{item.rounds}
              </span>
            )}
          </div>
          <div className="text-sm text-[#aaa] flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock size={14} /> 
              {`${item.duration}秒${(item.restDuration && item.restDuration > 0) ? ` / ${item.restDuration}秒 休息` : ''}`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <button 
          onClick={() => onDelete(item.id)}
          className="p-2 text-[#FFB4AB] hover:bg-[#3E2C2C] rounded-full transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </Reorder.Item>
  );
};

export const TimerEditor: React.FC<TimerEditorProps> = ({ items, setItems, onEdit, onDelete }) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-4">
        {items.map((item) => (
          <TimerRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))}
        
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-[#666] border-2 border-dashed border-[#333] rounded-2xl">
            <Clock size={48} className="mb-4 opacity-50" />
            <p>这个训练还没内容</p>
            <p className="text-sm">点击右下角 "+" 添加运动项目</p>
          </div>
        )}
      </Reorder.Group>
    </div>
  );
};