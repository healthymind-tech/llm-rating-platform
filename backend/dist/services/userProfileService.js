"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userProfileService = void 0;
const database_1 = __importDefault(require("../config/database"));
class UserProfileService {
    async getUserProfile(userId) {
        const query = `
      SELECT id, username, email, role, height, weight, body_fat, 
             lifestyle_habits, profile_completed, created_at, last_login
      FROM users 
      WHERE id = $1
    `;
        try {
            const result = await database_1.default.query(query, [userId]);
            return result.rows[0] || null;
        }
        catch (error) {
            console.error('Error fetching user profile:', error);
            throw new Error('Failed to fetch user profile');
        }
    }
    async updateUserProfile(userId, profileData) {
        const { height, weight, body_fat, lifestyle_habits } = profileData;
        const query = `
      UPDATE users 
      SET height = $2, weight = $3, body_fat = $4, lifestyle_habits = $5
      WHERE id = $1
      RETURNING id, username, email, role, height, weight, body_fat, 
                lifestyle_habits, profile_completed, created_at, last_login
    `;
        try {
            const result = await database_1.default.query(query, [userId, height, weight, body_fat, lifestyle_habits]);
            if (result.rows.length === 0) {
                throw new Error('User not found');
            }
            return result.rows[0];
        }
        catch (error) {
            console.error('Error updating user profile:', error);
            throw new Error('Failed to update user profile');
        }
    }
    async checkProfileCompletion(userId) {
        const query = `
      SELECT profile_completed 
      FROM users 
      WHERE id = $1
    `;
        try {
            const result = await database_1.default.query(query, [userId]);
            return result.rows[0]?.profile_completed || false;
        }
        catch (error) {
            console.error('Error checking profile completion:', error);
            throw new Error('Failed to check profile completion');
        }
    }
    async getUserProfileForLLM(userId) {
        const profile = await this.getUserProfile(userId);
        if (!profile || !profile.profile_completed) {
            return '';
        }
        const profileInfo = [];
        if (profile.height) {
            profileInfo.push(`Height: ${profile.height}cm`);
        }
        if (profile.weight) {
            profileInfo.push(`Weight: ${profile.weight}kg`);
        }
        if (profile.body_fat) {
            profileInfo.push(`Body fat: ${profile.body_fat}%`);
        }
        if (profile.lifestyle_habits) {
            profileInfo.push(`Lifestyle habits: ${profile.lifestyle_habits}`);
        }
        return profileInfo.length > 0
            ? `User profile: ${profileInfo.join(', ')}`
            : '';
    }
}
exports.userProfileService = new UserProfileService();
//# sourceMappingURL=userProfileService.js.map