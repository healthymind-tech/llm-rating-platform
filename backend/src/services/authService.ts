import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { User, JWTPayload } from '../types';

export class AuthService {
  static async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; token: string } | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate JWT token
      const payload: JWTPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
        expiresIn: '24h',
      });

      // Return user without password hash
      const { password_hash, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, token };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Login failed');
    }
  }

  static async createUser(username: string, email: string, password: string, role: 'admin' | 'user' = 'user'): Promise<Omit<User, 'password_hash'>> {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      const result = await pool.query(
        'INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, username, email, hashedPassword, role]
      );

      const { password_hash, ...userWithoutPassword } = result.rows[0];
      return userWithoutPassword;
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Username or email already exists');
      }
      console.error('Create user error:', error);
      throw new Error('Failed to create user');
    }
  }

  static async getAllUsers(): Promise<Omit<User, 'password_hash'>[]> {
    try {
      const result = await pool.query(
        'SELECT id, username, email, role, created_at, last_login FROM users ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Get all users error:', error);
      throw new Error('Failed to fetch users');
    }
  }

  static async updateUser(userId: string, updates: Partial<Pick<User, 'username' | 'email' | 'role'>>): Promise<Omit<User, 'password_hash'>> {
    try {
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

      const result = await pool.query(
        `UPDATE users SET ${setClause} WHERE id = $${fields.length + 1} RETURNING id, username, email, role, created_at, last_login`,
        [...values, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Update user error:', error);
      throw new Error('Failed to update user');
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      
      if (result.rowCount === 0) {
        throw new Error('User not found');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      throw new Error('Failed to delete user');
    }
  }
}