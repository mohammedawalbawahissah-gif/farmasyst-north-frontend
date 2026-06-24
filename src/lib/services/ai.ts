import api from '../api';

export interface CreditworthinessResult {
  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: {
    infrastructure: number;
    biosecurity: number;
    activity_consistency: number;
    credit_history: number;
    experience: number;
  };
  strengths: string[];
  risks: string[];
  recommendation: 'approve' | 'review' | 'reject';
  narrative: string;
  farmer_id: string;
  farmer_name: string;
  generated_at: string;
}

export interface DiseaseSignal {
  signal: string;
  severity: 'low' | 'moderate' | 'high';
}

export interface SuspectedCondition {
  condition: string;
  confidence: 'low' | 'moderate' | 'high';
  reason: string;
}

export interface DiseaseDetectionResult {
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  risk_score: number;
  detected_signals: DiseaseSignal[];
  suspected_conditions: SuspectedCondition[];
  immediate_actions: string[];
  preventive_recommendations: string[];
  vet_consultation_required: boolean;
  summary: string;
  farm_id: string;
  farm_name: string;
  generated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface ChatResponse {
  reply: string;
  session_id: string;
}

export const aiService = {
  scoreCreditworthiness: (farmer_id: string) =>
    api.post<CreditworthinessResult>('/ai/creditworthiness/', { farmer_id }).then(r => r.data),

  detectDisease: (farm_id: string) =>
    api.post<DiseaseDetectionResult>('/ai/disease-detection/', { farm_id }).then(r => r.data),

  chat: (message: string, session_id?: string) =>
    api.post<ChatResponse>('/ai/chat/', { message, session_id }).then(r => r.data),

  getChatHistory: (session_id?: string) =>
    api.get<{ session_id: string | null; messages: ChatMessage[] }>(
      '/ai/chat/',
      session_id ? { params: { session_id } } : undefined,
    ).then(r => r.data),
};
