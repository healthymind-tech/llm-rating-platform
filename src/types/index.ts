export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLogin?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  rating?: 'like' | 'dislike';
  reason?: string;
  needsRating?: boolean; // For assistant messages that haven't been rated yet
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface LLMConfig {
  id: string;
  name: string;
  type: 'openai' | 'ollama';
  apiKey?: string;
  endpoint?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
}

export interface MessageRating {
  id: string;
  messageId: string;
  userId: string;
  rating: 'like' | 'dislike';
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingStats {
  likes: number;
  dislikes: number;
  total: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
}