import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { SessionRating } from '../types';

export class RatingService {
  // Rate a session (like or dislike)
  static async rateSession(sessionId: string, userId: string, rating: 'like' | 'dislike'): Promise<SessionRating> {
    try {
      // Check if session exists and belongs to user
      const sessionResult = await pool.query(
        'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found or access denied');
      }

      // Insert or update rating (upsert)
      const result = await pool.query(
        `INSERT INTO session_ratings (id, session_id, user_id, rating) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, user_id) 
         DO UPDATE SET rating = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [uuidv4(), sessionId, userId, rating]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Rate session error:', error);
      throw new Error('Failed to rate session');
    }
  }

  // Get rating for a specific session by a user
  static async getSessionRating(sessionId: string, userId: string): Promise<SessionRating | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM session_ratings WHERE session_id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Get session rating error:', error);
      throw new Error('Failed to get session rating');
    }
  }

  // Remove rating from a session
  static async removeSessionRating(sessionId: string, userId: string): Promise<void> {
    try {
      await pool.query(
        'DELETE FROM session_ratings WHERE session_id = $1 AND user_id = $2',
        [sessionId, userId]
      );
    } catch (error) {
      console.error('Remove session rating error:', error);
      throw new Error('Failed to remove session rating');
    }
  }

  // Get rating statistics (admin only)
  static async getRatingStats(): Promise<{ likes: number; dislikes: number; total: number }> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(CASE WHEN rating = 'like' THEN 1 END) as likes,
          COUNT(CASE WHEN rating = 'dislike' THEN 1 END) as dislikes,
          COUNT(*) as total
        FROM session_ratings
      `);

      const stats = result.rows[0];
      return {
        likes: parseInt(stats.likes) || 0,
        dislikes: parseInt(stats.dislikes) || 0,
        total: parseInt(stats.total) || 0,
      };
    } catch (error) {
      console.error('Get rating stats error:', error);
      throw new Error('Failed to get rating statistics');
    }
  }

  // Get detailed rating analytics (admin only)
  static async getDetailedRatingStats(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          cs.id as session_id,
          u.username,
          sr.rating,
          sr.created_at as rated_at,
          COUNT(cm.id) as message_count
        FROM session_ratings sr
        JOIN chat_sessions cs ON sr.session_id = cs.id
        JOIN users u ON sr.user_id = u.id
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id
        GROUP BY cs.id, u.username, sr.rating, sr.created_at
        ORDER BY sr.created_at DESC
        LIMIT 100
      `);

      return result.rows;
    } catch (error) {
      console.error('Get detailed rating stats error:', error);
      throw new Error('Failed to get detailed rating statistics');
    }
  }
}