import axios from 'axios';
import { User, LLMConfig } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage') 
    ? JSON.parse(localStorage.getItem('auth-storage')!).state.token
    : null;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

export const authAPI = {
  login: async (username: string, password: string): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    // No server-side logout needed for JWT
  },

  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/auth/users');
    return response.data.users;
  },

  createUser: async (userData: { username: string; email: string; password: string; role: 'admin' | 'user' }): Promise<User> => {
    const response = await api.post('/auth/users', userData);
    return response.data.user;
  },

  updateUser: async (id: string, updates: Partial<Pick<User, 'username' | 'email' | 'role'>>): Promise<User> => {
    const response = await api.put(`/auth/users/${id}`, updates);
    return response.data.user;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/auth/users/${id}`);
  },
};

export const chatAPI = {
  sendMessage: async (message: string, userId: string, sessionId?: string): Promise<{ response: string; sessionId?: string; messageId: string }> => {
    const response = await api.post('/chat/message', { message, sessionId });
    return response.data;
  },

  getChatSessions: async (): Promise<any[]> => {
    const response = await api.get('/chat/sessions');
    return response.data.sessions;
  },

  getChatMessages: async (sessionId: string): Promise<any[]> => {
    const response = await api.get(`/chat/sessions/${sessionId}/messages`);
    return response.data.messages;
  },
};

export const configAPI = {
  getConfigs: async (): Promise<LLMConfig[]> => {
    const response = await api.get('/config');
    return response.data.configs;
  },

  getActiveConfig: async (): Promise<LLMConfig | null> => {
    try {
      const response = await api.get('/config/active');
      return response.data.config;
    } catch (error) {
      return null;
    }
  },

  createConfig: async (configData: Omit<LLMConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<LLMConfig> => {
    // Convert camelCase to snake_case for backend
    const backendData = {
      name: configData.name,
      type: configData.type,
      api_key: configData.apiKey,
      endpoint: configData.endpoint,
      model: configData.model,
      temperature: configData.temperature,
      max_tokens: configData.maxTokens,
      is_active: configData.isActive,
    };
    const response = await api.post('/config', backendData);
    return response.data.config;
  },

  updateConfig: async (id: string, updates: Partial<Omit<LLMConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LLMConfig> => {
    // Convert camelCase to snake_case for backend
    const backendUpdates: any = {};
    if (updates.name !== undefined) backendUpdates.name = updates.name;
    if (updates.type !== undefined) backendUpdates.type = updates.type;
    if (updates.apiKey !== undefined && updates.apiKey !== '') backendUpdates.api_key = updates.apiKey;
    if (updates.endpoint !== undefined) backendUpdates.endpoint = updates.endpoint;
    if (updates.model !== undefined) backendUpdates.model = updates.model;
    if (updates.temperature !== undefined) backendUpdates.temperature = updates.temperature;
    if (updates.maxTokens !== undefined) backendUpdates.max_tokens = updates.maxTokens;
    if (updates.isActive !== undefined) backendUpdates.is_active = updates.isActive;
    
    const response = await api.put(`/config/${id}`, backendUpdates);
    return response.data.config;
  },

  deleteConfig: async (id: string): Promise<void> => {
    await api.delete(`/config/${id}`);
  },

  setActiveConfig: async (id: string): Promise<LLMConfig> => {
    const response = await api.put(`/config/${id}/activate`);
    return response.data.config;
  },

  fetchModels: async (apiKey: string, endpoint?: string): Promise<any[]> => {
    const response = await api.post('/config/fetch-models', {
      api_key: apiKey,
      endpoint: endpoint || 'https://api.openai.com/v1',
    });
    return response.data.models;
  },

  testConfig: async (config: {
    type: string;
    api_key?: string;
    endpoint?: string;
    model: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<{ success: boolean; response?: string; message?: string; error?: string }> => {
    const response = await api.post('/config/test-config', {
      type: config.type,
      api_key: config.api_key,
      endpoint: config.endpoint,
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
    });
    return response.data;
  },
};

export const metricsAPI = {
  getSystemMetrics: async () => {
    const response = await api.get('/metrics/system');
    return response.data.metrics;
  },

  getChatHistory: async (limit: number = 50, offset: number = 0) => {
    const response = await api.get(`/metrics/chat-history?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  getChatSessions: async (limit: number = 20, offset: number = 0) => {
    const response = await api.get(`/metrics/chat-sessions?limit=${limit}&offset=${offset}&_t=${Date.now()}`);
    return response.data;
  },

  getSessionMessages: async (sessionId: string) => {
    const response = await api.get(`/metrics/sessions/${sessionId}/messages`);
    return response.data.messages;
  },
};

export const messageRatingAPI = {
  rateMessage: async (messageId: string, rating: 'like' | 'dislike', reason?: string) => {
    const response = await api.post(`/message-rating/messages/${messageId}/rate`, { rating, reason });
    return response.data;
  },

  getMessageRating: async (messageId: string) => {
    const response = await api.get(`/message-rating/messages/${messageId}/rating`);
    return response.data.rating;
  },

  removeMessageRating: async (messageId: string) => {
    await api.delete(`/message-rating/messages/${messageId}/rating`);
  },

  getRatingStats: async () => {
    const response = await api.get('/message-rating/stats');
    return response.data.stats;
  },

  getDetailedRatingStats: async () => {
    const response = await api.get('/message-rating/detailed-stats');
    return response.data.ratings;
  },

  getSessionMessagesWithRatings: async (sessionId: string) => {
    const response = await api.get(`/message-rating/sessions/${sessionId}/messages`);
    return response.data.messages;
  },
};

export default api;