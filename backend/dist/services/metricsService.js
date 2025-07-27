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
    static async getChatHistory(limit = 50, offset = 0, filters) {
        try {
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;
            // Build WHERE conditions based on filters
            if (filters?.username) {
                whereConditions.push(`LOWER(u.username) LIKE LOWER($${paramIndex})`);
                queryParams.push(`%${filters.username}%`);
                paramIndex++;
            }
            if (filters?.role) {
                whereConditions.push(`cm.role = $${paramIndex}`);
                queryParams.push(filters.role);
                paramIndex++;
            }
            if (filters?.rating && (!filters.role || filters.role === 'assistant')) {
                // Only apply rating filter if role is not specified or is 'assistant'
                if (filters.rating === 'none') {
                    whereConditions.push(`mr.rating IS NULL AND cm.role = 'assistant'`);
                }
                else {
                    whereConditions.push(`mr.rating = $${paramIndex} AND cm.role = 'assistant'`);
                    queryParams.push(filters.rating);
                    paramIndex++;
                }
            }
            if (filters?.dateFrom) {
                whereConditions.push(`cm.created_at >= $${paramIndex}`);
                queryParams.push(filters.dateFrom);
                paramIndex++;
            }
            if (filters?.dateTo) {
                whereConditions.push(`cm.created_at <= $${paramIndex}`);
                queryParams.push(filters.dateTo);
                paramIndex++;
            }
            if (filters?.messageContent) {
                whereConditions.push(`LOWER(cm.content) LIKE LOWER($${paramIndex})`);
                queryParams.push(`%${filters.messageContent}%`);
                paramIndex++;
            }
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            const query = `
        SELECT 
          cm.id,
          cm.content,
          cm.role,
          cm.created_at,
          u.username,
          u.email,
          cs.id as session_id,
          mr.rating,
          mr.reason,
          mr.created_at as rating_created_at
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        JOIN chat_sessions cs ON cm.session_id = cs.id
        LEFT JOIN message_ratings mr ON cm.id = mr.message_id
        ${whereClause}
        ORDER BY cm.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            queryParams.push(limit, offset);
            const result = await database_1.default.query(query, queryParams);
            // Count query with same filters
            const countQuery = `
        SELECT COUNT(*) as count 
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        JOIN chat_sessions cs ON cm.session_id = cs.id
        LEFT JOIN message_ratings mr ON cm.id = mr.message_id
        ${whereClause}
      `;
            const countParams = queryParams.slice(0, -2); // Remove limit and offset
            const countResult = await database_1.default.query(countQuery, countParams);
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
    static async getChatSessionsWithDetails(limit = 20, offset = 0, filters) {
        try {
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;
            // Build WHERE conditions based on filters
            if (filters?.username) {
                whereConditions.push(`LOWER(u.username) LIKE LOWER($${paramIndex})`);
                queryParams.push(`%${filters.username}%`);
                paramIndex++;
            }
            if (filters?.dateFrom) {
                whereConditions.push(`cs.created_at >= $${paramIndex}`);
                queryParams.push(filters.dateFrom);
                paramIndex++;
            }
            if (filters?.dateTo) {
                whereConditions.push(`cs.created_at <= $${paramIndex}`);
                queryParams.push(filters.dateTo);
                paramIndex++;
            }
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            const query = `
        SELECT 
          cs.id,
          cs.created_at,
          cs.updated_at,
          u.username,
          u.email,
          COUNT(cm.id) as message_count,
          MAX(cm.created_at) as last_message_at
        FROM chat_sessions cs
        JOIN users u ON cs.user_id = u.id
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id
        ${whereClause}
        GROUP BY cs.id, cs.created_at, cs.updated_at, u.username, u.email
        ORDER BY cs.updated_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            queryParams.push(limit, offset);
            const result = await database_1.default.query(query, queryParams);
            // Count query with same filters
            const countQuery = `
        SELECT COUNT(DISTINCT cs.id) as count 
        FROM chat_sessions cs
        JOIN users u ON cs.user_id = u.id
        ${whereClause}
      `;
            const countParams = queryParams.slice(0, -2); // Remove limit and offset
            const countResult = await database_1.default.query(countQuery, countParams);
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
          u.username,
          mr.rating,
          mr.reason,
          mr.created_at as rating_created_at
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        LEFT JOIN message_ratings mr ON cm.id = mr.message_id
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
    // Export chat sessions with all messages included
    static async exportChatSessions(options) {
        try {
            const { username, dateFrom, dateTo, format } = options;
            // Build query with filters for sessions
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;
            if (username) {
                whereConditions.push(`u.username ILIKE $${paramIndex}`);
                queryParams.push(`%${username}%`);
                paramIndex++;
            }
            if (dateFrom) {
                whereConditions.push(`cs.created_at >= $${paramIndex}`);
                queryParams.push(dateFrom);
                paramIndex++;
            }
            if (dateTo) {
                whereConditions.push(`cs.created_at <= $${paramIndex}`);
                queryParams.push(dateTo);
                paramIndex++;
            }
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            // First get all sessions
            const sessionsQuery = `
        SELECT 
          cs.id,
          cs.created_at,
          cs.updated_at,
          u.username,
          u.email,
          u.id as user_id
        FROM chat_sessions cs
        JOIN users u ON cs.user_id = u.id
        ${whereClause}
        ORDER BY cs.created_at DESC
      `;
            const sessionsResult = await database_1.default.query(sessionsQuery, queryParams);
            const sessions = sessionsResult.rows;
            // Get all messages for each session
            const sessionsWithMessages = await Promise.all(sessions.map(async (session) => {
                const messagesQuery = `
            SELECT 
              cm.id,
              cm.content,
              cm.role,
              cm.created_at,
              mr.rating,
              mr.reason,
              mr.created_at as rating_created_at
            FROM chat_messages cm
            LEFT JOIN message_ratings mr ON cm.id = mr.message_id
            WHERE cm.session_id = $1
            ORDER BY cm.created_at ASC
          `;
                const messagesResult = await database_1.default.query(messagesQuery, [session.id]);
                return {
                    session_id: session.id,
                    session_created_at: session.created_at,
                    session_updated_at: session.updated_at,
                    username: session.username,
                    user_email: session.email,
                    message_count: messagesResult.rows.length,
                    last_message_at: messagesResult.rows.length > 0
                        ? messagesResult.rows[messagesResult.rows.length - 1].created_at
                        : null,
                    messages: messagesResult.rows
                };
            }));
            return this.formatSessionsWithMessages(sessionsWithMessages, format);
        }
        catch (error) {
            console.error('Export sessions error:', error);
            throw new Error('Failed to export sessions');
        }
    }
    // Export chat messages in different formats
    static async exportChatMessages(options) {
        try {
            const { username, role, rating, dateFrom, dateTo, messageContent, format } = options;
            // Build query with filters
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;
            if (username) {
                whereConditions.push(`u.username ILIKE $${paramIndex}`);
                queryParams.push(`%${username}%`);
                paramIndex++;
            }
            if (role) {
                whereConditions.push(`cm.role = $${paramIndex}`);
                queryParams.push(role);
                paramIndex++;
            }
            if (rating) {
                if (rating === 'none') {
                    whereConditions.push('mr.rating IS NULL');
                }
                else {
                    whereConditions.push(`mr.rating = $${paramIndex}`);
                    queryParams.push(rating);
                    paramIndex++;
                }
            }
            if (dateFrom) {
                whereConditions.push(`cm.created_at >= $${paramIndex}`);
                queryParams.push(dateFrom);
                paramIndex++;
            }
            if (dateTo) {
                whereConditions.push(`cm.created_at <= $${paramIndex}`);
                queryParams.push(dateTo);
                paramIndex++;
            }
            if (messageContent) {
                whereConditions.push(`LOWER(cm.content) LIKE LOWER($${paramIndex})`);
                queryParams.push(`%${messageContent}%`);
                paramIndex++;
            }
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            const query = `
        SELECT 
          cm.id,
          cm.content,
          cm.role,
          cm.created_at,
          u.username,
          u.email,
          cs.id as session_id,
          mr.rating,
          mr.reason,
          mr.created_at as rating_created_at
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        JOIN chat_sessions cs ON cm.session_id = cs.id
        LEFT JOIN message_ratings mr ON cm.id = mr.message_id
        ${whereClause}
        ORDER BY cm.created_at DESC
      `;
            const result = await database_1.default.query(query, queryParams);
            const messages = result.rows;
            return this.formatData(messages, format, 'messages');
        }
        catch (error) {
            console.error('Export messages error:', error);
            throw new Error('Failed to export messages');
        }
    }
    // Format data based on requested format
    static formatData(data, format, type) {
        switch (format.toLowerCase()) {
            case 'csv':
                return this.formatAsCSV(data, type);
            case 'xml':
                return this.formatAsXML(data, type);
            case 'json':
            default:
                return JSON.stringify(data, null, 2);
        }
    }
    // Format sessions with messages in different formats
    static formatSessionsWithMessages(data, format) {
        switch (format.toLowerCase()) {
            case 'csv':
                return this.formatSessionsAsCSV(data);
            case 'xml':
                return this.formatSessionsAsXML(data);
            case 'json':
            default:
                return JSON.stringify(data, null, 2);
        }
    }
    // Format data as CSV
    static formatAsCSV(data, type) {
        if (data.length === 0)
            return '';
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            }).join(',');
        });
        return [csvHeaders, ...csvRows].join('\n');
    }
    // Format data as XML
    static formatAsXML(data, type) {
        const rootElement = type === 'sessions' ? 'chat_sessions' : 'chat_messages';
        const itemElement = type === 'sessions' ? 'session' : 'message';
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n`;
        data.forEach(item => {
            xml += `  <${itemElement}>\n`;
            Object.entries(item).forEach(([key, value]) => {
                const xmlValue = this.escapeXML(String(value || ''));
                xml += `    <${key}>${xmlValue}</${key}>\n`;
            });
            xml += `  </${itemElement}>\n`;
        });
        xml += `</${rootElement}>`;
        return xml;
    }
    // Escape XML special characters
    static escapeXML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    // Format sessions with nested messages as CSV
    static formatSessionsAsCSV(data) {
        if (data.length === 0)
            return '';
        // CSV Headers for flattened structure
        const headers = [
            'session_id', 'session_created_at', 'session_updated_at', 'username', 'user_email',
            'message_count', 'last_message_at', 'message_id', 'message_content', 'message_role',
            'message_created_at', 'message_rating', 'message_rating_reason', 'message_rating_created_at'
        ];
        const csvHeaders = headers.join(',');
        const csvRows = [];
        data.forEach(session => {
            if (session.messages && session.messages.length > 0) {
                // Add a row for each message in the session
                session.messages.forEach((message) => {
                    const row = [
                        session.session_id,
                        session.session_created_at,
                        session.session_updated_at,
                        session.username,
                        session.user_email,
                        session.message_count,
                        session.last_message_at,
                        message.id,
                        this.escapeCSVValue(message.content),
                        message.role,
                        message.created_at,
                        message.rating || '',
                        this.escapeCSVValue(message.reason || ''),
                        message.rating_created_at || ''
                    ];
                    csvRows.push(row.join(','));
                });
            }
            else {
                // Session with no messages
                const row = [
                    session.session_id,
                    session.session_created_at,
                    session.session_updated_at,
                    session.username,
                    session.user_email,
                    session.message_count,
                    session.last_message_at,
                    '', '', '', '', '', '', ''
                ];
                csvRows.push(row.join(','));
            }
        });
        return [csvHeaders, ...csvRows].join('\n');
    }
    // Format sessions with nested messages as XML
    static formatSessionsAsXML(data) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<chat_sessions>\n';
        data.forEach(session => {
            xml += '  <session>\n';
            xml += `    <session_id>${this.escapeXML(String(session.session_id))}</session_id>\n`;
            xml += `    <session_created_at>${this.escapeXML(String(session.session_created_at))}</session_created_at>\n`;
            xml += `    <session_updated_at>${this.escapeXML(String(session.session_updated_at))}</session_updated_at>\n`;
            xml += `    <username>${this.escapeXML(String(session.username))}</username>\n`;
            xml += `    <user_email>${this.escapeXML(String(session.user_email))}</user_email>\n`;
            xml += `    <message_count>${session.message_count}</message_count>\n`;
            xml += `    <last_message_at>${this.escapeXML(String(session.last_message_at || ''))}</last_message_at>\n`;
            xml += '    <messages>\n';
            if (session.messages && session.messages.length > 0) {
                session.messages.forEach((message) => {
                    xml += '      <message>\n';
                    xml += `        <id>${this.escapeXML(String(message.id))}</id>\n`;
                    xml += `        <content>${this.escapeXML(String(message.content))}</content>\n`;
                    xml += `        <role>${this.escapeXML(String(message.role))}</role>\n`;
                    xml += `        <created_at>${this.escapeXML(String(message.created_at))}</created_at>\n`;
                    xml += `        <rating>${this.escapeXML(String(message.rating || ''))}</rating>\n`;
                    xml += `        <reason>${this.escapeXML(String(message.reason || ''))}</reason>\n`;
                    xml += `        <rating_created_at>${this.escapeXML(String(message.rating_created_at || ''))}</rating_created_at>\n`;
                    xml += '      </message>\n';
                });
            }
            xml += '    </messages>\n';
            xml += '  </session>\n';
        });
        xml += '</chat_sessions>';
        return xml;
    }
    // Helper method to escape CSV values
    static escapeCSVValue(value) {
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
    }
}
exports.MetricsService = MetricsService;
//# sourceMappingURL=metricsService.js.map