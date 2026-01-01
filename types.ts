
export enum TimerType {
  SIMPLE = 'SIMPLE',
  INTERVAL = 'INTERVAL'
}

export interface TimerItem {
  id: string;
  type: TimerType;
  name: string;
  duration: number; // in seconds
  // Properties for INTERVAL type
  restDuration?: number; // in seconds
  rounds?: number;
  roundNames?: string[]; // New: Specific names for each round in a loop
  color: string; // Hex color or Tailwind class
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  items: TimerItem[];
  createdAt: number;
}

export interface ExecutionStep {
  name: string;
  itemName: string; // Pure name without round info for TTS
  duration: number;
  color: string;
  type: '运动' | '休息' | '准备';
  totalSteps: number;
  currentStep: number;
  originalId: string;
}

export interface CustomVoices {
  start?: string;
  work?: string;
  rest?: string;
  complete?: string;
  // New: Global AI Coach settings
  useAICoach?: boolean;
  aiVoiceId?: string;
}

export const COLORS = [
  '#FF3B30', // 电光红 (Vibrant Red)
  '#FF9500', // 能量橙 (Bright Orange)
  '#FFCC00', // 耀目黄 (Power Yellow)
  '#4CD964', // 荧光绿 (Neon Green)
  '#00E5FF', // 电浆青 (Electric Cyan)
  '#2979FF', // 极速蓝 (Racing Blue)
  '#AF52DE', // 霓虹紫 (Neon Purple)
  '#FF2D55', // 激情粉 (Hot Pink)
];
