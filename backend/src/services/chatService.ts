import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import axios from 'axios';
import pool from '../config/database';
import { ChatMessage, ChatSession, LLMConfig } from '../types';
import { userProfileService } from './userProfileService';
import { ConfigService } from './configService';
import { Response } from 'express';

export class ChatService {
  static async createChatSession(userId: string): Promise<ChatSession> {
    try {
      // First verify that the user exists
      const userCheck = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );
      
      if (userCheck.rows.length === 0) {
        throw new Error(`User with ID ${userId} does not exist`);
      }

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

  static async saveMessage(
    sessionId: string, 
    userId: string, 
    role: 'user' | 'assistant', 
    content: string,
    inputTokens: number = 0,
    outputTokens: number = 0,
    modelInfo?: { id: string; name: string; type: string },
    images?: string[]
  ): Promise<ChatMessage> {
    try {
      const messageId = uuidv4();
      
      let query: string;
      let values: any[];
      
      if (modelInfo && role === 'assistant') {
        // Include model information for assistant messages
        query = 'INSERT INTO chat_messages (id, session_id, user_id, role, content, images, input_tokens, output_tokens, model_id, model_name, model_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *';
        values = [messageId, sessionId, userId, role, content, images || null, inputTokens, outputTokens, modelInfo.id, modelInfo.name, modelInfo.type];
      } else {
        // Regular message without model info (for user messages)
        query = 'INSERT INTO chat_messages (id, session_id, user_id, role, content, images, input_tokens, output_tokens) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *';
        values = [messageId, sessionId, userId, role, content, images || null, inputTokens, outputTokens];
      }
      
      const result = await pool.query(query, values);

      // Update session timestamp and model info if it's an assistant message
      if (modelInfo && role === 'assistant') {
        await pool.query(
          'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP, model_id = $2 WHERE id = $1',
          [sessionId, modelInfo.id]
        );
      } else {
        await pool.query(
          'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [sessionId]
        );
      }

      return result.rows[0];
    } catch (error) {
      console.error('Save message error:', error);
      throw new Error('Failed to save message');
    }
  }

  static async getUserLLMConfig(userId: string): Promise<LLMConfig | null> {
    try {
      return await ConfigService.getUserLLMConfig(userId);
    } catch (error) {
      console.error('Get user LLM config error:', error);
      throw new Error('Failed to get user LLM configuration');
    }
  }

  static async sendMessageToLLM(message: string, sessionId: string, userId: string): Promise<{response: string, tokenUsage?: {inputTokens: number, outputTokens: number, totalTokens: number}, modelInfo: {id: string, name: string, type: string}}> {
    try {
      const config = await this.getUserLLMConfig(userId);
      
      if (!config) {
        throw new Error('No LLM configuration found for user');
      }

      // Get conversation history
      const messages = await this.getChatMessages(sessionId, userId);
      
      let result: {response: string, tokenUsage?: {inputTokens: number, outputTokens: number, totalTokens: number}};

      if (config.type === 'openai') {
        result = await this.sendToOpenAI(message, messages, config, userId);
      } else if (config.type === 'ollama') {
        result = await this.sendToOllama(message, messages, config, userId);
      } else if (config.type === 'azure') {
        result = await this.sendToAzure(message, messages, config, userId);
      } else {
        throw new Error('Unsupported LLM type');
      }

      return {
        ...result,
        modelInfo: {
          id: config.id,
          name: config.name,
          type: config.type
        }
      };
    } catch (error) {
      console.error('Send message to LLM error:', error);
      throw error;
    }
  }

  // New streaming method
  static async sendMessageToLLMStream(
    message: string, 
    sessionId: string, 
    userId: string, 
    res: Response
  ): Promise<{response: string, modelInfo: {id: string, name: string, type: string}}> {
    try {
      const config = await this.getUserLLMConfig(userId);
      
      if (!config) {
        throw new Error('No LLM configuration found for user');
      }

      // Get conversation history
      const messages = await this.getChatMessages(sessionId, userId);
      
      let fullResponse = '';

      if (config.type === 'openai') {
        fullResponse = await this.sendToOpenAIStream(message, messages, config, userId, res);
      } else if (config.type === 'ollama') {
        fullResponse = await this.sendToOllamaStream(message, messages, config, userId, res);
      } else if (config.type === 'azure') {
        fullResponse = await this.sendToAzureStream(message, messages, config, userId, res);
      } else {
        throw new Error('Unsupported LLM type');
      }

      return {
        response: fullResponse,
        modelInfo: {
          id: config.id,
          name: config.name,
          type: config.type
        }
      };
    } catch (error) {
      console.error('Send message to LLM stream error:', error);
      throw error;
    }
  }

  private static async sendToOpenAI(message: string, history: ChatMessage[], config: LLMConfig, userId?: string): Promise<{response: string, tokenUsage?: {inputTokens: number, outputTokens: number, totalTokens: number}}> {
    try {
      if (!config.api_key || config.api_key === null) {
        // Return demo response when no API key is configured
        console.log('No API key configured, returning demo response');
        return this.getDemoResponse(message);
      }

      console.log('Using OpenAI API with key:', config.api_key ? 'configured' : 'not configured');
      
      const baseURL = 'https://api.openai.com/v1';
      const openai = new OpenAI({
        apiKey: config.api_key,
        baseURL: baseURL.replace(/\/$/, ''), // Remove trailing slash for OpenAI client
      });

      // Get user profile information for context
      let userProfileContext = '';
      if (userId) {
        try {
          userProfileContext = await userProfileService.getUserProfileForLLM(userId);
        } catch (error) {
          console.warn('Could not get user profile for LLM context:', error);
        }
      }

      // Build system message with user profile context
      let systemMessage = config.system_prompt || 'You are a helpful AI assistant.';
      if (userProfileContext) {
        systemMessage += ` ${userProfileContext}. Please consider this information when providing health, fitness, or lifestyle recommendations.`;
      }

      // Convert chat history to OpenAI format - include full session history
      const messages: any[] = [
        { role: 'system', content: systemMessage },
      ];

      for (const msg of history) {
        if (msg.role === 'user' && config.supports_vision && Array.isArray(msg.images) && msg.images.length > 0) {
          const parts: any[] = [];
          if (msg.content && msg.content.trim().length > 0) {
            parts.push({ type: 'text', text: msg.content });
          }
          
          // Convert MinIO URLs to base64 data URLs for OpenAI
          const { storageService } = await import('../services/storageService');
          for (const url of msg.images) {
            let imageUrl = url;
            // If it's a MinIO URL, convert to base64
            if (url.includes('/chat-uploads/')) {
              const key = storageService.extractKeyFromUrl(url);
              if (key) {
                try {
                  imageUrl = await storageService.getImageAsBase64(key);
                } catch (error) {
                  console.warn('Failed to convert MinIO URL to base64, using original URL:', error);
                }
              }
            }
            parts.push({ type: 'image_url', image_url: { url: imageUrl } });
          }
          messages.push({ role: 'user', content: parts });
        } else {
          messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
        }
      }

      const payload: any = {
        model: config.model,
        messages: messages as any,
      };
      if (config.temperature !== undefined && config.temperature !== null && config.temperature !== ('' as any)) {
        payload.temperature = parseFloat(config.temperature as any);
      }
      if (config.max_tokens !== undefined && config.max_tokens !== null && config.max_tokens !== ('' as any)) {
        // @ts-ignore OpenAI Responses-style parameter for compatibility
        payload.max_completion_tokens = parseInt(config.max_tokens as any);
      }
      const completion = await openai.chat.completions.create(payload);

      const response = completion.choices[0]?.message?.content || 'No response generated';
      
      // Return response with token usage information
      const result = {
        response,
        tokenUsage: completion.usage ? {
          inputTokens: completion.usage.prompt_tokens || 0,
          outputTokens: completion.usage.completion_tokens || 0,
          totalTokens: completion.usage.total_tokens || 0
        } : undefined
      };

      return result;
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  // Streaming version for OpenAI
  private static async sendToOpenAIStream(
    message: string, 
    history: ChatMessage[], 
    config: LLMConfig, 
    userId: string | undefined, 
    res: Response
  ): Promise<string> {
    try {
      if (!config.api_key || config.api_key === null) {
        // Return demo response when no API key is configured
        console.log('No API key configured, returning demo response');
        const demoResult = this.getDemoResponse(message);
        
        // Simulate streaming for demo
        const words = demoResult.response.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? words[i] : ' ' + words[i]);
          res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to simulate streaming
        }
        res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
        
        return demoResult.response;
      }

      console.log('Using OpenAI API with streaming');
      
      const baseURL = 'https://api.openai.com/v1';
      const openai = new OpenAI({
        apiKey: config.api_key,
        baseURL: baseURL.replace(/\/$/, ''), // Remove trailing slash for OpenAI client
      });

      // Get user profile information for context
      let userProfileContext = '';
      if (userId) {
        try {
          userProfileContext = await userProfileService.getUserProfileForLLM(userId);
        } catch (error) {
          console.warn('Could not get user profile for LLM context:', error);
        }
      }

      // Build system message with user profile context
      let systemMessage = config.system_prompt || 'You are a helpful AI assistant.';
      if (userProfileContext) {
        systemMessage += ` ${userProfileContext}. Please consider this information when providing health, fitness, or lifestyle recommendations.`;
      }

      // Convert chat history to OpenAI format (vision-aware)
      const messages: any[] = [
        { role: 'system', content: systemMessage },
      ];

      for (const msg of history) {
        if (msg.role === 'user' && config.supports_vision && Array.isArray(msg.images) && msg.images.length > 0) {
          const parts: any[] = [];
          if (msg.content && msg.content.trim().length > 0) {
            parts.push({ type: 'text', text: msg.content });
          }
          
          // Convert MinIO URLs to base64 data URLs for OpenAI
          const { storageService } = await import('../services/storageService');
          for (const url of msg.images) {
            let imageUrl = url;
            // If it's a MinIO URL, convert to base64
            if (url.includes('/chat-uploads/')) {
              const key = storageService.extractKeyFromUrl(url);
              if (key) {
                try {
                  imageUrl = await storageService.getImageAsBase64(key);
                } catch (error) {
                  console.warn('Failed to convert MinIO URL to base64, using original URL:', error);
                }
              }
            }
            parts.push({ type: 'image_url', image_url: { url: imageUrl } });
          }
          messages.push({ role: 'user', content: parts });
        } else {
          messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
        }
      }

      const spayload: any = {
        model: config.model,
        messages: messages as any,
        stream: true,
      };
      if (config.temperature !== undefined && config.temperature !== null && config.temperature !== ('' as any)) {
        spayload.temperature = parseFloat(config.temperature as any);
      }
      if (config.max_tokens !== undefined && config.max_tokens !== null && config.max_tokens !== ('' as any)) {
        // @ts-ignore OpenAI Responses-style parameter for compatibility
        spayload.max_completion_tokens = parseInt(config.max_tokens as any);
      }
      const stream: any = await openai.chat.completions.create(spayload);

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
      
    } catch (error: any) {
      console.error('OpenAI streaming API error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  private static async sendToOllama(message: string, history: ChatMessage[], config: LLMConfig, userId?: string): Promise<{response: string, tokenUsage?: {inputTokens: number, outputTokens: number, totalTokens: number}}> {
    try {
      if (!config.endpoint) {
        // Return demo response when no endpoint is configured
        return this.getDemoResponse(message);
      }

      // Get user profile information for context
      let userProfileContext = '';
      if (userId) {
        try {
          userProfileContext = await userProfileService.getUserProfileForLLM(userId);
        } catch (error) {
          console.warn('Could not get user profile for LLM context:', error);
        }
      }

      // Build system message with user profile context
      let systemMessage = config.system_prompt || 'You are a helpful AI assistant.';
      if (userProfileContext) {
        systemMessage += ` ${userProfileContext}. Please consider this information when providing health, fitness, or lifestyle recommendations.`;
      }

      // Convert chat history to Ollama format - include full session history
      const messages = [
        { role: 'system', content: systemMessage },
      ];

      for (const msg of history) {
        if (msg.role === 'user' && config.supports_vision && Array.isArray(msg.images) && msg.images.length > 0) {
          // For Ollama vision models, include images as base64 strings
          const images: string[] = [];
          
          // Convert MinIO URLs to base64 strings for Ollama
          const { storageService } = await import('../services/storageService');
          for (const url of msg.images) {
            let imageBase64 = '';
            if (url.includes('/chat-uploads/')) {
              const key = storageService.extractKeyFromUrl(url);
              if (key) {
                try {
                  const base64DataUrl = await storageService.getImageAsBase64(key);
                  // Extract just the base64 part (remove data:image/...;base64, prefix)
                  imageBase64 = base64DataUrl.split(',')[1] || base64DataUrl;
                } catch (error) {
                  console.warn('Failed to convert MinIO URL to base64, skipping image:', error);
                }
              }
            } else if (url.startsWith('data:image/')) {
              // Already a base64 data URL, extract just the base64 part
              imageBase64 = url.split(',')[1] || url;
            } else {
              // Regular URL, try to fetch and convert to base64
              try {
                const axios = (await import('axios')).default;
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                imageBase64 = Buffer.from(response.data).toString('base64');
              } catch (error) {
                console.warn('Failed to fetch and convert image URL to base64, skipping:', error);
              }
            }
            
            if (imageBase64) {
              images.push(imageBase64);
            }
          }
          
          messages.push({
            role: msg.role,
            content: msg.content,
            images: images
          } as any);
        } else {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Add the current user message (this function doesn't receive images directly, they come from history)
      messages.push({ role: 'user', content: message });

      const url = this.buildOllamaUrl(config.endpoint);
      const ollamaBody: any = {
        model: config.model,
        messages,
        stream: false,
      };
      const options: any = {};
      if (config.temperature !== undefined && config.temperature !== null && config.temperature !== ('' as any)) {
        options.temperature = parseFloat(config.temperature as any);
      }
      if (config.max_tokens !== undefined && config.max_tokens !== null && config.max_tokens !== ('' as any)) {
        options.num_predict = parseInt(config.max_tokens as any);
      }
      if (Object.keys(options).length > 0) ollamaBody.options = options;
      const response = await axios.post(url, ollamaBody, {
        maxRedirects: 0, // Disable redirects to prevent method changing
        timeout: 30000   // 30 second timeout
      });

      const responseContent = response.data.message?.content || 'No response generated';
      
      // Return response with estimated token usage for Ollama
      return {
        response: responseContent,
        tokenUsage: {
          inputTokens: this.estimateTokens(message),
          outputTokens: this.estimateTokens(responseContent),
          totalTokens: this.estimateTokens(message + responseContent)
        }
      };
    } catch (error: any) {
      console.error('Ollama API error:', error);
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  // Streaming version for Ollama
  private static async sendToOllamaStream(
    message: string, 
    history: ChatMessage[], 
    config: LLMConfig, 
    userId: string | undefined, 
    res: Response
  ): Promise<string> {
    try {
      if (!config.endpoint) {
        // Return demo response when no endpoint is configured
        const demoResult = this.getDemoResponse(message);
        
        // Simulate streaming for demo
        const words = demoResult.response.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? words[i] : ' ' + words[i]);
          res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
        
        return demoResult.response;
      }

      // Get user profile information for context
      let userProfileContext = '';
      if (userId) {
        try {
          userProfileContext = await userProfileService.getUserProfileForLLM(userId);
        } catch (error) {
          console.warn('Could not get user profile for LLM context:', error);
        }
      }

      // Build system message with user profile context
      let systemMessage = config.system_prompt || 'You are a helpful AI assistant.';
      if (userProfileContext) {
        systemMessage += ` ${userProfileContext}. Please consider this information when providing health, fitness, or lifestyle recommendations.`;
      }

      // Convert chat history to Ollama format
      const messages = [
        { role: 'system', content: systemMessage },
      ];

      for (const msg of history) {
        if (msg.role === 'user' && config.supports_vision && Array.isArray(msg.images) && msg.images.length > 0) {
          // For Ollama vision models, include images as base64 strings
          const images: string[] = [];
          
          // Convert MinIO URLs to base64 strings for Ollama
          const { storageService } = await import('../services/storageService');
          for (const url of msg.images) {
            let imageBase64 = '';
            if (url.includes('/chat-uploads/')) {
              const key = storageService.extractKeyFromUrl(url);
              if (key) {
                try {
                  const base64DataUrl = await storageService.getImageAsBase64(key);
                  // Extract just the base64 part (remove data:image/...;base64, prefix)
                  imageBase64 = base64DataUrl.split(',')[1] || base64DataUrl;
                } catch (error) {
                  console.warn('Failed to convert MinIO URL to base64, skipping image:', error);
                }
              }
            } else if (url.startsWith('data:image/')) {
              // Already a base64 data URL, extract just the base64 part
              imageBase64 = url.split(',')[1] || url;
            } else {
              // Regular URL, try to fetch and convert to base64
              try {
                const axios = (await import('axios')).default;
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                imageBase64 = Buffer.from(response.data).toString('base64');
              } catch (error) {
                console.warn('Failed to fetch and convert image URL to base64, skipping:', error);
              }
            }
            
            if (imageBase64) {
              images.push(imageBase64);
            }
          }
          
          messages.push({
            role: msg.role,
            content: msg.content,
            images: images
          } as any);
        } else {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Add the current user message (this function doesn't receive images directly, they come from history)
      messages.push({ role: 'user', content: message });

      const url = this.buildOllamaUrl(config.endpoint);
      console.log('Ollama streaming request URL:', url);
      
      const sollamaBody: any = {
        model: config.model,
        messages,
        stream: true,
      };
      const sOptions: any = {};
      if (config.temperature !== undefined && config.temperature !== null && config.temperature !== ('' as any)) {
        sOptions.temperature = parseFloat(config.temperature as any);
      }
      if (config.max_tokens !== undefined && config.max_tokens !== null && config.max_tokens !== ('' as any)) {
        sOptions.num_predict = parseInt(config.max_tokens as any);
      }
      if (Object.keys(sOptions).length > 0) sollamaBody.options = sOptions;
      const response = await axios.post(url, sollamaBody, {
        responseType: 'stream',
        maxRedirects: 0, // Disable redirects to prevent method changing
        timeout: 30000   // 30 second timeout
      });

      let fullResponse = '';

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
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
            } catch (parseError) {
              // Ignore malformed JSON lines
            }
          }
        });

        response.data.on('error', (error: any) => {
          console.error('Ollama streaming error:', error);
          res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
          reject(new Error(`Ollama API error: ${error.message}`));
        });

        response.data.on('end', () => {
          if (fullResponse) {
            resolve(fullResponse);
          } else {
            resolve('No response generated');
          }
        });
      });
      
    } catch (error: any) {
      console.error('Ollama streaming API error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  private static estimateTokens(text: string): number {
    // Simple approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  private static buildOpenAIUrl(endpoint: string): string {
    // For OpenAI and OpenAI-compatible APIs
    // Remove trailing slash and add the chat completions path
    const cleanEndpoint = endpoint.replace(/\/$/, '');
    return `${cleanEndpoint}/chat/completions`;
  }

  private static buildOllamaUrl(endpoint: string): string {
    // For Ollama APIs
    // Remove trailing slash and add the Ollama chat path
    const cleanEndpoint = endpoint.replace(/\/$/, '');
    return `${cleanEndpoint}/api/chat`;
  }

  private static getDemoResponse(message: string): {response: string, tokenUsage: {inputTokens: number, outputTokens: number, totalTokens: number}} {
    const responses = [
      "Hello! I'm a demo AI assistant. This is a test response since no API key is configured. Your message was: \"" + message + "\"",
      "Thank you for your message! I'm running in demo mode. In a production environment, I would be connected to a real LLM service like OpenAI or Ollama.",
      "I understand you said: \"" + message + "\". This is a sample response from the demo AI assistant. Please configure an API key for full functionality.",
      "Hi there! I'm currently in demo mode. Your question \"" + message + "\" would normally be processed by a configured LLM service.",
      "This is a demonstration response. To enable full AI capabilities, please configure an OpenAI API key or Ollama endpoint in the admin settings."
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // Return response with estimated token usage for demo
    return {
      response,
      tokenUsage: {
        inputTokens: this.estimateTokens(message),
        outputTokens: this.estimateTokens(response),
        totalTokens: this.estimateTokens(message + response)
      }
    };
  }

  private static async sendToAzure(message: string, history: ChatMessage[], config: LLMConfig, userId?: string): Promise<{response: string, tokenUsage?: {inputTokens: number, outputTokens: number, totalTokens: number}}> {
    try {
      if (!config.endpoint) throw new Error('Azure base URL not configured');
      const apiVersion = (config as any).api_version;
      if (!apiVersion) throw new Error('Azure API version not configured');
      if (!config.api_key) throw new Error('Azure token not configured');

      // Get user profile information for context
      let userProfileContext = '';
      if (userId) {
        try {
          userProfileContext = await userProfileService.getUserProfileForLLM(userId);
        } catch (error) {
          console.warn('Could not get user profile for LLM context:', error);
        }
      }

      // Build system message with user profile context
      let systemMessage = config.system_prompt || 'You are a helpful AI assistant.';
      if (userProfileContext) {
        systemMessage += ` ${userProfileContext}. Please consider this information when providing health, fitness, or lifestyle recommendations.`;
      }

      // Convert chat history to Azure-compatible format (supports vision)
      const messages: any[] = [
        { role: 'system', content: systemMessage },
      ];
      for (const msg of history) {
        if (msg.role === 'user' && config.supports_vision && Array.isArray(msg.images) && msg.images.length > 0) {
          const parts: any[] = [];
          if (msg.content && msg.content.trim().length > 0) {
            parts.push({ type: 'text', text: msg.content });
          }
          const { storageService } = await import('../services/storageService');
          for (const url of msg.images) {
            let imageUrl = url;
            if (url.includes('/chat-uploads/')) {
              const key = storageService.extractKeyFromUrl(url);
              if (key) {
                try {
                  imageUrl = await storageService.getImageAsBase64(key);
                } catch (error) {
                  console.warn('Failed to convert MinIO URL to base64, using original URL:', error);
                }
              }
            }
            parts.push({ type: 'image_url', image_url: { url: imageUrl, detail: 'high' } });
          }
          messages.push({ role: 'user', content: parts });
        } else {
          messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
        }
      }

      const cleanBase = config.endpoint.replace(/\/$/, '');
      const deployment = (config as any).deployment || config.model;
      const url = `${cleanBase}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

      const body: any = { messages };
      if (config.max_tokens !== undefined && config.max_tokens !== null && config.max_tokens !== ('' as any)) {
        body.max_tokens = parseInt((config.max_tokens as any));
      }
      if (config.temperature !== undefined && config.temperature !== null && config.temperature !== ('' as any)) {
        body.temperature = parseFloat((config.temperature as any));
      }
      body.top_p = 1;
      if (config.model) body.model = config.model;

      const response = await axios.post(url, body, {
        headers: (() => {
          const apiKey = config.api_key as string;
          const isBearer = apiKey && apiKey.includes('.') && apiKey.split('.').length >= 3;
          return isBearer
            ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }
            : { 'Content-Type': 'application/json', 'api-key': apiKey };
        })(),
        timeout: 30000,
      });

      const content = response.data?.choices?.[0]?.message?.content || 'No response generated';
      return { response: content };
    } catch (error: any) {
      console.error('Azure API error:', error);
      if (error.response?.status === 404) {
        throw new Error('Azure deployment not found. Ensure the Deployment field is set to your Azure deployment name.');
      }
      throw new Error(`Azure API error: ${error.message}`);
    }
  }

  private static async sendToAzureStream(
    message: string,
    history: ChatMessage[],
    config: LLMConfig,
    userId: string | undefined,
    res: Response
  ): Promise<string> {
    try {
      if (!config.endpoint) throw new Error('Azure base URL not configured');
      const apiVersion = (config as any).api_version;
      if (!apiVersion) throw new Error('Azure API version not configured');
      if (!config.api_key) throw new Error('Azure token not configured');

      // Get user profile information for context
      let userProfileContext = '';
      if (userId) {
        try {
          userProfileContext = await userProfileService.getUserProfileForLLM(userId);
        } catch (error) {
          console.warn('Could not get user profile for LLM context:', error);
        }
      }

      // Build system message with user profile context
      let systemMessage = config.system_prompt || 'You are a helpful AI assistant.';
      if (userProfileContext) {
        systemMessage += ` ${userProfileContext}. Please consider this information when providing health, fitness, or lifestyle recommendations.`;
      }

      const messages: any[] = [
        { role: 'system', content: systemMessage },
      ];
      for (const msg of history) {
        if (msg.role === 'user' && config.supports_vision && Array.isArray(msg.images) && msg.images.length > 0) {
          const parts: any[] = [];
          if (msg.content && msg.content.trim().length > 0) {
            parts.push({ type: 'text', text: msg.content });
          }
          const { storageService } = await import('../services/storageService');
          for (const url of msg.images) {
            let imageUrl = url;
            if (url.includes('/chat-uploads/')) {
              const key = storageService.extractKeyFromUrl(url);
              if (key) {
                try {
                  imageUrl = await storageService.getImageAsBase64(key);
                } catch (error) {
                  console.warn('Failed to convert MinIO URL to base64, using original URL:', error);
                }
              }
            }
            parts.push({ type: 'image_url', image_url: { url: imageUrl, detail: 'high' } });
          }
          messages.push({ role: 'user', content: parts });
        } else {
          messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
        }
      }

      const cleanBase = config.endpoint.replace(/\/$/, '');
      const deployment = (config as any).deployment || config.model;
      const url = `${cleanBase}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

      // Try streaming first
      try {
        const body: any = { messages, stream: true, top_p: 1 };
        if (config.temperature !== undefined && config.temperature !== null && config.temperature !== ('' as any)) {
          body.temperature = parseFloat((config.temperature as any));
        }
        if (config.max_tokens !== undefined && config.max_tokens !== null && config.max_tokens !== ('' as any)) {
          body.max_tokens = parseInt((config.max_tokens as any));
        }
        if (config.model) body.model = config.model;

        const response = await axios.post(url, body, {
          responseType: 'stream',
          headers: (() => {
            const apiKey = config.api_key as string;
            const isBearer = apiKey && apiKey.includes('.') && apiKey.split('.').length >= 3;
            return isBearer
              ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }
              : { 'Content-Type': 'application/json', 'api-key': apiKey };
          })(),
          timeout: 30000,
        });

        let fullResponse = '';

        return await new Promise((resolve, reject) => {
          response.data.on('data', (chunk: Buffer) => {
            const lines = chunk.toString().split('\n').filter((l: string) => l.trim().length > 0);
            for (const line of lines) {
              const trimmed = line.startsWith('data:') ? line.slice(5).trim() : line.trim();
              if (trimmed === '[DONE]') {
                res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
                resolve(fullResponse);
                return;
              }
              try {
                const obj = JSON.parse(trimmed);
                const delta = obj?.choices?.[0]?.delta?.content || obj?.choices?.[0]?.message?.content || obj?.content;
                if (delta) {
                  fullResponse += delta;
                  res.write(`data: ${JSON.stringify({ content: delta, done: false })}\n\n`);
                }
              } catch (_) {
                // Non-JSON line, ignore
              }
            }
          });

          response.data.on('error', (err: any) => {
            reject(err);
          });

          response.data.on('end', () => {
            if (!fullResponse) {
              resolve('');
            } else {
              resolve(fullResponse);
            }
          });
        });
      } catch (streamErr) {
        console.warn('Azure streaming failed, falling back to non-streaming:', streamErr);
        // Fallback to non-streaming
        const result = await this.sendToAzure(message, history, config, userId);
        res.write(`data: ${JSON.stringify({ content: result.response, done: false })}\n\n`);
        res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
        return result.response;
      }
    } catch (error: any) {
      console.error('Azure streaming error:', error);
      if (error.response?.status === 404) {
        throw new Error('Azure deployment not found. Ensure the Deployment field is set to your Azure deployment name.');
      }
      throw new Error(`Azure streaming error: ${error.message}`);
    }
  }
}
