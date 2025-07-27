import express from 'express';
import { SystemSettingsService } from '../services/systemSettingsService';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get system language (public endpoint for language switching) - MUST be before /:key route
router.get('/public/language', async (req, res) => {
  try {
    const language = await SystemSettingsService.getSystemLanguage();
    res.json({ language });
  } catch (error: any) {
    console.error('Get system language error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all system settings (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await SystemSettingsService.getAllSettings();
    res.json({ settings });
  } catch (error: any) {
    console.error('Get system settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific setting (authenticated users)
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SystemSettingsService.getSetting(key);
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ setting });
  } catch (error: any) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update specific setting (admin only)
router.put('/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, type } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const setting = await SystemSettingsService.updateSetting(key, value, type);
    res.json({ setting });
  } catch (error: any) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update multiple settings (admin only)
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings must be an array' });
    }

    const updatedSettings = await SystemSettingsService.updateMultipleSettings(settings);
    res.json({ settings: updatedSettings });
  } catch (error: any) {
    console.error('Update multiple settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new setting (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key, value, type, description } = req.body;

    if (!key || value === undefined || !type) {
      return res.status(400).json({ error: 'Key, value, and type are required' });
    }

    const setting = await SystemSettingsService.createSetting(key, value, type, description);
    res.status(201).json({ setting });
  } catch (error: any) {
    console.error('Create setting error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete setting (admin only)
router.delete('/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    await SystemSettingsService.deleteSetting(key);
    res.status(204).send();
  } catch (error: any) {
    console.error('Delete setting error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Set system language (admin only)
router.put('/language/set', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { language } = req.body;

    if (!language) {
      return res.status(400).json({ error: 'Language is required' });
    }

    await SystemSettingsService.setSystemLanguage(language);
    res.json({ message: 'System language updated successfully', language });
  } catch (error: any) {
    console.error('Set system language error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;