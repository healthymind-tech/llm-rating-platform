"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const messageRatingService_1 = require("../services/messageRatingService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Rate a message (authenticated users)
router.post('/messages/:messageId/rate', auth_1.authenticateToken, async (req, res) => {
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
        const messageRating = await messageRatingService_1.MessageRatingService.rateMessage(messageId, userId, rating, reason);
        res.json({ rating: messageRating });
    }
    catch (error) {
        console.error('Rate message error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get rating for a message (authenticated users)
router.get('/messages/:messageId/rating', auth_1.authenticateToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const rating = await messageRatingService_1.MessageRatingService.getMessageRating(messageId, userId);
        res.json({ rating });
    }
    catch (error) {
        console.error('Get message rating error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Remove rating from a message (authenticated users)
router.delete('/messages/:messageId/rating', auth_1.authenticateToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        await messageRatingService_1.MessageRatingService.removeMessageRating(messageId, userId);
        res.status(204).send();
    }
    catch (error) {
        console.error('Remove message rating error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get rating statistics (admin only)
router.get('/stats', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const stats = await messageRatingService_1.MessageRatingService.getRatingStats();
        res.json({ stats });
    }
    catch (error) {
        console.error('Get rating stats error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get detailed rating analytics (admin only)
router.get('/detailed-stats', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const detailedStats = await messageRatingService_1.MessageRatingService.getDetailedRatingStats();
        res.json({ ratings: detailedStats });
    }
    catch (error) {
        console.error('Get detailed rating stats error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get messages with ratings for a session (authenticated users)
router.get('/sessions/:sessionId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const messages = await messageRatingService_1.MessageRatingService.getMessagesWithRatings(sessionId, userId);
        res.json({ messages });
    }
    catch (error) {
        console.error('Get messages with ratings error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=messageRating.js.map