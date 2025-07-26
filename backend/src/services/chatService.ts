import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import axios from 'axios';
import pool from '../config/database';
import { ChatMessage, ChatSession, LLMConfig } from '../types';

export class ChatService {
  static async createChatSession(userId: string): Promise<ChatSession> {
    try {
      const sessionId = uuidv4();
      const result = await pool.query(
        'INSERT INTO chat_sessions (id, user_id) VALUES ($1, $2) RETURNING *',
        [sessionId, userId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Create chat session error:', error);
      throw new Error('Failed to create chat session');
    }
  }

  static async getChatSessions(userId: string): Promise<ChatSession[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Get chat sessions error:', error);
      throw new Error('Failed to fetch chat sessions');
    }
  }

  static async getChatMessages(sessionId: string, userId: string): Promise<ChatMessage[]> {
    try {
      // Verify session belongs to user
      const sessionResult = await pool.query(
        'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('Chat session not found');
      }

      const result = await pool.query(
        'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );
      return result.rows;
    } catch (error) {
      console.error('Get chat messages error:', error);
      throw new Error('Failed to fetch chat messages');
    }
  }

  static async saveMessage(sessionId: string, userId: string, role: 'user' | 'assistant', content: string): Promise<ChatMessage> {
    try {
      const messageId = uuidv4();
      const result = await pool.query(
        'INSERT INTO chat_messages (id, session_id, user_id, role, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [messageId, sessionId, userId, role, content]
      );

      // Update session timestamp
      await pool.query(
        'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Save message error:', error);
      throw new Error('Failed to save message');
    }
  }

  static async getActiveConfig(): Promise<LLMConfig | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM llm_configs WHERE is_active = true LIMIT 1'
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Get active config error:', error);
      throw new Error('Failed to get active configuration');
    }
  }

  static async sendMessageToLLM(message: string, sessionId: string, userId: string): Promise<string> {
    try {
      const config = await this.getActiveConfig();
      
      if (!config) {
        throw new Error('No active LLM configuration found');
      }

      // Get conversation history
      const messages = await this.getChatMessages(sessionId, userId);
      
      let response: string;

      if (config.type === 'openai') {
        response = await this.sendToOpenAI(message, messages, config);
      } else if (config.type === 'ollama') {
        response = await this.sendToOllama(message, messages, config);
      } else {
        throw new Error('Unsupported LLM type');
      }

      return response;
    } catch (error) {
      console.error('Send message to LLM error:', error);
      throw error;
    }
  }

  private static async sendToOpenAI(message: string, history: ChatMessage[], config: LLMConfig): Promise<string> {
    try {
      if (!config.api_key || config.api_key === null) {
        // Return demo response when no API key is configured
        console.log('No API key configured, returning demo response');
        return this.getDemoResponse(message);
      }

      console.log('Using OpenAI API with key:', config.api_key ? 'configured' : 'not configured');
      
      const openai = new OpenAI({
        apiKey: config.api_key,
        baseURL: config.endpoint || 'https://api.openai.com/v1',
      });

      // Convert chat history to OpenAI format - include full session history
      const messages = [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        ...history.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: message },
      ];

      const completion = await openai.chat.completions.create({
        model: config.model,
        messages: messages as any,
        temperature: parseFloat(config.temperature as any),
        max_tokens: parseInt(config.max_tokens as any),
      });

      return completion.choices[0]?.message?.content || 'No response generated';
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  private static async sendToOllama(message: string, history: ChatMessage[], config: LLMConfig): Promise<string> {
    try {
      if (!config.endpoint) {
        // Return demo response when no endpoint is configured
        return this.getDemoResponse(message);
      }

      // Convert chat history to Ollama format - include full session history
      const messages = [
        ...history.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: message },
      ];

      const response = await axios.post(`${config.endpoint}/api/chat`, {
        model: config.model,
        messages,
        stream: false,
        options: {
          temperature: parseFloat(config.temperature as any),
          num_predict: parseInt(config.max_tokens as any),
        },
      });

      return response.data.message?.content || 'No response generated';
    } catch (error: any) {
      console.error('Ollama API error:', error);
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  private static getDemoResponse(message: string): string {
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