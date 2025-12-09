
export interface RepairStep {
  step: number;
  instruction: string;
  detail: string;
}

export interface DiagnosisResult {
  id: string; // For history
  timestamp: number; // For history
  appliance: string;
  issue: string;
  probability: number;
  description: string;
  manualReference: string;
  steps: RepairStep[];
  imageUrl?: string; // To show the analyzed image in result
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum InputMode {
  AUDIO = 'AUDIO',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
}

export type AnalysisStatus = 'idle' | 'recording' | 'analyzing' | 'complete' | 'error';
