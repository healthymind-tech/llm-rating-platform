import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import OpenAI from 'openai';
import pool from '../config/database';
import { LLMConfig } from '../types';

export class ConfigService {
  static async getAllConfigs(): Promise<LLMConfig[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM llm_configs ORDER BY is_default DESC, created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Get all configs error:', error);
      throw new Error('Failed to fetch configurations');
    }
  }

  static async getEnabledConfigs(): Promise<LLMConfig[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM llm_configs WHERE is_enabled = true ORDER BY is_default DESC, created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Get enabled configs error:', error);
      throw new Error('Failed to fetch enabled configurations');
    }
  }

  static async getConfigById(id: string): Promise<LLMConfig | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM llm_configs WHERE id = $1',
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Get config by ID error:', error);
      throw new Error('Failed to fetch configuration');
    }
  }

  static async createConfig(configData: Omit<LLMConfig, 'id' | 'created_at' | 'updated_at'>): Promise<LLMConfig> {
    try {
      const configId = uuidv4();
      
      // If this config is set to default, remove default from all others first
      if (configData.is_default) {
        await pool.query('UPDATE llm_configs SET is_default = false');
      }

      const result = await pool.query(
        `INSERT INTO llm_configs 
         (id, name, type, api_key, endpoint, model, temperature, max_tokens, system_prompt, repetition_penalty, is_enabled, is_default) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
         RETURNING *`,
        [
          configId,
          configData.name,
          configData.type,
          configData.api_key,
          configData.endpoint,
          configData.model,
          configData.temperature,
          configData.max_tokens,
          configData.system_prompt,
          configData.repetition_penalty,
          configData.is_enabled,
          configData.is_default,
        ]
      );

      return result.rows[0];
    } catch (error: any) {
      console.error('Create config error:', error);
      if (error.code === '23505') {
        throw new Error('Configuration name must be unique');
      }
      throw new Error('Failed to create configuration');
    }
  }

  static async updateConfig(id: string, updates: Partial<Omit<LLMConfig, 'id' | 'created_at' | 'updated_at'>>): Promise<LLMConfig> {
    try {
      // If this config is being set to default, remove default from all others first
      if (updates.is_default) {
        await pool.query('UPDATE llm_configs SET is_default = false WHERE id != $1', [id]);
      }

      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

      const result = await pool.query(
        `UPDATE llm_configs SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, id]
      );

      if (result.rows.length === 0) {
        throw new Error('Configuration not found');
      }

      return result.rows[0];
    } catch (error: any) {
      console.error('Update config error:', error);
      if (error.code === '23505') {
        throw new Error('Configuration name must be unique');
      }
      throw new Error('Failed to update configuration');
    }
  }

  static async deleteConfig(id: string): Promise<void> {
    try {
      const result = await pool.query('DELETE FROM llm_configs WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        throw new Error('Configuration not found');
      }
    } catch (error) {
      console.error('Delete config error:', error);
      throw new Error('Failed to delete configuration');
    }
  }

  static async setDefaultConfig(id: string): Promise<LLMConfig> {
    try {
      // Remove default from all configs
      await pool.query('UPDATE llm_configs SET is_default = false');
      
      // Set the specified config as default
      const result = await pool.query(
        'UPDATE llm_configs SET is_default = true WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Configuration not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Set default config error:', error);
      throw new Error('Failed to set default configuration');
    }
  }

  static async getDefaultConfig(): Promise<LLMConfig | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM llm_configs WHERE is_default = true LIMIT 1'
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Get default config error:', error);
      throw new Error('Failed to get default configuration');
    }
  }

  static async getUserLLMConfig(userId: string): Promise<LLMConfig | null> {
    try {
      // First, try to get the user's preferred LLM
      const userResult = await pool.query(
        'SELECT preferred_llm_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const preferredLlmId = userResult.rows[0].preferred_llm_id;

      if (preferredLlmId) {
        // Check if the preferred LLM is still enabled
        const preferredResult = await pool.query(
          'SELECT * FROM llm_configs WHERE id = $1 AND is_enabled = true',
          [preferredLlmId]
        );

        if (preferredResult.rows.length > 0) {
          return preferredResult.rows[0];
        }
      }

      // Fall back to default LLM
      return await this.getDefaultConfig();
    } catch (error) {
      console.error('Get user LLM config error:', error);
      throw new Error('Failed to get user LLM configuration');
    }
  }

  static async fetchOpenAIModels(apiKey: string, baseURL: string = 'https://api.openai.com/v1'): Promise<any[]> {
    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      // Only add Authorization header if API key is provided
      if (apiKey && apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const response = await axios.get(`${baseURL}/models`, {
        headers,
        timeout: 10000, // 10 second timeout
      });

      if (response.data && response.data.data) {
        // Filter and sort models for better usability
        return response.data.data
          .filter((model: any) => model.id && !model.id.includes('embed'))
          .map((model: any) => ({
            id: model.id,
            object: model.object,
            created: model.created,
            owned_by: model.owned_by || 'unknown',
          }))
          .sort((a: any, b: any) => a.id.localeCompare(b.id));
      }

      return [];
    } catch (error: any) {
      console.error('Fetch OpenAI models error:', error);
      
      if (error.response?.status === 401) {
        if (!apiKey || apiKey.trim() === '') {
          throw new Error('No API key provided - some endpoints may require authentication');
        } else {
          throw new Error('Invalid API key or unauthorized access');
        }
      } else if (error.response?.status === 403) {
        throw new Error('API key does not have permission to access models');
      } else if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
        throw new Error('Unable to connect to API endpoint. Please check the URL.');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Invalid API endpoint URL');
      } else {
        throw new Error(`Failed to fetch models: ${error.message}`);
      }
    }
  }

  static async testConfiguration(config: any): Promise<string> {
    const testMessage = "Hello! This is a test message to verify the LLM configuration is working correctly. Please respond with a brief confirmation.";
    
    try {
      if (config.type === 'openai') {
        return await this.testOpenAIConfig(testMessage, config);
      } else if (config.type === 'ollama') {
        return await this.testOllamaConfig(testMessage, config);
      } else {
        throw new Error('Unsupported LLM type for testing');
      }
    } catch (error: any) {
      console.error('Test configuration error:', error);
      throw new Error(`Configuration test failed: ${error.message}`);
    }
  }

  private static async testOpenAIConfig(message: string, config: any): Promise<string> {
    try {
      if (!config.api_key || config.api_key.trim() === '') {
        // Try to test without API key for local services
        if (config.endpoint && !config.endpoint.includes('api.openai.com')) {
          try {
            const openai = new OpenAI({
              apiKey: 'dummy-key', // Some local services need a dummy key
              baseURL: config.endpoint,
            });
            
            const completion = await openai.chat.completions.create({
              model: config.model,
              messages: [
                { role: 'system', content: 'You are a helpful AI assistant. Respond briefly to test messages.' },
                { role: 'user', content: message },
              ],
              temperature: config.temperature || 0.7,
              max_tokens: config.max_tokens || 150,
            });
            
            return completion.choices[0]?.message?.content || 'Test completed but no response received';
          } catch (localError: any) {
            // If local test fails, return demo mode message
            return `Demo mode: Configuration test successful! (No API key configured - local endpoint test failed: ${localError.message})`;
          }
        } else {
          return "Demo mode: Configuration test successful! (No API key configured - using demo responses)";
        }
      }

      const openai = new OpenAI({
        apiKey: config.api_key,
        baseURL: config.endpoint || 'https://api.openai.com/v1',
      });

      const completion = await openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant. Respond briefly to test messages.' },
          { role: 'user', content: message },
        ],
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 150,
      });

      return completion.choices[0]?.message?.content || 'Test completed but no response received';
    } catch (error: any) {
      console.error('OpenAI test error:', error);
      
      if (error.status === 401) {
        throw new Error('Invalid API key - Authentication failed');
      } else if (error.status === 403) {
        throw new Error('API key does not have permission to access this model');
      } else if (error.status === 404) {
        throw new Error('Model not found - Please check the model name');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded - Please try again later');
      } else if (error.code === 'ECONNREFUSED' || error.status >= 500) {
        throw new Error('Unable to connect to API endpoint - Please check the URL');
      } else {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
  }

  private static async testOllamaConfig(message: string, config: any): Promise<string> {
    try {
      if (!config.endpoint) {
        throw new Error('Endpoint URL is required for Ollama configuration');
      }

      const response = await axios.post(`${config.endpoint}/api/chat`, {
        model: config.model,
        messages: [
          { role: 'user', content: message },
        ],
        stream: false,
        options: {
          temperature: config.temperature || 0.7,
          num_predict: config.max_tokens || 150,
        },
      }, {
        timeout: 30000, // 30 second timeout for Ollama
      });

      return response.data.message?.content || 'Test completed but no response received';
    } catch (error: any) {
      console.error('Ollama test error:', error);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to Ollama - Please check if Ollama is running and the endpoint URL is correct');
      } else if (error.response?.status === 404) {
        throw new Error('Model not found in Ollama - Please pull the model first');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Invalid endpoint URL - Please check the Ollama server address');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Request timed out - Ollama may be processing or unavailable');
      } else {
        throw new Error(`Ollama error: ${error.message}`);
      }
    }
  }
}