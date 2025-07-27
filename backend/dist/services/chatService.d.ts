import { ChatMessage, ChatSession, LLMConfig } from '../types';
import { Response } from 'express';
export declare class ChatService {
    static createChatSession(userId: string): Promise<ChatSession>;
    static getChatSessions(userId: string): Promise<ChatSession[]>;
    static getChatMessages(sessionId: string, userId: string): Promise<ChatMessage[]>;
    static saveMessage(sessionId: string, userId: string, role: 'user' | 'assistant', content: string): Promise<ChatMessage>;
    static getActiveConfig(): Promise<LLMConfig | null>;
    static sendMessageToLLM(message: string, sessionId: string, userId: string): Promise<string>;
    static sendMessageToLLMStream(message: string, sessionId: string, userId: string, res: Response): Promise<string>;
    private static sendToOpenAI;
    private static sendToOpenAIStream;
    private static sendToOllama;
    private static sendToOllamaStream;
    private static getDemoResponse;
}
//# sourceMappingURL=chatService.d.ts.map