import express from 'express';
import { RatingService } from '../services/ratingService';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();

// Rate a session (authenticated users)
router.post('/sessions/:sessionId/rate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const { rating } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!rating || !['like', 'dislike'].includes(rating)) {
      return res.status(400).json({ error: 'Rating must be either "like" or "dislike"' });
    }

    const sessionRating = await RatingService.rateSession(sessionId, userId, rating);
    res.json({ rating: sessionRating });
  } catch (error: any) {
    console.error('Rate session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rating for a session (authenticated users)
router.get('/sessions/:sessionId/rating', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const rating = await RatingService.getSessionRating(sessionId, userId);
    res.json({ rating });
  } catch (error: any) {
    console.error('Get session rating error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove rating from a session (authenticated users)
router.delete('/sessions/:sessionId/rating', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await RatingService.removeSessionRating(sessionId, userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Remove session rating error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rating statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await RatingService.getRatingStats();
    res.json({ stats });
  } catch (error: any) {
    console.error('Get rating stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed rating analytics (admin only)
router.get('/detailed-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const detailedStats = await RatingService.getDetailedRatingStats();
    res.json({ ratings: detailedStats });
  } catch (error: any) {
    console.error('Get detailed rating stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;