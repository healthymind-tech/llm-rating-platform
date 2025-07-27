"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const uuid_1 = require("uuid");
const openai_1 = __importDefault(require("openai"));
const axios_1 = __importDefault(require("axios"));
const database_1 = __importDefault(require("../config/database"));
const userProfileService_1 = require("./userProfileService");
class ChatService {
    static async createChatSession(userId) {
        try {
            const sessionId = (0, uuid_1.v4)();
            const result = await database_1.default.query('INSERT INTO chat_sessions (id, user_id) VALUES ($1, $2) RETURNING *', [sessionId, userId]);
            return result.rows[0];
        }
        catch (error) {
            console.error('Create chat session error:', error);
            throw new Error('Failed to create chat session');
        }
    }
    static async getChatSessions(userId) {
        try {
            const result = await database_1.default.query('SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
            return result.rows;
        }
        catch (error) {
            console.error('Get chat sessions error:', error);
            throw new Error('Failed to fetch chat sessions');
        }
    }
    static async getChatMessages(sessionId, userId) {
        try {
            // Verify session belongs to user
            const sessionResult = await database_1.default.query('SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
            if (sessionResult.rows.length === 0) {
                throw new Error('Chat session not found');
            }
            const result = await database_1.default.query('SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC', [sessionId]);
            return result.rows;
        }
        catch (error) {
            console.error('Get chat messages error:', error);
            throw new Error('Failed to fetch chat messages');
        }
    }
    static async saveMessage(sessionId, userId, role, content) {
        try {
            const messageId = (0, uuid_1.v4)();
            const result = await database_1.default.query('INSERT INTO chat_messages (id, session_id, user_id, role, content) VALUES ($1, $2, $3, $4, $5) RETURNING *', [messageId, sessionId, userId, role, content]);
            // Update session timestamp
            await database_1.default.query('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [sessionId]);
            return result.rows[0];
        }
        catch (error) {
            console.error('Save message error:', error);
            throw new Error('Failed to save message');
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
    static async sendMessageToLLM(message, sessionId, userId) {
        try {
            const config = await this.getActiveConfig();
            if (!config) {
                throw new Error('No active LLM configuration found');
            }
            // Get conversation history
            const messages = await this.getChatMessages(sessionId, userId);
            let response;
            if (config.type === 'openai') {
                response = await this.sendToOpenAI(message, messages, config, userId);
            }
            else if (config.type === 'ollama') {
                response = await this.sendToOllama(message, messages, config, userId);
            }
            else {
                throw new Error('Unsupported LLM type');
            }
            return response;
        }
        catch (error) {
            console.error('Send message to LLM error:', error);
            throw error;
        }
    }
    // New streaming method
    static async sendMessageToLLMStream(message, sessionId, userId, res) {
        try {
            const config = await this.getActiveConfig();
            if (!config) {
                throw new Error('No active LLM configuration found');
            }
            // Get conversation history
            const messages = await this.getChatMessages(sessionId, userId);
            let fullResponse = '';
            if (config.type === 'openai') {
                fullResponse = await this.sendToOpenAIStream(message, messages, config, userId, res);
            }
            else if (config.type === 'ollama') {
                fullResponse = await this.sendToOllamaStream(message, messages, config, userId, res);
            }
            else {
                throw new Error('Unsupported LLM type');
            }
            return fullResponse;
        }
        catch (error) {
            console.error('Send message to LLM stream error:', error);
            throw error;
        }
    }
    static async sendToOpenAI(message, history, config, userId) {
        try {
            if (!config.api_key || config.api_key === null) {
                // Return demo response when no API key is configured
                console.log('No API key configured, returning demo response');
                return this.getDemoResponse(message);
            }
            console.log('Using OpenAI API with key:', config.api_key ? 'configured' : 'not configured');
            const openai = new openai_1.default({
                apiKey: config.api_key,
                baseURL: config.endpoint || 'https://api.openai.com/v1',
            });
            // Get user profile information for context
            let userProfileContext = '';
            if (userId) {
                try {
                    userProfileContext = await userProfileService_1.userProfileService.getUserProfileForLLM(userId);
                }
                catch (error) {
                    console.warn('Could not get user profile for LLM context:', error);
                }
            }
            // Build system message with user profile context
            let systemMessage = 'You are a helpful AI assistant.';
            if (userProfileContext) {
                systemMessage += ` ${userProfileContext}. Please consider this information when providing health, fitness, or lifestyle recommendations.`;
            }
            // Convert chat history to OpenAI format - include full session history
            const messages = [
                { role: 'system', content: systemMessage },
                ...history.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                })),
                { role: 'user', content: message },
            ];
            const completion = await openai.chat.completions.create({
                model: config.model,
                messages: messages,
                temperature: parseFloat(config.temperature),
                max_tokens: parseInt(config.max_tokens),
            });
            return completion.choices[0]?.message?.content || 'No response generated';
        }
        catch (error) {
            console.error('OpenAI API error:', error);
            throw new Error(`OpenAI API error: ${error.message}`);
        }
    }
    // Streaming version for OpenAI
    static async sendToOpenAIStream(message, history, config, userId, res) {
        try {
            if (!config.api_key || config.api_key === null) {
                // Return demo response when no API key is configured
                console.log('No API key configured, returning demo response');
                const demoResponse = this.getDemoResponse(message);
                // Simulate streaming for demo
                const words = demoResponse.split(' ');
                for (let i = 0; i < words.length; i++) {
                    const chunk = (i === 0 ? words[i] : ' ' + words[i]);
                    res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
                    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to simulate streaming
                }
                res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
                return demoResponse;
            }
            console.log('Using OpenAI API with streaming');
            const openai = new openai_1.default({
                apiKey: config.api_key,
                baseURL: config.endpoint || 'https://api.openai.com/v1',
            });
            // Get user profile information for context
            let userProfileContext = '';
            if (userId) {
                try {
                    userProfileContext = await userProfileService_1.userProfileService.getUserProfileForLLM(userId);
                }
                catch (error) {
                    console.warn('Could not get user profile for LLM context:', error);
                }
            }
            // Build system message with user profile context
            let systemMessage = 'You are a helpful AI assistant.';
            if (userProfileContext) {
                systemMessage += ` ${userProfileContext}. Please consider this information when providing health, fitness, or lifestyle recommendations.`;
            }
            // Convert chat history to OpenAI format
            const messages = [
                { role: 'system', content: systemMessage },
                ...history.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                })),
                { role: 'user', content: message },
            ];
            const stream = await openai.chat.completions.create({
                model: config.model,
                messages: messages,
                temperature: parseFloat(config.temperature),
                max_tokens: parseInt(config.max_tokens),
                stream: true,
            });
            let fullResponse = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullResponse += content;
                    res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
                }
            }
            res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
            return fullResponse;
        }
        catch (error) {
            console.error('OpenAI streaming API error:', error);
            res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
            throw new Error(`OpenAI API error: ${error.message}`);
        }
    }
    static async sendToOllama(message, history, config, userId) {
        try {
            if (!config.endpoint) {
                // Return demo response when no endpoint is configured
                return this.getDemoResponse(message);
            }
            // Get user profile information for context
            let userProfileContext = '';
            if (userId) {
                try {
                    userProfileContext = await userProfileService_1.userProfileService.getUserProfileForLLM(userId);
                }
                catch (error) {
                    console.warn('Could not get user profile for LLM context:', error);
                }
            }
            // Build system message with user profile context
            let systemMessage = 'You are a helpful AI assistant.';
            if (userProfileContext) {
                systemMessage += ` ${userProfileContext}. Please consider this information when providing health, fitness, or lifestyle recommendations.`;
            }
            // Convert chat history to Ollama format - include full session history
            const messages = [
                { role: 'system', content: systemMessage },
                ...history.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                })),
                { role: 'user', content: message },
            ];
            const response = await axios_1.default.post(`${config.endpoint}/api/chat`, {
                model: config.model,
                messages,
                stream: false,
                options: {
                    temperature: parseFloat(config.temperature),
                    num_predict: parseInt(config.max_tokens),
                },
            });
            return response.data.message?.content || 'No response generated';
        }
        catch (error) {
            console.error('Ollama API error:', error);
            throw new Error(`Ollama API error: ${error.message}`);
        }
    }
    // Streaming version for Ollama
    static async sendToOllamaStream(message, history, config, userId, res) {
        try {
            if (!config.endpoint) {
                // Return demo response when no endpoint is configured
                const demoResponse = this.getDemoResponse(message);
                // Simulate streaming for demo
                const words = demoResponse.split(' ');
                for (let i = 0; i < words.length; i++) {
                    const chunk = (i === 0 ? words[i] : ' ' + words[i]);
                    res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
                return demoResponse;
            }
            // Get user profile information for context
            let userProfileContext = '';
            if (userId) {
                try {
                    userProfileContext = await userProfileService_1.userProfileService.getUserProfileForLLM(userId);
                }
                catch (error) {
                    console.warn('Could not get user profile for LLM context:', error);
                }
            }
            // Build system message with user profile context
            let systemMessage = 'You are a helpful AI assistant.';
            if (userProfileContext) {
                systemMessage += ` ${userProfileContext}. Please consider this information when providing health, fitness, or lifestyle recommendations.`;
            }
            // Convert chat history to Ollama format
            const messages = [
                { role: 'system', content: systemMessage },
                ...history.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                })),
                { role: 'user', content: message },
            ];
            const response = await axios_1.default.post(`${config.endpoint}/api/chat`, {
                model: config.model,
                messages,
                stream: true,
                options: {
                    temperature: parseFloat(config.temperature),
                    num_predict: parseInt(config.max_tokens),
                },
            }, {
                responseType: 'stream'
            });
            let fullResponse = '';
            return new Promise((resolve, reject) => {
                response.data.on('data', (chunk) => {
                    const lines = chunk.toString().split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.message?.content) {
                                const content = data.message.content;
                                fullResponse += content;
                                res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
                            }
                            if (data.done) {
                                res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
                                resolve(fullResponse);
                            }
                        }
                        catch (parseError) {
                            // Ignore malformed JSON lines
                        }
                    }
                });
                response.data.on('error', (error) => {
                    console.error('Ollama streaming error:', error);
                    res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
                    reject(new Error(`Ollama API error: ${error.message}`));
                });
                response.data.on('end', () => {
                    if (fullResponse) {
                        resolve(fullResponse);
                    }
                    else {
                        resolve('No response generated');
                    }
                });
            });
        }
        catch (error) {
            console.error('Ollama streaming API error:', error);
            res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
            throw new Error(`Ollama API error: ${error.message}`);
        }
    }
    static getDemoResponse(message) {
        const responses = [
            "Hello! I'm a demo AI assistant. This is a test response since no API key is configured. Your message was: \"" + message + "\"",
            "Thank you for your message! I'm running in demo mode. In a production environment, I would be connected to a real LLM service like OpenAI or Ollama.",
            "I understand you said: \"" + message + "\". This is a sample response from the demo AI assistant. Please configure an API key for full functionality.",
            "Hi there! I'm currently in demo mode. Your question \"" + message + "\" would normally be processed by a configured LLM service.",
            "This is a demonstration response. To enable full AI capabilities, please configure an OpenAI API key or Ollama endpoint in the admin settings."
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=chatService.js.map