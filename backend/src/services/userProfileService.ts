import pool from '../config/database';
import { SystemSettingsService } from './systemSettingsService';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  height?: number;
  weight?: number;
  body_fat?: number;
  lifestyle_habits?: string;
  profile_completed: boolean;
  include_body_in_prompts: boolean;
  preferred_llm_id?: string;
  created_at: string;
  last_login?: string;
}

export interface UpdateProfileData {
  height?: number;
  weight?: number;
  body_fat?: number;
  lifestyle_habits?: string;
  include_body_in_prompts?: boolean;
  preferred_llm_id?: string;
}

class UserProfileService {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const query = `
      SELECT id, username, email, role, height, weight, body_fat, 
             lifestyle_habits, profile_completed, include_body_in_prompts, preferred_llm_id, created_at, last_login
      FROM users 
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  async updateUserProfile(userId: string, profileData: UpdateProfileData): Promise<UserProfile> {
    const { height, weight, body_fat, lifestyle_habits, include_body_in_prompts, preferred_llm_id } = profileData;
    
    const query = `
      UPDATE users 
      SET height = $2, weight = $3, body_fat = $4, lifestyle_habits = $5, 
          include_body_in_prompts = COALESCE($6, include_body_in_prompts),
          preferred_llm_id = COALESCE($7, preferred_llm_id)
      WHERE id = $1
      RETURNING id, username, email, role, height, weight, body_fat, 
                lifestyle_habits, profile_completed, include_body_in_prompts, preferred_llm_id, created_at, last_login
    `;
    
    try {
      const result = await pool.query(query, [userId, height, weight, body_fat, lifestyle_habits, include_body_in_prompts, preferred_llm_id]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  async checkProfileCompletion(userId: string): Promise<boolean> {
    try {
      // If body info is not required, profile is considered complete by default
      const isBodyInfoRequired = await this.isBodyInfoRequired();
      
      if (!isBodyInfoRequired) {
        return true;
      }
      
      const query = `
        SELECT profile_completed 
        FROM users 
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0]?.profile_completed || false;
    } catch (error) {
      console.error('Error checking profile completion:', error);
      throw new Error('Failed to check profile completion');
    }
  }

  async getUserProfileForLLM(userId: string): Promise<string> {
    // Check if body information is required/enabled at system level
    const requireBodyInfo = await SystemSettingsService.getSettingValue('require_user_body_info');
    
    if (!requireBodyInfo) {
      return '';
    }

    const profile = await this.getUserProfile(userId);
    
    if (!profile || !profile.profile_completed) {
      return '';
    }

    // Check user's personal preference for including body info in prompts
    if (!profile.include_body_in_prompts) {
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

  async isBodyInfoRequired(): Promise<boolean> {
    try {
      const requireBodyInfo = await SystemSettingsService.getSettingValue('require_user_body_info');
      return requireBodyInfo === true;
    } catch (error) {
      console.error('Error checking body info requirement:', error);
      return true; // Default to requiring body info if unable to check
    }
  }

  async updateUserLLMPreference(userId: string, llmId: string | null): Promise<void> {
    const query = `
      UPDATE users 
      SET preferred_llm_id = $2
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [userId, llmId]);
      
      if (result.rowCount === 0) {
        throw new Error('User not found');
      }
    } catch (error) {
      console.error('Error updating user LLM preference:', error);
      throw new Error('Failed to update LLM preference');
    }
  }

  async getUserLLMPreference(userId: string): Promise<string | null> {
    const query = `
      SELECT preferred_llm_id 
      FROM users 
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0]?.preferred_llm_id || null;
    } catch (error) {
      console.error('Error fetching user LLM preference:', error);
      throw new Error('Failed to fetch LLM preference');
    }
  }
}

export const userProfileService = new UserProfileService();