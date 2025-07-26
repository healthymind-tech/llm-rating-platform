"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ratingService_1 = require("../services/ratingService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Rate a session (authenticated users)
router.post('/sessions/:sessionId/rate', auth_1.authenticateToken, async (req, res) => {
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
        const sessionRating = await ratingService_1.RatingService.rateSession(sessionId, userId, rating);
        res.json({ rating: sessionRating });
    }
    catch (error) {
        console.error('Rate session error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get rating for a session (authenticated users)
router.get('/sessions/:sessionId/rating', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const rating = await ratingService_1.RatingService.getSessionRating(sessionId, userId);
        res.json({ rating });
    }
    catch (error) {
        console.error('Get session rating error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Remove rating from a session (authenticated users)
router.delete('/sessions/:sessionId/rating', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        await ratingService_1.RatingService.removeSessionRating(sessionId, userId);
        res.status(204).send();
    }
    catch (error) {
        console.error('Remove session rating error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get rating statistics (admin only)
router.get('/stats', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const stats = await ratingService_1.RatingService.getRatingStats();
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
        const detailedStats = await ratingService_1.RatingService.getDetailedRatingStats();
        res.json({ ratings: detailedStats });
    }
    catch (error) {
        console.error('Get detailed rating stats error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=rating.js.map