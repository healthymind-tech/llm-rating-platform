import express from 'express';
import { userProfileService } from '../services/userProfileService';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();

// Get user profile
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const profile = await userProfileService.getUserProfile(userId);
    
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { height, weight, body_fat, lifestyle_habits } = req.body;
    
    // Validate required fields
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
    
    if (body_fat !== undefined && (typeof body_fat !== 'number' || body_fat < 0 || body_fat > 50)) {
      return res.status(400).json({ 
        error: 'Body fat must be a number between 0 and 50%' 
      });
    }
    
    if (typeof lifestyle_habits !== 'string' || lifestyle_habits.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Lifestyle habits must be a non-empty string' 
      });
    }
    
    const updatedProfile = await userProfileService.updateUserProfile(userId, {
      height,
      weight,
      body_fat,
      lifestyle_habits: lifestyle_habits.trim()
    });
    
    res.json(updatedProfile);
  } catch (error) {
    console.error('Failed to update user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Check profile completion status
router.get('/completion-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const isCompleted = await userProfileService.checkProfileCompletion(userId);
    
    res.json({ completed: isCompleted });
  } catch (error) {
    console.error('Failed to check profile completion:', error);
    res.status(500).json({ error: 'Failed to check profile completion' });
  }
});

export default router;