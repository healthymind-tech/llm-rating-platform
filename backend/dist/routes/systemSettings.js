"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const systemSettingsService_1 = require("../services/systemSettingsService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get system language (public endpoint for language switching) - MUST be before /:key route
router.get('/public/language', async (req, res) => {
    try {
        const language = await systemSettingsService_1.SystemSettingsService.getSystemLanguage();
        res.json({ language });
    }
    catch (error) {
        console.error('Get system language error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get all system settings (admin only)
router.get('/', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const settings = await systemSettingsService_1.SystemSettingsService.getAllSettings();
        res.json({ settings });
    }
    catch (error) {
        console.error('Get system settings error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get specific setting (authenticated users)
router.get('/:key', auth_1.authenticateToken, async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await systemSettingsService_1.SystemSettingsService.getSetting(key);
        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        res.json({ setting });
    }
    catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Update specific setting (admin only)
router.put('/:key', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value, type } = req.body;
        if (value === undefined) {
            return res.status(400).json({ error: 'Value is required' });
        }
        const setting = await systemSettingsService_1.SystemSettingsService.updateSetting(key, value, type);
        res.json({ setting });
    }
    catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Update multiple settings (admin only)
router.put('/', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { settings } = req.body;
        if (!Array.isArray(settings)) {
            return res.status(400).json({ error: 'Settings must be an array' });
        }
        const updatedSettings = await systemSettingsService_1.SystemSettingsService.updateMultipleSettings(settings);
        res.json({ settings: updatedSettings });
    }
    catch (error) {
        console.error('Update multiple settings error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Create new setting (admin only)
router.post('/', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { key, value, type, description } = req.body;
        if (!key || value === undefined || !type) {
            return res.status(400).json({ error: 'Key, value, and type are required' });
        }
        const setting = await systemSettingsService_1.SystemSettingsService.createSetting(key, value, type, description);
        res.status(201).json({ setting });
    }
    catch (error) {
        console.error('Create setting error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Delete setting (admin only)
router.delete('/:key', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        await systemSettingsService_1.SystemSettingsService.deleteSetting(key);
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete setting error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Set system language (admin only)
router.put('/language/set', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { language } = req.body;
        if (!language) {
            return res.status(400).json({ error: 'Language is required' });
        }
        await systemSettingsService_1.SystemSettingsService.setSystemLanguage(language);
        res.json({ message: 'System language updated successfully', language });
    }
    catch (error) {
        console.error('Set system language error:', error);
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=systemSettings.js.map