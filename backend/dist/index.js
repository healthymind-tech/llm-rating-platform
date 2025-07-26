"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Load routes safely
try {
    console.log('Loading auth routes...');
    const authRoutes = require('./routes/auth').default;
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded');
    console.log('Loading chat routes...');
    const chatRoutes = require('./routes/chat').default;
    app.use('/api/chat', chatRoutes);
    console.log('✅ Chat routes loaded');
    console.log('Loading config routes...');
    const configRoutes = require('./routes/config').default;
    app.use('/api/config', configRoutes);
    console.log('✅ Config routes loaded');
    console.log('Loading metrics routes...');
    const metricsRoutes = require('./routes/metrics').default;
    app.use('/api/metrics', metricsRoutes);
    console.log('✅ Metrics routes loaded');
    console.log('Loading rating routes...');
    const ratingRoutes = require('./routes/rating').default;
    app.use('/api/rating', ratingRoutes);
    console.log('✅ Rating routes loaded');
    console.log('Loading message rating routes...');
    try {
        const messageRatingRoutes = require('./routes/messageRating').default;
        app.use('/api/message-rating', messageRatingRoutes);
        console.log('✅ Message rating routes loaded');
    }
    catch (messageRatingError) {
        console.error('❌ Error loading message rating routes:', messageRatingError);
        console.log('Attempting to load manually...');
        // Manual route loading as fallback
        const express = require('express');
        const { MessageRatingService } = require('./services/messageRatingService');
        const { authenticateToken, requireAdmin } = require('./middleware/auth');
        const messageRatingRouter = express.Router();
        // Rate a message (authenticated users)
        messageRatingRouter.post('/messages/:messageId/rate', authenticateToken, async (req, res) => {
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
            }
            catch (error) {
                console.error('Rate message error:', error);
                res.status(500).json({ error: error.message });
            }
        });
        app.use('/api/message-rating', messageRatingRouter);
        console.log('✅ Message rating routes loaded manually');
    }
}
catch (error) {
    console.error('❌ Error loading routes:', error);
}
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
//# sourceMappingURL=index.js.map