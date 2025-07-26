import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
  } catch (messageRatingError) {
    console.error('❌ Error loading message rating routes:', messageRatingError);
    console.log('Attempting to load manually...');
    
    // Manual route loading as fallback
    const express = require('express');
    const { MessageRatingService } = require('./services/messageRatingService');
    const { authenticateToken, requireAdmin } = require('./middleware/auth');
    
    const messageRatingRouter = express.Router();
    
    // Rate a message (authenticated users)
    messageRatingRouter.post('/messages/:messageId/rate', authenticateToken, async (req: any, res: any) => {
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
    
    app.use('/api/message-rating', messageRatingRouter);
    console.log('✅ Message rating routes loaded manually');
  }
} catch (error) {
  console.error('❌ Error loading routes:', error);
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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