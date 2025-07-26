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
    static async login(username, password) {
        try {
            const result = await database_1.default.query('SELECT * FROM users WHERE username = $1', [username]);
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