"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../config/database"));
class AuthService {
    static async login(email, password) {
        try {
            const result = await database_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return null;
            }
            const user = result.rows[0];
            const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isValidPassword) {
                return null;
            }
            // Update last login
            await database_1.default.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
            // Generate JWT token
            const payload = {
                userId: user.id,
                username: user.username,
                role: user.role,
            };
            const token = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
                expiresIn: '24h',
            });
            // Return user without password hash
            const { password_hash, ...userWithoutPassword } = user;
            return { user: userWithoutPassword, token };
        }
        catch (error) {
            console.error('Login error:', error);
            throw new Error('Login failed');
        }
    }
    static async createUser(username, email, password, role = 'user') {
        try {
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const userId = (0, uuid_1.v4)();
            const result = await database_1.default.query('INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *', [userId, username, email, hashedPassword, role]);
            const { password_hash, ...userWithoutPassword } = result.rows[0];
            return userWithoutPassword;
        }
        catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error('Username or email already exists');
            }
            console.error('Create user error:', error);
            throw new Error('Failed to create user');
        }
    }
    static async getAllUsers() {
        try {
            const result = await database_1.default.query('SELECT id, username, email, role, created_at, last_login FROM users ORDER BY created_at DESC');
            return result.rows;
        }
        catch (error) {
            console.error('Get all users error:', error);
            throw new Error('Failed to fetch users');
        }
    }
    static async updateUser(userId, updates) {
        try {
            const fields = Object.keys(updates);
            const values = Object.values(updates);
            const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
            const result = await database_1.default.query(`UPDATE users SET ${setClause} WHERE id = $${fields.length + 1} RETURNING id, username, email, role, created_at, last_login`, [...values, userId]);
            if (result.rows.length === 0) {
                throw new Error('User not found');
            }
            return result.rows[0];
        }
        catch (error) {
            console.error('Update user error:', error);
            throw new Error('Failed to update user');
        }
    }
    static async setUserPassword(userId, password) {
        try {
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const result = await database_1.default.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
            if (result.rowCount === 0) {
                throw new Error('User not found');
            }
        }
        catch (error) {
            console.error('Set user password error:', error);
            throw new Error('Failed to set user password');
        }
    }
    static async getUserTokenUsage(userId) {
        try {
            const result = await database_1.default.query(`
        SELECT 
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens,
          COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens,
          COUNT(DISTINCT session_id) as total_sessions,
          MAX(created_at) as last_usage
        FROM chat_messages 
        WHERE user_id = $1 AND role = 'assistant'
      `, [userId]);
            const usage = result.rows[0];
            return {
                totalTokens: parseInt(usage.total_tokens) || 0,
                inputTokens: parseInt(usage.input_tokens) || 0,
                outputTokens: parseInt(usage.output_tokens) || 0,
                totalSessions: parseInt(usage.total_sessions) || 0,
                lastUsage: usage.last_usage ? new Date(usage.last_usage) : null
            };
        }
        catch (error) {
            console.error('Get user token usage error:', error);
            throw new Error('Failed to get user token usage');
        }
    }
    static async getAllUsersWithTokenUsage() {
        try {
            const result = await database_1.default.query(`
        SELECT 
          u.id, u.username, u.email, u.role, u.created_at, u.last_login,
          COALESCE(SUM(cm.input_tokens), 0) as input_tokens,
          COALESCE(SUM(cm.output_tokens), 0) as output_tokens,
          COALESCE(SUM(cm.input_tokens + cm.output_tokens), 0) as total_tokens,
          COUNT(DISTINCT cm.session_id) as total_sessions,
          MAX(cm.created_at) as last_usage
        FROM users u
        LEFT JOIN chat_messages cm ON u.id = cm.user_id AND cm.role = 'assistant'
        GROUP BY u.id, u.username, u.email, u.role, u.created_at, u.last_login
        ORDER BY u.created_at DESC
      `);
            return result.rows.map(row => ({
                id: row.id,
                username: row.username,
                email: row.email,
                role: row.role,
                created_at: row.created_at,
                last_login: row.last_login,
                tokenUsage: {
                    totalTokens: parseInt(row.total_tokens) || 0,
                    inputTokens: parseInt(row.input_tokens) || 0,
                    outputTokens: parseInt(row.output_tokens) || 0,
                    totalSessions: parseInt(row.total_sessions) || 0,
                    lastUsage: row.last_usage ? new Date(row.last_usage) : null
                }
            }));
        }
        catch (error) {
            console.error('Get all users with token usage error:', error);
            throw new Error('Failed to fetch users with token usage');
        }
    }
    static async deleteUser(userId) {
        try {
            const result = await database_1.default.query('DELETE FROM users WHERE id = $1', [userId]);
            if (result.rowCount === 0) {
                throw new Error('User not found');
            }
        }
        catch (error) {
            console.error('Delete user error:', error);
            throw new Error('Failed to delete user');
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map