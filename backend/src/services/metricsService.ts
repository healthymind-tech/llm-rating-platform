import pool from '../config/database';

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

export class MetricsService {
  static async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Total users
      const totalUsersResult = await pool.query('SELECT COUNT(*) as count FROM users');
      const totalUsers = parseInt(totalUsersResult.rows[0].count);

      // Total chat sessions
      const totalSessionsResult = await pool.query('SELECT COUNT(*) as count FROM chat_sessions');
      const totalSessions = parseInt(totalSessionsResult.rows[0].count);

      // Total messages
      const totalMessagesResult = await pool.query('SELECT COUNT(*) as count FROM chat_messages');
      const totalMessages = parseInt(totalMessagesResult.rows[0].count);

      // Active users (logged in within last 30 days)
      const activeUsersResult = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE last_login > NOW() - INTERVAL \'30 days\''
      );
      const activeUsers = parseInt(activeUsersResult.rows[0].count);

      // Messages in last 24 hours
      const messagesLast24hResult = await pool.query(
        'SELECT COUNT(*) as count FROM chat_messages WHERE created_at > NOW() - INTERVAL \'24 hours\''
      );
      const messagesLast24h = parseInt(messagesLast24hResult.rows[0].count);

      // Average session length (in minutes)
      const avgSessionResult = await pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60) as avg_minutes
        FROM chat_sessions 
        WHERE updated_at > created_at
      `);
      const averageSessionLength = Math.round(parseFloat(avgSessionResult.rows[0].avg_minutes) || 0);

      // Top users by message count
      const topUsersResult = await pool.query(`
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
      const dailyActivityResult = await pool.query(`
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
    } catch (error) {
      console.error('Get system metrics error:', error);
      throw new Error('Failed to fetch system metrics');
    }
  }

  static async getChatHistory(limit: number = 50, offset: number = 0) {
    try {
      const result = await pool.query(`
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
        ORDER BY cm.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      const countResult = await pool.query('SELECT COUNT(*) as count FROM chat_messages');
      const totalCount = parseInt(countResult.rows[0].count);

      return {
        messages: result.rows,
        totalCount,
        hasMore: offset + limit < totalCount,
      };
    } catch (error) {
      console.error('Get chat history error:', error);
      throw new Error('Failed to fetch chat history');
    }
  }

  static async getChatSessionsWithDetails(limit: number = 20, offset: number = 0) {
    try {
      const result = await pool.query(`
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

      const countResult = await pool.query('SELECT COUNT(*) as count FROM chat_sessions');
      const totalCount = parseInt(countResult.rows[0].count);

      return {
        sessions: result.rows.map(row => ({
          ...row,
          message_count: parseInt(row.message_count),
        })),
        totalCount,
        hasMore: offset + limit < totalCount,
      };
    } catch (error) {
      console.error('Get chat sessions error:', error);
      throw new Error('Failed to fetch chat sessions');
    }
  }

  static async getSessionMessages(sessionId: string) {
    try {
      const result = await pool.query(`
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
    } catch (error) {
      console.error('Get session messages error:', error);
      throw new Error('Failed to fetch session messages');
    }
  }
}