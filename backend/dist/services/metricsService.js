"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const database_1 = __importDefault(require("../config/database"));
class MetricsService {
    static async getSystemMetrics() {
        try {
            // Total users
            const totalUsersResult = await database_1.default.query('SELECT COUNT(*) as count FROM users');
            const totalUsers = parseInt(totalUsersResult.rows[0].count);
            // Total chat sessions
            const totalSessionsResult = await database_1.default.query('SELECT COUNT(*) as count FROM chat_sessions');
            const totalSessions = parseInt(totalSessionsResult.rows[0].count);
            // Total messages
            const totalMessagesResult = await database_1.default.query('SELECT COUNT(*) as count FROM chat_messages');
            const totalMessages = parseInt(totalMessagesResult.rows[0].count);
            // Active users (logged in within last 30 days)
            const activeUsersResult = await database_1.default.query('SELECT COUNT(*) as count FROM users WHERE last_login > NOW() - INTERVAL \'30 days\'');
            const activeUsers = parseInt(activeUsersResult.rows[0].count);
            // Messages in last 24 hours
            const messagesLast24hResult = await database_1.default.query('SELECT COUNT(*) as count FROM chat_messages WHERE created_at > NOW() - INTERVAL \'24 hours\'');
            const messagesLast24h = parseInt(messagesLast24hResult.rows[0].count);
            // Average session length (in minutes)
            const avgSessionResult = await database_1.default.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60) as avg_minutes
        FROM chat_sessions 
        WHERE updated_at > created_at
      `);
            const averageSessionLength = Math.round(parseFloat(avgSessionResult.rows[0].avg_minutes) || 0);
            // Top users by message count
            const topUsersResult = await database_1.default.query(`
        SELECT 
          u.username,
          COUNT(cm.id) as message_count,
          COUNT(DISTINCT cs.id) as session_count
        FROM users u
        LEFT JOIN chat_messages cm ON u.id = cm.user_id
        LEFT JOIN chat_sessions cs ON u.id = cs.user_id
        GROUP BY u.id, u.username
        ORDER BY message_count DESC
        LIMIT 5
      `);
            const topUsers = topUsersResult.rows.map(row => ({
                username: row.username,
                messageCount: parseInt(row.message_count),
                sessionCount: parseInt(row.session_count),
            }));
            // Daily activity for last 7 days
            const dailyActivityResult = await database_1.default.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as message_count,
          COUNT(DISTINCT session_id) as session_count
        FROM chat_messages
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);
            const dailyActivity = dailyActivityResult.rows.map(row => ({
                date: row.date,
                messageCount: parseInt(row.message_count),
                sessionCount: parseInt(row.session_count),
            }));
            return {
                totalUsers,
                totalSessions,
                totalMessages,
                activeUsers,
                messagesLast24h,
                averageSessionLength,
                topUsers,
                dailyActivity,
            };
        }
        catch (error) {
            console.error('Get system metrics error:', error);
            throw new Error('Failed to fetch system metrics');
        }
    }
    static async getChatHistory(limit = 50, offset = 0) {
        try {
            const result = await database_1.default.query(`
        SELECT 
          cm.id,
          cm.content,
          cm.role,
          cm.created_at,
          u.username,
          u.email,
          cs.id as session_id
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        JOIN chat_sessions cs ON cm.session_id = cs.id
        ORDER BY cm.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
            const countResult = await database_1.default.query('SELECT COUNT(*) as count FROM chat_messages');
            const totalCount = parseInt(countResult.rows[0].count);
            return {
                messages: result.rows,
                totalCount,
                hasMore: offset + limit < totalCount,
            };
        }
        catch (error) {
            console.error('Get chat history error:', error);
            throw new Error('Failed to fetch chat history');
        }
    }
    static async getChatSessionsWithDetails(limit = 20, offset = 0) {
        try {
            const result = await database_1.default.query(`
        SELECT 
          cs.id,
          cs.created_at,
          cs.updated_at,
          u.username,
          u.email,
          COUNT(cm.id) as message_count,
          MAX(cm.created_at) as last_message_at,
          sr.rating,
          sr.created_at as rating_created_at
        FROM chat_sessions cs
        JOIN users u ON cs.user_id = u.id
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id
        LEFT JOIN session_ratings sr ON cs.id = sr.session_id AND sr.user_id = cs.user_id
        GROUP BY cs.id, cs.created_at, cs.updated_at, u.username, u.email, sr.rating, sr.created_at
        ORDER BY cs.updated_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
            const countResult = await database_1.default.query('SELECT COUNT(*) as count FROM chat_sessions');
            const totalCount = parseInt(countResult.rows[0].count);
            return {
                sessions: result.rows.map(row => ({
                    ...row,
                    message_count: parseInt(row.message_count),
                })),
                totalCount,
                hasMore: offset + limit < totalCount,
            };
        }
        catch (error) {
            console.error('Get chat sessions error:', error);
            throw new Error('Failed to fetch chat sessions');
        }
    }
    static async getSessionMessages(sessionId) {
        try {
            const result = await database_1.default.query(`
        SELECT 
          cm.id,
          cm.content,
          cm.role,
          cm.created_at,
          u.username
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.session_id = $1
        ORDER BY cm.created_at ASC
      `, [sessionId]);
            return result.rows;
        }
        catch (error) {
            console.error('Get session messages error:', error);
            throw new Error('Failed to fetch session messages');
        }
    }
}
exports.MetricsService = MetricsService;
//# sourceMappingURL=metricsService.js.map