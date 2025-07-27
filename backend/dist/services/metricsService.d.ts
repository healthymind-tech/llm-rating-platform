interface SystemMetrics {
    totalUsers: number;
    totalSessions: number;
    totalMessages: number;
    activeUsers: number;
    messagesLast24h: number;
    averageSessionLength: number;
    topUsers: Array<{
        username: string;
        messageCount: number;
        sessionCount: number;
    }>;
    dailyActivity: Array<{
        date: string;
        messageCount: number;
        sessionCount: number;
    }>;
}
export declare class MetricsService {
    static getSystemMetrics(): Promise<SystemMetrics>;
    static getChatHistory(limit?: number, offset?: number, filters?: {
        username?: string;
        role?: string;
        rating?: string;
        dateFrom?: string;
        dateTo?: string;
        messageContent?: string;
    }): Promise<{
        messages: any[];
        totalCount: number;
        hasMore: boolean;
    }>;
    static getChatSessionsWithDetails(limit?: number, offset?: number, filters?: {
        username?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<{
        sessions: any[];
        totalCount: number;
        hasMore: boolean;
    }>;
    static getSessionMessages(sessionId: string): Promise<any[]>;
    static exportChatSessions(options: {
        username?: string;
        dateFrom?: string;
        dateTo?: string;
        format: string;
    }): Promise<string>;
    static exportChatMessages(options: {
        username?: string;
        role?: string;
        rating?: string;
        dateFrom?: string;
        dateTo?: string;
        messageContent?: string;
        format: string;
    }): Promise<string>;
    private static formatData;
    private static formatSessionsWithMessages;
    private static formatAsCSV;
    private static formatAsXML;
    private static escapeXML;
    private static formatSessionsAsCSV;
    private static formatSessionsAsXML;
    private static escapeCSVValue;
}
export {};
//# sourceMappingURL=metricsService.d.ts.map