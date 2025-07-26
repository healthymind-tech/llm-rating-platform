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
    static getChatHistory(limit?: number, offset?: number): Promise<{
        messages: any[];
        totalCount: number;
        hasMore: boolean;
    }>;
    static getChatSessionsWithDetails(limit?: number, offset?: number): Promise<{
        sessions: any[];
        totalCount: number;
        hasMore: boolean;
    }>;
    static getSessionMessages(sessionId: string): Promise<any[]>;
}
export {};
//# sourceMappingURL=metricsService.d.ts.map