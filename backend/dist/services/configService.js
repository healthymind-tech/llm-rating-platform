"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const openai_1 = __importDefault(require("openai"));
const database_1 = __importDefault(require("../config/database"));
class ConfigService {
    static async getAllConfigs() {
        try {
            const result = await database_1.default.query('SELECT * FROM llm_configs ORDER BY created_at DESC');
            return result.rows;
        }
        catch (error) {
            console.error('Get all configs error:', error);
            throw new Error('Failed to fetch configurations');
        }
    }
    static async getConfigById(id) {
        try {
            const result = await database_1.default.query('SELECT * FROM llm_configs WHERE id = $1', [id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            console.error('Get config by ID error:', error);
            throw new Error('Failed to fetch configuration');
        }
    }
    static async createConfig(configData) {
        try {
            const configId = (0, uuid_1.v4)();
            // If this config is set to active, deactivate all others first
            if (configData.is_active) {
                await database_1.default.query('UPDATE llm_configs SET is_active = false');
            }
            const result = await database_1.default.query(`INSERT INTO llm_configs 
         (id, name, type, api_key, endpoint, model, temperature, max_tokens, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`, [
                configId,
                configData.name,
                configData.type,
                configData.api_key,
                configData.endpoint,
                configData.model,
                configData.temperature,
                configData.max_tokens,
                configData.is_active,
            ]);
            return result.rows[0];
        }
        catch (error) {
            console.error('Create config error:', error);
            if (error.code === '23505') {
                throw new Error('Configuration name must be unique');
            }
            throw new Error('Failed to create configuration');
        }
    }
    static async updateConfig(id, updates) {
        try {
            // If this config is being set to active, deactivate all others first
            if (updates.is_active) {
                await database_1.default.query('UPDATE llm_configs SET is_active = false WHERE id != $1', [id]);
            }
            const fields = Object.keys(updates);
            const values = Object.values(updates);
            const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
            const result = await database_1.default.query(`UPDATE llm_configs SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`, [...values, id]);
            if (result.rows.length === 0) {
                throw new Error('Configuration not found');
            }
            return result.rows[0];
        }
        catch (error) {
            console.error('Update config error:', error);
            if (error.code === '23505') {
                throw new Error('Configuration name must be unique');
            }
            throw new Error('Failed to update configuration');
        }
    }
    static async deleteConfig(id) {
        try {
            const result = await database_1.default.query('DELETE FROM llm_configs WHERE id = $1', [id]);
            if (result.rowCount === 0) {
                throw new Error('Configuration not found');
            }
        }
        catch (error) {
            console.error('Delete config error:', error);
            throw new Error('Failed to delete configuration');
        }
    }
    static async setActiveConfig(id) {
        try {
            // Deactivate all configs
            await database_1.default.query('UPDATE llm_configs SET is_active = false');
            // Activate the specified config
            const result = await database_1.default.query('UPDATE llm_configs SET is_active = true WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) {
                throw new Error('Configuration not found');
            }
            return result.rows[0];
        }
        catch (error) {
            console.error('Set active config error:', error);
            throw new Error('Failed to set active configuration');
        }
    }
    static async getActiveConfig() {
        try {
            const result = await database_1.default.query('SELECT * FROM llm_configs WHERE is_active = true LIMIT 1');
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            console.error('Get active config error:', error);
            throw new Error('Failed to get active configuration');
        }
    }
    static async fetchOpenAIModels(apiKey, baseURL = 'https://api.openai.com/v1') {
        try {
            const response = await axios_1.default.get(`${baseURL}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000, // 10 second timeout
            });
            if (response.data && response.data.data) {
                // Filter and sort models for better usability
                return response.data.data
                    .filter((model) => model.id && !model.id.includes('embed'))
                    .map((model) => ({
                    id: model.id,
                    object: model.object,
                    created: model.created,
                    owned_by: model.owned_by || 'unknown',
                }))
                    .sort((a, b) => a.id.localeCompare(b.id));
            }
            return [];
        }
        catch (error) {
            console.error('Fetch OpenAI models error:', error);
            if (error.response?.status === 401) {
                throw new Error('Invalid API key or unauthorized access');
            }
            else if (error.response?.status === 403) {
                throw new Error('API key does not have permission to access models');
            }
            else if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
                throw new Error('Unable to connect to API endpoint. Please check the URL.');
            }
            else if (error.code === 'ENOTFOUND') {
                throw new Error('Invalid API endpoint URL');
            }
            else {
                throw new Error(`Failed to fetch models: ${error.message}`);
            }
        }
    }
    static async testConfiguration(config) {
        const testMessage = "Hello! This is a test message to verify the LLM configuration is working correctly. Please respond with a brief confirmation.";
        try {
            if (config.type === 'openai') {
                return await this.testOpenAIConfig(testMessage, config);
            }
            else if (config.type === 'ollama') {
                return await this.testOllamaConfig(testMessage, config);
            }
            else {
                throw new Error('Unsupported LLM type for testing');
            }
        }
        catch (error) {
            console.error('Test configuration error:', error);
            throw new Error(`Configuration test failed: ${error.message}`);
        }
    }
    static async testOpenAIConfig(message, config) {
        try {
            if (!config.api_key) {
                return "Demo mode: Configuration test successful! (No API key configured - using demo responses)";
            }
            const openai = new openai_1.default({
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
        }
        catch (error) {
            console.error('OpenAI test error:', error);
            if (error.status === 401) {
                throw new Error('Invalid API key - Authentication failed');
            }
            else if (error.status === 403) {
                throw new Error('API key does not have permission to access this model');
            }
            else if (error.status === 404) {
                throw new Error('Model not found - Please check the model name');
            }
            else if (error.status === 429) {
                throw new Error('Rate limit exceeded - Please try again later');
            }
            else if (error.code === 'ECONNREFUSED' || error.status >= 500) {
                throw new Error('Unable to connect to API endpoint - Please check the URL');
            }
            else {
                throw new Error(`OpenAI API error: ${error.message}`);
            }
        }
    }
    static async testOllamaConfig(message, config) {
        try {
            if (!config.endpoint) {
                throw new Error('Endpoint URL is required for Ollama configuration');
            }
            const response = await axios_1.default.post(`${config.endpoint}/api/chat`, {
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
        }
        catch (error) {
            console.error('Ollama test error:', error);
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Unable to connect to Ollama - Please check if Ollama is running and the endpoint URL is correct');
            }
            else if (error.response?.status === 404) {
                throw new Error('Model not found in Ollama - Please pull the model first');
            }
            else if (error.code === 'ENOTFOUND') {
                throw new Error('Invalid endpoint URL - Please check the Ollama server address');
            }
            else if (error.code === 'ETIMEDOUT') {
                throw new Error('Request timed out - Ollama may be processing or unavailable');
            }
            else {
                throw new Error(`Ollama error: ${error.message}`);
            }
        }
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=configService.js.map