import { ChatMessage, ChatSession, LLMConfig } from '../types';
export declare class ChatService {
    static createChatSession(userId: string): Promise<ChatSession>;
    static getChatSessions(userId: string): Promise<ChatSession[]>;
    static getChatMessages(sessionId: string, userId: string): Promise<ChatMessage[]>;
    static saveMessage(sessionId: string, userId: string, role: 'user' | 'assistant', content: string): Promise<ChatMessage>;
    static getActiveConfig(): Promise<LLMConfig | null>;
    static sendMessageToLLM(message: string, sessionId: string, userId: string): Promise<string>;
    private static sendToOpenAI;
    private static sendToOllama;
    private static getDemoResponse;
}
//# sourceMappingURL=chatService.d.ts.map