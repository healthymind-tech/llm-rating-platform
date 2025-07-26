"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingService = void 0;
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../config/database"));
class RatingService {
    // Rate a session (like or dislike)
    static async rateSession(sessionId, userId, rating) {
        try {
            // Check if session exists and belongs to user
            const sessionResult = await database_1.default.query('SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
            if (sessionResult.rows.length === 0) {
                throw new Error('Session not found or access denied');
            }
            // Insert or update rating (upsert)
            const result = await database_1.default.query(`INSERT INTO session_ratings (id, session_id, user_id, rating) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, user_id) 
         DO UPDATE SET rating = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`, [(0, uuid_1.v4)(), sessionId, userId, rating]);
            return result.rows[0];
        }
        catch (error) {
            console.error('Rate session error:', error);
            throw new Error('Failed to rate session');
        }
    }
    // Get rating for a specific session by a user
    static async getSessionRating(sessionId, userId) {
        try {
            const result = await database_1.default.query('SELECT * FROM session_ratings WHERE session_id = $1 AND user_id = $2', [sessionId, userId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            console.error('Get session rating error:', error);
            throw new Error('Failed to get session rating');
        }
    }
    // Remove rating from a session
    static async removeSessionRating(sessionId, userId) {
        try {
            await database_1.default.query('DELETE FROM session_ratings WHERE session_id = $1 AND user_id = $2', [sessionId, userId]);
        }
        catch (error) {
            console.error('Remove session rating error:', error);
            throw new Error('Failed to remove session rating');
        }
    }
    // Get rating statistics (admin only)
    static async getRatingStats() {
        try {
            const result = await database_1.default.query(`
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
        }
        catch (error) {
            console.error('Get rating stats error:', error);
            throw new Error('Failed to get rating statistics');
        }
    }
    // Get detailed rating analytics (admin only)
    static async getDetailedRatingStats() {
        try {
            const result = await database_1.default.query(`
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
        }
        catch (error) {
            console.error('Get detailed rating stats error:', error);
            throw new Error('Failed to get detailed rating statistics');
        }
    }
}
exports.RatingService = RatingService;
//# sourceMappingURL=ratingService.js.map