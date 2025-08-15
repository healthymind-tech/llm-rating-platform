"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userProfileService_1 = require("../services/userProfileService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get user profile
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await userProfileService_1.userProfileService.getUserProfile(userId);
        if (!profile) {
            return res.status(404).json({ error: 'User profile not found' });
        }
        res.json(profile);
    }
    catch (error) {
        console.error('Failed to fetch user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});
// Update user profile
router.put('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { height, weight, body_fat, lifestyle_habits, include_body_in_prompts } = req.body;
        // Check if body information is required
        const isBodyInfoRequired = await userProfileService_1.userProfileService.isBodyInfoRequired();
        if (isBodyInfoRequired) {
            // Validate required fields when body info is required
            if (!height || !weight || !lifestyle_habits) {
                return res.status(400).json({
                    error: 'Height, weight, and lifestyle habits are required'
                });
            }
            // Validate data types and ranges
            if (typeof height !== 'number' || height <= 0 || height > 300) {
                return res.status(400).json({
                    error: 'Height must be a positive number less than 300cm'
                });
            }
            if (typeof weight !== 'number' || weight <= 0 || weight > 500) {
                return res.status(400).json({
                    error: 'Weight must be a positive number less than 500kg'
                });
            }
            if (typeof lifestyle_habits !== 'string' || lifestyle_habits.trim().length === 0) {
                return res.status(400).json({
                    error: 'Lifestyle habits must be a non-empty string'
                });
            }
        }
        else {
            // When body info is not required, still validate if provided
            if (height !== undefined && (typeof height !== 'number' || height <= 0 || height > 300)) {
                return res.status(400).json({
                    error: 'Height must be a positive number less than 300cm'
                });
            }
            if (weight !== undefined && (typeof weight !== 'number' || weight <= 0 || weight > 500)) {
                return res.status(400).json({
                    error: 'Weight must be a positive number less than 500kg'
                });
            }
            if (lifestyle_habits !== undefined && (typeof lifestyle_habits !== 'string' || lifestyle_habits.trim().length === 0)) {
                return res.status(400).json({
                    error: 'Lifestyle habits must be a non-empty string'
                });
            }
        }
        if (body_fat !== undefined && (typeof body_fat !== 'number' || body_fat < 0 || body_fat > 50)) {
            return res.status(400).json({
                error: 'Body fat must be a number between 0 and 50%'
            });
        }
        const updatedProfile = await userProfileService_1.userProfileService.updateUserProfile(userId, {
            height,
            weight,
            body_fat,
            lifestyle_habits: lifestyle_habits ? lifestyle_habits.trim() : undefined,
            include_body_in_prompts
        });
        res.json(updatedProfile);
    }
    catch (error) {
        console.error('Failed to update user profile:', error);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
});
// Check profile completion status
router.get('/completion-status', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const isCompleted = await userProfileService_1.userProfileService.checkProfileCompletion(userId);
        res.json({ completed: isCompleted });
    }
    catch (error) {
        console.error('Failed to check profile completion:', error);
        res.status(500).json({ error: 'Failed to check profile completion' });
    }
});
// Check if body information is required
router.get('/body-info-required', async (req, res) => {
    console.log('🔍 Body info required endpoint called');
    try {
        const isRequired = await userProfileService_1.userProfileService.isBodyInfoRequired();
        console.log('✅ Body info required result:', isRequired);
        res.json({ required: isRequired });
    }
    catch (error) {
        console.error('Failed to check body info requirement:', error);
        res.status(500).json({ error: 'Failed to check body info requirement' });
    }
});
// Debug route to test if routes are working
router.get('/test', (req, res) => {
    console.log('🔍 Test endpoint called');
    res.json({ message: 'User profile routes are working' });
});
exports.default = router;
//# sourceMappingURL=userProfile.js.map