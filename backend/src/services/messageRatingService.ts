import pool from '../config/database';

export interface MessageRating {
  id: string;
  messageId: string;
  userId: string;
  rating: 'like' | 'dislike';
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRatingStats {
  likes: number;
  dislikes: number;
  total: number;
}

export class MessageRatingService {
  static async rateMessage(messageId: string, userId: string, rating: 'like' | 'dislike', reason?: string): Promise<MessageRating> {
    try {
      const result = await pool.query(`
        INSERT INTO message_ratings (message_id, user_id, rating, reason)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (message_id, user_id) 
        DO UPDATE SET 
          rating = EXCLUDED.rating,
          reason = EXCLUDED.reason,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [messageId, userId, rating, reason]);

      const row = result.rows[0];
      return {
        id: row.id,
        messageId: row.message_id,
        userId: row.user_id,
        rating: row.rating,
        reason: row.reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Rate message error:', error);
      throw new Error('Failed to rate message');
    }
  }

  static async getMessageRating(messageId: string, userId: string): Promise<MessageRating | null> {
    try {
      const result = await pool.query(`
        SELECT * FROM message_ratings 
        WHERE message_id = $1 AND user_id = $2
      `, [messageId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        messageId: row.message_id,
        userId: row.user_id,
        rating: row.rating,
        reason: row.reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Get message rating error:', error);
      throw new Error('Failed to get message rating');
    }
  }

  static async removeMessageRating(messageId: string, userId: string): Promise<void> {
    try {
      await pool.query(`
        DELETE FROM message_ratings 
        WHERE message_id = $1 AND user_id = $2
      `, [messageId, userId]);
    } catch (error) {
      console.error('Remove message rating error:', error);
      throw new Error('Failed to remove message rating');
    }
  }

  static async getRatingStats(): Promise<MessageRatingStats> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(CASE WHEN rating = 'like' THEN 1 END) as likes,
          COUNT(CASE WHEN rating = 'dislike' THEN 1 END) as dislikes,
          COUNT(*) as total
        FROM message_ratings
      `);

      const row = result.rows[0];
      return {
        likes: parseInt(row.likes),
        dislikes: parseInt(row.dislikes),
        total: parseInt(row.total),
      };
    } catch (error) {
      console.error('Get rating stats error:', error);
      throw new Error('Failed to get rating statistics');
    }
  }

  static async getDetailedRatingStats(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          mr.id,
          mr.rating,
          mr.reason,
          mr.created_at,
          cm.content as message_content,
          cm.role as message_role,
          u.username,
          cs.id as session_id
        FROM message_ratings mr
        JOIN chat_messages cm ON mr.message_id = cm.id
        JOIN users u ON mr.user_id = u.id
        JOIN chat_sessions cs ON cm.session_id = cs.id
        ORDER BY mr.created_at DESC
        LIMIT 100
      `);

      return result.rows.map(row => ({
        id: row.id,
        rating: row.rating,
        reason: row.reason,
        createdAt: row.created_at,
        messageContent: row.message_content,
        messageRole: row.message_role,
        username: row.username,
        sessionId: row.session_id,
      }));
    } catch (error) {
      console.error('Get detailed rating stats error:', error);
      throw new Error('Failed to get detailed rating statistics');
    }
  }

  static async getMessagesWithRatings(sessionId: string, userId: string): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          cm.id,
          cm.content,
          cm.role,
          cm.created_at,
          mr.rating,
          mr.reason,
          mr.created_at as rating_created_at
        FROM chat_messages cm
        LEFT JOIN message_ratings mr ON cm.id = mr.message_id AND mr.user_id = $2
        WHERE cm.session_id = $1
        ORDER BY cm.created_at ASC
      `, [sessionId, userId]);

      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        role: row.role,
        createdAt: row.created_at,
        rating: row.rating,
        reason: row.reason,
        ratingCreatedAt: row.rating_created_at,
      }));
    } catch (error) {
      console.error('Get messages with ratings error:', error);
      throw new Error('Failed to get messages with ratings');
    }
  }
}