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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error) {
      // Extract error message from API response
      const customError = new Error(error.response.data.error);
      customError.name = 'APIError';
      throw customError;
    }
    throw error;
  }
);

export const authAPI = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/login', { email, password });
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

  setUserPassword: async (id: string, password: string): Promise<{ message: string }> => {
    const response = await api.put(`/auth/users/${id}/password`, { password });
    return response.data;
  },

  getUsersWithUsage: async (): Promise<Array<User & {
    tokenUsage: {
      totalTokens: number;
      inputTokens: number;
      outputTokens: number;
      totalSessions: number;
      lastUsage: Date | null;
    }
  }>> => {
    const response = await api.get('/auth/users-with-usage');
    return response.data.users;
  },

  getUserTokenUsage: async (id: string): Promise<{
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    totalSessions: number;
    lastUsage: Date | null;
  }> => {
    const response = await api.get(`/auth/users/${id}/token-usage`);
    return response.data.tokenUsage;
  },
};

export const chatAPI = {
  sendMessage: async (message: string, userId: string, sessionId?: string): Promise<{ response: string; sessionId?: string; messageId: string }> => {
    const response = await api.post('/chat/message', { message, sessionId });
    return response.data;
  },

  sendMessageStream: async (
    message: string, 
    userId: string, 
    sessionId: string | undefined,
    onChunk: (chunk: string) => void,
    onComplete: (data: { sessionId?: string; messageId: string }) => void,
    onError: (error: string) => void
  ): Promise<void> => {
    try {
      const token = localStorage.getItem('auth-storage') 
        ? JSON.parse(localStorage.getItem('auth-storage')!).state.token
        : null;

      const response = await fetch(`${API_BASE_URL}/chat/message/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ message, sessionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let sessionInfo: { sessionId?: string } = {};
      let completionReceived = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'session') {
                  console.log('Session data received:', data);
                  sessionInfo.sessionId = data.sessionId;
                } else if (data.type === 'complete') {
                  console.log('Complete data received:', data);
                  completionReceived = true;
                  onComplete({ 
                    sessionId: sessionInfo.sessionId, 
                    messageId: data.messageId 
                  });
                  break; // Exit after completion
                } else if (data.content && !data.done) {
                  onChunk(data.content);
                } else if (data.error) {
                  console.error('Stream error:', data);
                  onError(data.error);
                  break;
                } else if (data.done) {
                  console.log('Stream done - content finished, waiting for completion data');
                  // Don't break here - wait for completion message with messageId
                } else {
                  console.log('Unknown data received:', data);
                }
              } catch (parseError) {
                // Ignore malformed JSON
              }
            }
          }
        }
        
        // If we exit the loop without receiving completion data, there might be an issue
        if (!completionReceived) {
          console.warn('Stream ended without completion data - this might indicate an issue');
          // We could call onError here or handle this case differently
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
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
    // Convert snake_case to camelCase for frontend
    return response.data.configs.map((config: any) => ({
      id: config.id,
      name: config.name,
      type: config.type,
      apiKey: config.api_key,
      endpoint: config.endpoint,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.max_tokens,
      systemPrompt: config.system_prompt,
      repetitionPenalty: config.repetition_penalty,
      isEnabled: config.is_enabled,
      isDefault: config.is_default,
    }));
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
      system_prompt: configData.systemPrompt,
      repetition_penalty: configData.repetitionPenalty,
      is_enabled: configData.isEnabled,
      is_default: configData.isDefault,
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
    if (updates.systemPrompt !== undefined) backendUpdates.system_prompt = updates.systemPrompt;
    if (updates.repetitionPenalty !== undefined) backendUpdates.repetition_penalty = updates.repetitionPenalty;
    if (updates.isEnabled !== undefined) backendUpdates.is_enabled = updates.isEnabled;
    if (updates.isDefault !== undefined) backendUpdates.is_default = updates.isDefault;
    
    const response = await api.put(`/config/${id}`, backendUpdates);
    return response.data.config;
  },

  deleteConfig: async (id: string): Promise<void> => {
    await api.delete(`/config/${id}`);
  },

  setDefault: async (id: string): Promise<LLMConfig> => {
    const response = await api.put(`/config/${id}/set-default`);
    return response.data.config;
  },

  getEnabledConfigs: async (): Promise<LLMConfig[]> => {
    const response = await api.get('/config/enabled');
    return response.data.configs.map((config: any) => ({
      id: config.id,
      name: config.name,
      type: config.type,
      apiKey: config.api_key,
      endpoint: config.endpoint,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.max_tokens,
      systemPrompt: config.system_prompt,
      repetitionPenalty: config.repetition_penalty,
      isEnabled: config.is_enabled,
      isDefault: config.is_default,
    }));
  },

  fetchModels: async (apiKey: string, endpoint?: string): Promise<any[]> => {
    const requestBody: any = {};
    
    if (apiKey) {
      requestBody.api_key = apiKey;
    }
    
    if (endpoint) {
      requestBody.endpoint = endpoint;
    } else if (apiKey) {
      // Only default to OpenAI endpoint if we have an API key
      requestBody.endpoint = 'https://api.openai.com/v1';
    }
    
    const response = await api.post('/config/fetch-models', requestBody);
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

  getChatHistory: async (limit: number = 50, offset: number = 0, filters?: {
    username?: string;
    role?: string;
    rating?: string;
    dateFrom?: string;
    dateTo?: string;
    messageContent?: string;
  }) => {
    let url = `/metrics/chat-history?limit=${limit}&offset=${offset}`;
    
    if (filters) {
      if (filters.username) url += `&username=${encodeURIComponent(filters.username)}`;
      if (filters.role) url += `&role=${filters.role}`;
      if (filters.rating) url += `&rating=${filters.rating}`;
      if (filters.dateFrom) url += `&dateFrom=${filters.dateFrom}`;
      if (filters.dateTo) url += `&dateTo=${filters.dateTo}`;
      if (filters.messageContent) url += `&messageContent=${encodeURIComponent(filters.messageContent)}`;
    }

    const response = await api.get(url);
    return response.data;
  },

  getChatSessions: async (limit: number = 20, offset: number = 0, filters?: {
    username?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    let url = `/metrics/chat-sessions?limit=${limit}&offset=${offset}&_t=${Date.now()}`;
    
    if (filters) {
      if (filters.username) url += `&username=${encodeURIComponent(filters.username)}`;
      if (filters.dateFrom) url += `&dateFrom=${filters.dateFrom}`;
      if (filters.dateTo) url += `&dateTo=${filters.dateTo}`;
    }

    const response = await api.get(url);
    return response.data;
  },

  getSessionMessages: async (sessionId: string) => {
    const response = await api.get(`/metrics/sessions/${sessionId}/messages`);
    return response.data.messages;
  },

  getUsers: async () => {
    const response = await api.get('/metrics/users');
    return response.data.users;
  },

  exportChatSessions: async (format: string, filters?: {
    username?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    let url = `/metrics/export/sessions?format=${format}`;
    
    if (filters) {
      if (filters.username) url += `&username=${encodeURIComponent(filters.username)}`;
      if (filters.dateFrom) url += `&dateFrom=${filters.dateFrom}`;
      if (filters.dateTo) url += `&dateTo=${filters.dateTo}`;
    }

    const response = await api.get(url, {
      responseType: 'blob',
    });
    
    return response;
  },

  exportChatMessages: async (format: string, filters?: {
    username?: string;
    role?: string;
    rating?: string;
    dateFrom?: string;
    dateTo?: string;
    messageContent?: string;
  }) => {
    let url = `/metrics/export/messages?format=${format}`;
    
    if (filters) {
      if (filters.username) url += `&username=${encodeURIComponent(filters.username)}`;
      if (filters.role) url += `&role=${filters.role}`;
      if (filters.rating) url += `&rating=${filters.rating}`;
      if (filters.dateFrom) url += `&dateFrom=${filters.dateFrom}`;
      if (filters.dateTo) url += `&dateTo=${filters.dateTo}`;
      if (filters.messageContent) url += `&messageContent=${encodeURIComponent(filters.messageContent)}`;
    }

    const response = await api.get(url, {
      responseType: 'blob',
    });
    
    return response;
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

export const systemSettingsAPI = {
  getAllSettings: async () => {
    const response = await api.get('/system-settings');
    return response.data.settings;
  },

  getSetting: async (key: string) => {
    const response = await api.get(`/system-settings/${key}`);
    return response.data.setting;
  },

  updateSetting: async (key: string, value: any, type?: string) => {
    const response = await api.put(`/system-settings/${key}`, { value, type });
    return response.data.setting;
  },

  updateMultipleSettings: async (settings: Array<{key: string, value: any}>) => {
    const response = await api.put('/system-settings', { settings });
    return response.data.settings;
  },

  createSetting: async (key: string, value: any, type: string, description?: string) => {
    const response = await api.post('/system-settings', { key, value, type, description });
    return response.data.setting;
  },

  deleteSetting: async (key: string) => {
    await api.delete(`/system-settings/${key}`);
  },

  getSystemLanguage: async () => {
    const response = await api.get('/system-settings/public/language');
    return response.data;
  },

  setSystemLanguage: async (language: string) => {
    const response = await api.put('/system-settings/language/set', { language });
    return response.data;
  },
};

export const userProfileAPI = {
  getUserProfile: async () => {
    const response = await api.get('/user-profile');
    return response.data;
  },

  updateUserProfile: async (profileData: {
    height: number;
    weight: number;
    body_fat?: number;
    lifestyle_habits: string;
    include_body_in_prompts?: boolean;
  }) => {
    const response = await api.put('/user-profile', profileData);
    return response.data;
  },

  checkProfileCompletion: async () => {
    const response = await api.get('/user-profile/completion-status');
    return response.data;
  },

  isBodyInfoRequired: async (): Promise<{ required: boolean }> => {
    const response = await api.get('/user-profile/body-info-required');
    return response.data;
  },
  getLLMPreference: async (): Promise<{ preferred_llm_id: string | null }> => {
    const response = await api.get('/user-profile/llm-preference');
    return response.data;
  },
  updateLLMPreference: async (llmId: string | null): Promise<{ success: boolean; message: string }> => {
    const response = await api.put('/user-profile/llm-preference', { llm_id: llmId });
    return response.data;
  },
};

export default api;