import { Request } from 'express';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  preferred_llm_id?: string;
  created_at: Date;
  last_login?: Date;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

export interface ChatSession {
  id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface LLMConfig {
  id: string;
  name: string;
  type: 'openai' | 'ollama';
  api_key?: string;
  endpoint?: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt?: string;
  repetition_penalty?: number;
  is_enabled: boolean;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SessionRating {
  id: string;
  session_id: string;
  user_id: string;
  rating: 'like' | 'dislike';
  created_at: Date;
  updated_at: Date;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: 'admin' | 'user';
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}