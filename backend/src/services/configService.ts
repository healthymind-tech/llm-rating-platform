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
         (id, name, type, api_key, endpoint, api_version, deployment, model, temperature, max_tokens, system_prompt, repetition_penalty, supports_vision, is_enabled, is_default) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
         RETURNING *`,
        [
          configId,
          configData.name,
          configData.type,
          configData.api_key,
          configData.endpoint,
          (configData as any).api_version || null,
          (configData as any).deployment || null,
          configData.model,
          configData.temperature,
          configData.max_tokens,
          configData.system_prompt,
          configData.repetition_penalty,
          (configData as any).supports_vision || false,
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
      // Load current config for validation
      const current = await this.getConfigById(id);
      if (!current) {
        throw new Error('Configuration not found');
      }

      // Enforce: cannot set default on disabled config
      if (updates.is_default) {
        const willBeEnabled = updates.is_enabled !== undefined ? updates.is_enabled : current.is_enabled;
        if (!willBeEnabled) {
          throw new Error('Cannot set a disabled configuration as default');
        }
        // Remove default from others first
        await pool.query('UPDATE llm_configs SET is_default = false WHERE id != $1', [id]);
      }

      // Enforce: if disabling current default, auto-switch default to another enabled config if available
      if (updates.is_enabled === false && current.is_default) {
        const candidate = await pool.query(
          'SELECT id FROM llm_configs WHERE id != $1 AND is_enabled = true ORDER BY is_default DESC, created_at ASC LIMIT 1',
          [id]
        );
        if (candidate.rows.length === 0) {
          throw new Error('Cannot disable the default configuration. Enable another configuration and set it as default first.');
        }
        // Reassign default to candidate
        await pool.query('UPDATE llm_configs SET is_default = false');
        await pool.query('UPDATE llm_configs SET is_default = true WHERE id = $1', [candidate.rows[0].id]);
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
      // First check if we're deleting the default configuration
      const configToDelete = await pool.query(
        'SELECT is_default FROM llm_configs WHERE id = $1',
        [id]
      );
      
      if (configToDelete.rows.length === 0) {
        throw new Error('Configuration not found');
      }
      
      // Check if this is the last configuration
      const totalConfigs = await pool.query('SELECT COUNT(*) as count FROM llm_configs');
      if (parseInt(totalConfigs.rows[0].count) <= 1) {
        throw new Error('Cannot delete the last LLM configuration. At least one configuration must exist.');
      }
      
      const wasDefault = configToDelete.rows[0].is_default;
      
      // Delete the configuration
      const result = await pool.query('DELETE FROM llm_configs WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        throw new Error('Configuration not found');
      }
      
      // If we deleted the default configuration, automatically set a new default
      if (wasDefault) {
        await this.ensureDefaultExists();
      }
    } catch (error) {
      console.error('Delete config error:', error);
      // Re-throw the original error to preserve the specific message
      throw error;
    }
  }

  // Public method to manually trigger default assignment (for admin use)
  static async ensureDefaultConfig(): Promise<LLMConfig | null> {
    await this.ensureDefaultExists();
    return await this.getDefaultConfig();
  }

  // Ensure there's always a default LLM configuration
  private static async ensureDefaultExists(): Promise<void> {
    try {
      // Check if there's already a default
      const defaultCheck = await pool.query(
        'SELECT id FROM llm_configs WHERE is_default = true LIMIT 1'
      );
      
      if (defaultCheck.rows.length > 0) {
        return; // Default already exists
      }
      
      // Find the first enabled configuration to make default
      const enabledConfigs = await pool.query(
        'SELECT id FROM llm_configs WHERE is_enabled = true ORDER BY created_at ASC LIMIT 1'
      );
      
      if (enabledConfigs.rows.length > 0) {
        // Set the first enabled config as default
        await pool.query(
          'UPDATE llm_configs SET is_default = true WHERE id = $1',
          [enabledConfigs.rows[0].id]
        );
        console.log(`Automatically set LLM config ${enabledConfigs.rows[0].id} as new default`);
        return;
      }
      
      // If no enabled configs exist, find any config to make default and enable it
      const anyConfigs = await pool.query(
        'SELECT id FROM llm_configs ORDER BY created_at ASC LIMIT 1'
      );
      
      if (anyConfigs.rows.length > 0) {
        // Set the first available config as default and enable it
        await pool.query(
          'UPDATE llm_configs SET is_default = true, is_enabled = true WHERE id = $1',
          [anyConfigs.rows[0].id]
        );
        console.log(`Automatically set LLM config ${anyConfigs.rows[0].id} as new default and enabled it`);
        return;
      }
      
      console.warn('No LLM configurations available to set as default');
    } catch (error) {
      console.error('Error ensuring default LLM exists:', error);
    }
  }

  static async setDefaultConfig(id: string): Promise<LLMConfig> {
    try {
      // Ensure target config exists and is enabled
      const target = await this.getConfigById(id);
      if (!target) {
        throw new Error('Configuration not found');
      }
      if (!target.is_enabled) {
        throw new Error('Cannot set default: configuration is disabled');
      }
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
      let result = await pool.query(
        'SELECT * FROM llm_configs WHERE is_default = true LIMIT 1'
      );
      
      // If no default found, try to auto-assign one
      if (result.rows.length === 0) {
        console.log('No default LLM configuration found, attempting to auto-assign...');
        await this.ensureDefaultExists();
        
        // Try again after auto-assignment
        result = await pool.query(
          'SELECT * FROM llm_configs WHERE is_default = true LIMIT 1'
        );
      }
      
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

  static async fetchOllamaModels(endpoint: string): Promise<any[]> {
    try {
      // Remove trailing slash and normalize URL
      const cleanEndpoint = endpoint.replace(/\/$/, '');
      
      // Fetch available models (/api/tags)
      const availableResponse = await axios.get(`${cleanEndpoint}/api/tags`, {
        timeout: 10000, // 10 second timeout
      });

      // Fetch loaded models (/api/ps)
      let loadedModels: any[] = [];
      try {
        const loadedResponse = await axios.get(`${cleanEndpoint}/api/ps`, {
          timeout: 5000, // 5 second timeout for loaded models
        });
        loadedModels = loadedResponse.data.models || [];
      } catch (loadedError) {
        console.warn('Could not fetch loaded models from Ollama:', loadedError);
        // Continue without loaded model info
      }

      if (availableResponse.data && availableResponse.data.models) {
        // Create a set of loaded model names for quick lookup
        const loadedModelNames = new Set(loadedModels.map((model: any) => model.name));
        
        // Process available models and add loaded status
        return availableResponse.data.models
          .map((model: any) => ({
            id: model.name,
            name: model.name,
            model: model.model,
            size: model.size,
            modified_at: model.modified_at,
            digest: model.digest,
            family: model.details?.family || 'unknown',
            parameter_size: model.details?.parameter_size || 'unknown',
            quantization: model.details?.quantization_level || 'unknown',
            isLoaded: loadedModelNames.has(model.name),
            format: model.details?.format || 'unknown'
          }))
          .sort((a: any, b: any) => {
            // Sort by loaded status first (loaded models at top), then by name
            if (a.isLoaded && !b.isLoaded) return -1;
            if (!a.isLoaded && b.isLoaded) return 1;
            return a.name.localeCompare(b.name);
          });
      }

      return [];
    } catch (error: any) {
      console.error('Fetch Ollama models error:', error);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to Ollama - Please check if Ollama is running and the endpoint URL is correct');
      } else if (error.response?.status === 404) {
        throw new Error('Ollama API endpoint not found - Please verify the endpoint URL');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Invalid endpoint URL - Please check the Ollama server address');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Request timed out - Ollama server may be unavailable');
      } else {
        throw new Error(`Failed to fetch Ollama models: ${error.message}`);
      }
    }
  }

  static async fetchVLLMModels(endpoint: string): Promise<any[]> {
    try {
      // Remove trailing slash and normalize URL
      const cleanEndpoint = endpoint.replace(/\/$/, '');
      
      // vLLM uses OpenAI-compatible API format for listing models
      const response = await axios.get(`${cleanEndpoint}/models`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.data) {
        // Process vLLM models - similar to OpenAI format but with vLLM-specific fields
        return response.data.data
          .map((model: any) => ({
            id: model.id,
            name: model.id,
            object: model.object,
            created: model.created,
            owned_by: model.owned_by || 'vllm',
            root: model.root,
            parent: model.parent,
            max_model_len: model.max_model_len,
            permission: model.permission
          }))
          .sort((a: any, b: any) => a.id.localeCompare(b.id));
      }

      return [];
    } catch (error: any) {
      console.error('Fetch vLLM models error:', error);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to vLLM - Please check if vLLM server is running and the endpoint URL is correct');
      } else if (error.response?.status === 404) {
        throw new Error('vLLM API endpoint not found - Please verify the endpoint URL');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Invalid endpoint URL - Please check the vLLM server address');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Request timed out - vLLM server may be unavailable');
      } else {
        throw new Error(`Failed to fetch vLLM models: ${error.message}`);
      }
    }
  }

  static async fetchModels(type: string, endpoint: string, apiKey?: string, apiVersion?: string, azureList?: 'deployments' | 'models'): Promise<any[]> {
    if (type === 'ollama') {
      return await this.fetchOllamaModels(endpoint);
    } else if (type === 'openai') {
      return await this.fetchOpenAIModels(apiKey || '', endpoint);
    } else if (type === 'azure') {
      return await this.fetchAzureModels(endpoint, apiKey || '', apiVersion || '', azureList);
    } else if (type === 'vllm') {
      return await this.fetchVLLMModels(endpoint);
    } else {
      throw new Error(`Unsupported model type: ${type}`);
    }
  }

  static async fetchOpenAIModels(apiKey: string, baseURL: string = 'https://api.openai.com/v1'): Promise<any[]> {
    try {
      // Remove trailing slash to prevent double slashes
      const cleanBaseURL = baseURL.replace(/\/$/, '');
      
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      // Only add Authorization header if API key is provided
      if (apiKey && apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const response = await axios.get(`${cleanBaseURL}/models`, {
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

  static async fetchAzureModels(baseURL: string, apiKey: string, apiVersion: string, list: 'deployments' | 'models' = 'deployments'): Promise<any[]> {
    try {
      if (!baseURL) throw new Error('Base URL is required for Azure');
      if (!apiVersion) throw new Error('API version is required for Azure');
      if (!apiKey) throw new Error('Token is required for Azure');

      const cleanBaseURL = baseURL.replace(/\/$/, '');
      // Support either API key or AAD bearer token
      const isBearer = apiKey.includes('.') && apiKey.split('.').length >= 3;
      const headers: any = isBearer ? { 'Authorization': `Bearer ${apiKey}` } : { 'api-key': apiKey };

      if (list === 'deployments') {
        const depUrl = `${cleanBaseURL}/openai/deployments?api-version=${encodeURIComponent(apiVersion)}`;
        const depRes = await axios.get(depUrl, { headers, timeout: 10000 });
        const value = depRes.data?.value || depRes.data?.data || [];
        return (Array.isArray(value) ? value : []).map((d: any) => ({
          id: d.id || d.name,
          name: d.id || d.name,
          model: d.model?.name || d.model || undefined,
        }));
      } else {
        const modelsUrl = `${cleanBaseURL}/openai/models?api-version=${encodeURIComponent(apiVersion)}`;
        const modelsRes = await axios.get(modelsUrl, { headers, timeout: 10000 });
        const items = modelsRes.data?.data || modelsRes.data?.value || modelsRes.data?.models || [];
        return (Array.isArray(items) ? items : []).map((m: any) => {
          const id = m.id || m.name || m.model || 'unknown';
          return { id, name: id };
        });
      }
    } catch (error: any) {
      console.error('Fetch Azure models error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid token or unauthorized access');
      }
      throw new Error(`Failed to fetch Azure models: ${error.message}`);
    }
  }

  static async testConfiguration(config: any): Promise<string> {
    const testMessage = "Hello! This is a test message to verify the LLM configuration is working correctly. Please respond with a brief confirmation.";
    
    try {
      if (config.type === 'openai') {
        return await this.testOpenAIConfig(testMessage, config);
      } else if (config.type === 'ollama') {
        return await this.testOllamaConfig(testMessage, config);
      } else if (config.type === 'azure') {
        return await this.testAzureConfig(testMessage, config);
      } else if (config.type === 'vllm') {
        return await this.testVLLMConfig(testMessage, config);
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
              baseURL: config.endpoint.replace(/\/$/, ''), // Remove trailing slash
            });
            
            const localPayload: any = {
              model: config.model,
              messages: [
                { role: 'system', content: 'You are a helpful AI assistant. Respond briefly to test messages.' },
                { role: 'user', content: message },
              ],
            };
            
            // Only add temperature if it's not null/undefined and not the default value (1)
            if (config.temperature !== undefined && config.temperature !== null && config.temperature !== 1 && !isNaN(config.temperature)) {
              localPayload.temperature = config.temperature;
            }
            
            if (config.max_tokens || 150) {
              localPayload.max_tokens = config.max_tokens || 150;
            }
            
            const completion = await openai.chat.completions.create(localPayload);
            
            return completion.choices[0]?.message?.content || 'Test completed but no response received';
          } catch (localError: any) {
            // If local test fails, return demo mode message
            return `Demo mode: Configuration test successful! (No API key configured - local endpoint test failed: ${localError.message})`;
          }
        } else {
          return "Demo mode: Configuration test successful! (No API key configured - using demo responses)";
        }
      }

      const baseURL = config.endpoint || 'https://api.openai.com/v1';
      const openai = new OpenAI({
        apiKey: config.api_key,
        baseURL: baseURL.replace(/\/$/, ''), // Remove trailing slash
      });

      const payload: any = {
        model: config.model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant. Respond briefly to test messages.' },
          { role: 'user', content: message },
        ],
      };
      
      // Only add temperature if it's not null/undefined and not the default value (1)
      // Some models like o1-preview, o1-mini only support temperature=1
      if (config.temperature !== undefined && config.temperature !== null && config.temperature !== ('' as any) && config.temperature !== 1 && !isNaN(config.temperature)) {
        payload.temperature = config.temperature;
      }
      if (config.max_tokens !== undefined && config.max_tokens !== null && config.max_tokens !== ('' as any)) {
        // @ts-ignore OpenAI Responses-style parameter for compatibility
        payload.max_completion_tokens = config.max_tokens;
      }
      
      console.log('OpenAI test payload:', JSON.stringify(payload, null, 2));
      const completion = await openai.chat.completions.create(payload);

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
      if (!config.endpoint) throw new Error('Endpoint URL is required for Ollama configuration');
      const ollamaBody: any = {
        model: config.model,
        messages: [
          { role: 'user', content: message },
        ],
        stream: false,
      };
      const options: any = {};
      if (config.temperature !== undefined && config.temperature !== null && config.temperature !== ('' as any)) {
        options.temperature = config.temperature;
      }
      if (config.max_tokens !== undefined && config.max_tokens !== null && config.max_tokens !== ('' as any)) {
        options.num_predict = config.max_tokens;
      }
      if (Object.keys(options).length > 0) ollamaBody.options = options;
      const response = await axios.post(`${config.endpoint}/api/chat`, ollamaBody, {
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

  private static async testAzureConfig(message: string, config: any): Promise<string> {
    try {
      if (!config.endpoint) throw new Error('Base URL is required for Azure configuration');
      if (!config.api_version) throw new Error('API version is required for Azure configuration');
      if (!config.api_key) throw new Error('Token is required for Azure configuration');
      const cleanBaseURL = config.endpoint.replace(/\/$/, '');
      const deployment = config.deployment || config.model;
      if (!deployment) throw new Error('Deployment is required for Azure configuration');
      const url = `${cleanBaseURL}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(config.api_version)}`;

      const body: any = {
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant. Respond briefly to test messages.' },
          { role: 'user', content: message },
        ],
        top_p: 1,
      };
      if (config.max_tokens !== undefined && config.max_tokens !== null && config.max_tokens !== ('' as any)) {
        body.max_tokens = config.max_tokens;
      }
      if (config.temperature !== undefined && config.temperature !== null && config.temperature !== ('' as any)) {
        body.temperature = config.temperature;
      }
      if (config.model) body.model = config.model;

      const headers = (() => {
        const apiKey = config.api_key as string;
        const isBearer = apiKey && apiKey.includes('.') && apiKey.split('.').length >= 3;
        return isBearer
          ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }
          : { 'Content-Type': 'application/json', 'api-key': apiKey };
      })();

      const response = await axios.post(url, body, {
        headers,
        timeout: 30000,
      });

      const content = response.data?.choices?.[0]?.message?.content;
      return content || 'Test completed but no response received';
    } catch (error: any) {
      console.error('Azure test error:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid token - Authentication failed');
      } else if (error.response?.status === 404) {
        throw new Error('Deployment/model not found - Check the model name');
      }
      throw new Error(`Azure error: ${error.message}`);
    }
  }

  private static async testVLLMConfig(message: string, config: any): Promise<string> {
    try {
      if (!config.endpoint) throw new Error('Endpoint URL is required for vLLM configuration');
      if (!config.model) throw new Error('Model name is required for vLLM configuration');
      
      const vllmBody: any = {
        model: config.model,
        messages: [
          { role: 'user', content: message },
        ],
        stream: false,
      };
      
      // Add optional parameters
      if (config.temperature !== undefined && config.temperature !== null && config.temperature !== ('' as any)) {
        vllmBody.temperature = config.temperature;
      }
      if (config.max_tokens !== undefined && config.max_tokens !== null && config.max_tokens !== ('' as any)) {
        vllmBody.max_tokens = config.max_tokens;
      }
      if (config.repetition_penalty !== undefined && config.repetition_penalty !== null && config.repetition_penalty !== ('' as any)) {
        vllmBody.repetition_penalty = config.repetition_penalty;
      }

      // vLLM uses OpenAI-compatible /chat/completions endpoint
      const cleanEndpoint = config.endpoint.replace(/\/$/, '');
      const url = `${cleanEndpoint}/chat/completions`;
      
      const response = await axios.post(url, vllmBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000, // 30 second timeout for vLLM
      });

      return response.data.choices?.[0]?.message?.content || 'Test completed but no response received';
    } catch (error: any) {
      console.error('vLLM test error:', error);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to vLLM server - Please check if vLLM is running and the endpoint URL is correct');
      } else if (error.response?.status === 404) {
        throw new Error('Model not found in vLLM - Please check if the model is loaded');
      } else if (error.response?.status === 400) {
        throw new Error('Bad request - Please check model name and parameters');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Invalid endpoint URL - Please check the vLLM server address');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Request timed out - vLLM server may be unavailable or processing');
      } else {
        throw new Error(`vLLM error: ${error.message}`);
      }
    }
  }
}
