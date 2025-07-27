import pool from '../config/database';
import { SystemSetting } from '../types';

export class SystemSettingsService {
  static async getAllSettings(): Promise<SystemSetting[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM system_settings ORDER BY setting_key ASC'
      );
      return result.rows.map(row => ({
        ...row,
        setting_value: this.parseSettingValue(row.setting_value, row.setting_type)
      }));
    } catch (error) {
      console.error('Get all settings error:', error);
      throw new Error('Failed to fetch system settings');
    }
  }

  static async getSetting(key: string): Promise<SystemSetting | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM system_settings WHERE setting_key = $1',
        [key]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        setting_value: this.parseSettingValue(row.setting_value, row.setting_type)
      };
    } catch (error) {
      console.error('Get setting error:', error);
      throw new Error('Failed to fetch setting');
    }
  }

  static async getSettingValue(key: string): Promise<any> {
    const setting = await this.getSetting(key);
    return setting ? setting.setting_value : null;
  }

  static async updateSetting(key: string, value: any, type?: string): Promise<SystemSetting> {
    try {
      const stringValue = this.stringifySettingValue(value, type);
      
      const result = await pool.query(
        `UPDATE system_settings 
         SET setting_value = $1, setting_type = COALESCE($2, setting_type), updated_at = CURRENT_TIMESTAMP 
         WHERE setting_key = $3 
         RETURNING *`,
        [stringValue, type, key]
      );

      if (result.rows.length === 0) {
        throw new Error('Setting not found');
      }

      const row = result.rows[0];
      return {
        ...row,
        setting_value: this.parseSettingValue(row.setting_value, row.setting_type)
      };
    } catch (error) {
      console.error('Update setting error:', error);
      throw new Error('Failed to update setting');
    }
  }

  static async createSetting(key: string, value: any, type: string, description?: string): Promise<SystemSetting> {
    try {
      const stringValue = this.stringifySettingValue(value, type);
      
      const result = await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value, setting_type, description) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [key, stringValue, type, description]
      );

      const row = result.rows[0];
      return {
        ...row,
        setting_value: this.parseSettingValue(row.setting_value, row.setting_type)
      };
    } catch (error) {
      console.error('Create setting error:', error);
      throw new Error('Failed to create setting');
    }
  }

  static async deleteSetting(key: string): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM system_settings WHERE setting_key = $1',
        [key]
      );

      if (result.rowCount === 0) {
        throw new Error('Setting not found');
      }
    } catch (error) {
      console.error('Delete setting error:', error);
      throw new Error('Failed to delete setting');
    }
  }

  static async updateMultipleSettings(settings: Array<{key: string, value: any}>): Promise<SystemSetting[]> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updatedSettings: SystemSetting[] = [];
      
      for (const setting of settings) {
        const result = await client.query(
          `UPDATE system_settings 
           SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE setting_key = $2 
           RETURNING *`,
          [this.stringifySettingValue(setting.value), setting.key]
        );

        if (result.rows.length > 0) {
          const row = result.rows[0];
          updatedSettings.push({
            ...row,
            setting_value: this.parseSettingValue(row.setting_value, row.setting_type)
          });
        }
      }
      
      await client.query('COMMIT');
      return updatedSettings;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update multiple settings error:', error);
      throw new Error('Failed to update settings');
    } finally {
      client.release();
    }
  }

  private static parseSettingValue(value: string, type: string): any {
    switch (type) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return parseFloat(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      case 'string':
      default:
        return value;
    }
  }

  private static stringifySettingValue(value: any, type?: string): string {
    if (type === 'json' || (typeof value === 'object' && value !== null)) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  // Language-specific methods
  static async getSystemLanguage(): Promise<string> {
    const language = await this.getSettingValue('system_language');
    return language || 'en';
  }

  static async setSystemLanguage(language: string): Promise<void> {
    if (!['en', 'zh-TW'].includes(language)) {
      throw new Error('Unsupported language. Only "en" and "zh-TW" are supported.');
    }
    await this.updateSetting('system_language', language);
  }
}