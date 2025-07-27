import { ChatMessage, ChatSession, LLMConfig } from '../types';
import { Response } from 'express';
export declare class ChatService {
    static createChatSession(userId: string): Promise<ChatSession>;
    static getChatSessions(userId: string): Promise<ChatSession[]>;
    static getChatMessages(sessionId: string, userId: string): Promise<ChatMessage[]>;
    static saveMessage(sessionId: string, userId: string, role: 'user' | 'assistant', content: string, inputTokens?: number, outputTokens?: number): Promise<ChatMessage>;
    static getActiveConfig(): Promise<LLMConfig | null>;
    static sendMessageToLLM(message: string, sessionId: string, userId: string): Promise<{
        response: string;
        tokenUsage?: {
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
        };
    }>;
    static sendMessageToLLMStream(message: string, sessionId: string, userId: string, res: Response): Promise<string>;
    private static sendToOpenAI;
    private static sendToOpenAIStream;
    private static sendToOllama;
    private static sendToOllamaStream;
    private static estimateTokens;
    private static getDemoResponse;
}
//# sourceMappingURL=chatService.d.ts.map