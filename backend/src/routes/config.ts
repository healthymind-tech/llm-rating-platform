import express from 'express';
import { ConfigService } from '../services/configService';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get all configurations (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const configs = await ConfigService.getAllConfigs();
    res.json({ configs });
  } catch (error: any) {
    console.error('Get configs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get enabled configurations (authenticated users)
router.get('/enabled', authenticateToken, async (req, res) => {
  try {
    const configs = await ConfigService.getEnabledConfigs();
    
    if (configs.length === 0) {
      return res.status(404).json({ error: 'No enabled configurations found' });
    }

    // Don't expose sensitive information to non-admin users
    const safeConfigs = configs.map(config => ({
      id: config.id,
      name: config.name,
      type: config.type,
      model: config.model,
      is_enabled: config.is_enabled,
      is_default: config.is_default,
    }));

    res.json({ configs: safeConfigs });
  } catch (error: any) {
    console.error('Get enabled configs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's LLM configuration (authenticated users)
router.get('/user-config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const config = await ConfigService.getUserLLMConfig(userId);
    
    if (!config) {
      return res.status(404).json({ error: 'No LLM configuration found for user' });
    }

    // Don't expose sensitive information
    const safeConfig = {
      id: config.id,
      name: config.name,
      type: config.type,
      model: config.model,
      is_enabled: config.is_enabled,
      is_default: config.is_default,
    };

    res.json({ config: safeConfig });
  } catch (error: any) {
    console.error('Get user config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific configuration (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const config = await ConfigService.getConfigById(id);
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({ config });
  } catch (error: any) {
    console.error('Get config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new configuration (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      type,
      api_key,
      endpoint,
      model,
      temperature,
      max_tokens,
      system_prompt,
      repetition_penalty,
      is_enabled,
      is_default,
    } = req.body;

    // Validation
    if (!name || !type || !model) {
      return res.status(400).json({ error: 'Name, type, and model are required' });
    }

    if (!['openai', 'ollama'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "openai" or "ollama"' });
    }

    // API key is now optional for local services
    // if (type === 'openai' && !api_key) {
    //   return res.status(400).json({ error: 'API key is required for OpenAI configurations' });
    // }

    if (type === 'openai' && !endpoint) {
      return res.status(400).json({ error: 'API endpoint is required for OpenAI configurations' });
    }

    if (type === 'ollama' && !endpoint) {
      return res.status(400).json({ error: 'Endpoint is required for Ollama configurations' });
    }

    if (temperature !== undefined) {
      const tempNum = parseFloat(temperature);
      if (isNaN(tempNum) || tempNum < 0 || tempNum > 2) {
        return res.status(400).json({ error: 'Temperature must be a number between 0 and 2' });
      }
    }

    if (max_tokens !== undefined) {
      const tokensNum = parseInt(max_tokens);
      if (isNaN(tokensNum) || tokensNum <= 0) {
        return res.status(400).json({ error: 'Max tokens must be a positive integer' });
      }
    }

    const configData = {
      name,
      type,
      api_key: api_key || null,
      endpoint: endpoint || (type === 'openai' ? 'https://api.openai.com/v1' : null),
      model,
      temperature: temperature ? parseFloat(temperature) : 0.7,
      max_tokens: max_tokens ? parseInt(max_tokens) : 2048,
      system_prompt: system_prompt || undefined,
      repetition_penalty: repetition_penalty ? parseFloat(repetition_penalty) : undefined,
      is_enabled: is_enabled || false,
      is_default: is_default || false,
    };

    const config = await ConfigService.createConfig(configData);
    res.status(201).json({ config });
  } catch (error: any) {
    console.error('Create config error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update configuration (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      api_key,
      endpoint,
      model,
      temperature,
      max_tokens,
      system_prompt,
      repetition_penalty,
      is_enabled,
      is_default,
    } = req.body;

    const updates: any = {};
    
    if (name !== undefined) updates.name = name;
    if (type !== undefined) {
      if (!['openai', 'ollama'].includes(type)) {
        return res.status(400).json({ error: 'Type must be either "openai" or "ollama"' });
      }
      updates.type = type;
    }
    if (api_key !== undefined && api_key !== '') updates.api_key = api_key;
    if (endpoint !== undefined) updates.endpoint = endpoint;
    if (model !== undefined) updates.model = model;
    if (temperature !== undefined) {
      const tempNum = parseFloat(temperature);
      if (isNaN(tempNum) || tempNum < 0 || tempNum > 2) {
        return res.status(400).json({ error: 'Temperature must be a number between 0 and 2' });
      }
      updates.temperature = tempNum;
    }
    if (max_tokens !== undefined) {
      const tokensNum = parseInt(max_tokens);
      if (isNaN(tokensNum) || tokensNum <= 0) {
        return res.status(400).json({ error: 'Max tokens must be a positive integer' });
      }
      updates.max_tokens = tokensNum;
    }
    if (system_prompt !== undefined) updates.system_prompt = system_prompt || undefined;
    if (repetition_penalty !== undefined) {
      const penaltyNum = parseFloat(repetition_penalty);
      if (isNaN(penaltyNum) || penaltyNum < 0.1 || penaltyNum > 2.0) {
        return res.status(400).json({ error: 'Repetition penalty must be a number between 0.1 and 2.0' });
      }
      updates.repetition_penalty = penaltyNum;
    }
    if (is_enabled !== undefined) updates.is_enabled = is_enabled;
    if (is_default !== undefined) updates.is_default = is_default;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    const config = await ConfigService.updateConfig(id, updates);
    res.json({ config });
  } catch (error: any) {
    console.error('Update config error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Set default configuration (admin only)
router.put('/:id/set-default', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const config = await ConfigService.setDefaultConfig(id);
    res.json({ config });
  } catch (error: any) {
    console.error('Set default config error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete configuration (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await ConfigService.deleteConfig(id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Delete config error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Fetch available models from OpenAI-compatible API (admin only)
router.post('/fetch-models', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { api_key, endpoint } = req.body;

    // If no endpoint is provided and no API key, return an error with guidance
    if (!endpoint && (!api_key || api_key.trim() === '')) {
      return res.status(400).json({ 
        error: 'Either an API key (for OpenAI/compatible APIs) or an endpoint URL (for local services) is required to fetch models' 
      });
    }

    // Allow fetching models without API key for local services
    const baseURL = endpoint || 'https://api.openai.com/v1';
    const models = await ConfigService.fetchOpenAIModels(api_key || '', baseURL);
    
    res.json({ models });
  } catch (error: any) {
    console.error('Fetch models error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test LLM configuration (admin only)
router.post('/test-config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, api_key, endpoint, model, temperature, max_tokens } = req.body;

    if (!type || !model) {
      return res.status(400).json({ error: 'Type and model are required' });
    }

    // Allow testing without API key for demo mode
    if (type === 'openai' && !api_key) {
      // Demo mode - will be handled in the service
    }

    if (type === 'ollama' && !endpoint) {
      return res.status(400).json({ error: 'Endpoint is required for Ollama configurations' });
    }

    const testConfig = {
      type,
      api_key: api_key || null,
      endpoint: endpoint || (type === 'openai' ? 'https://api.openai.com/v1' : null),
      model,
      temperature: temperature ? parseFloat(temperature) : 0.7,
      max_tokens: max_tokens ? parseInt(max_tokens) : 150,
    };

    const response = await ConfigService.testConfiguration(testConfig);
    
    res.json({ 
      success: true, 
      response,
      message: 'Configuration test successful!'
    });
  } catch (error: any) {
    console.error('Test config error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;