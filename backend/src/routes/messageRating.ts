import express from 'express';
import { MessageRatingService } from '../services/messageRatingService';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();

// Rate a message (authenticated users)
router.post('/messages/:messageId/rate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { messageId } = req.params;
    const { rating, reason } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!rating || !['like', 'dislike'].includes(rating)) {
      return res.status(400).json({ error: 'Rating must be either "like" or "dislike"' });
    }

    // Require reason for dislike
    if (rating === 'dislike' && (!reason || reason.trim().length === 0)) {
      return res.status(400).json({ error: 'Reason is required for dislike ratings' });
    }

    const messageRating = await MessageRatingService.rateMessage(messageId, userId, rating, reason);
    res.json({ rating: messageRating });
  } catch (error: any) {
    console.error('Rate message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rating for a message (authenticated users)
router.get('/messages/:messageId/rating', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const rating = await MessageRatingService.getMessageRating(messageId, userId);
    res.json({ rating });
  } catch (error: any) {
    console.error('Get message rating error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove rating from a message (authenticated users)
router.delete('/messages/:messageId/rating', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await MessageRatingService.removeMessageRating(messageId, userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Remove message rating error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get rating statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await MessageRatingService.getRatingStats();
    res.json({ stats });
  } catch (error: any) {
    console.error('Get rating stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed rating analytics (admin only)
router.get('/detailed-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const detailedStats = await MessageRatingService.getDetailedRatingStats();
    res.json({ ratings: detailedStats });
  } catch (error: any) {
    console.error('Get detailed rating stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages with ratings for a session (authenticated users)
router.get('/sessions/:sessionId/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const messages = await MessageRatingService.getMessagesWithRatings(sessionId, userId);
    res.json({ messages });
  } catch (error: any) {
    console.error('Get messages with ratings error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;