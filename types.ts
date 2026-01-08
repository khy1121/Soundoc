
export interface RepairStep {
  step: number;
  instruction: string;
  detail: string;
}

export interface AlternativeCause {
  issue: string;
  probability: number;
  howToDifferentiate: string;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
}

export interface Evidence {
  source: 'MANUAL' | 'GENERAL';
  title: string;
  snippet: string;
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
  imageUrl?: string; 
  
  // Sprint 2 Additions
  needsFollowUp: boolean;
  followUpQuestions?: FollowUpQuestion[];
  alternatives?: AlternativeCause[];
  userAnswers?: Record<string, string | string[]>;

  // Sprint 4 Additions
  safetyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  safetyWarnings: string[];
  stopAndCallService: boolean;

  // Sprint 5 Additions
  detectedBrand?: string;
  detectedModel?: string;
  detectedErrorCode?: string;
  imageFindings?: string[];
  userConfirmedData?: {
    brand: string;
    model: string;
    errorCode: string;
  };

  // Sprint 6 Additions
  evidence: Evidence[];

  // Sprint 7 Additions
  resolutionStatus?: 'SOLVED' | 'NOT_SOLVED' | 'UNKNOWN';
  followUpSessionId?: string;
  beforeAfterNote?: string;
  isRecheck?: boolean;
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

export type AnalysisStatus = 'idle' | 'recording' | 'analyzing' | 'complete' | 'error' | 'permission-denied' | 'too-short' | 'follow-up' | 'confirm-extraction' | 'rechecking';

export interface MediaInput {
  base64: string;
  mimeType: string;
}
