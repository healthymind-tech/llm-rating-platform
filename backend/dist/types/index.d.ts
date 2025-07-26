import { Request } from 'express';
export interface User {
    id: string;
    username: string;
    email: string;
    password_hash: string;
    role: 'admin' | 'user';
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
    is_active: boolean;
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
export interface JWTPayload {
    userId: string;
    username: string;
    role: 'admin' | 'user';
}
export interface AuthRequest extends Request {
    user?: JWTPayload;
}
//# sourceMappingURL=index.d.ts.map