import express from 'express';
import { MetricsService } from '../services/metricsService';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get system metrics (admin only)
router.get('/system', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const metrics = await MetricsService.getSystemMetrics();
    res.json({ metrics });
  } catch (error: any) {
    console.error('Get system metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat history (admin only)
router.get('/chat-history', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await MetricsService.getChatHistory(limit, offset);
    res.json(history);
  } catch (error: any) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat sessions with details (admin only)
router.get('/chat-sessions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const sessions = await MetricsService.getChatSessionsWithDetails(limit, offset);
    res.json(sessions);
  } catch (error: any) {
    console.error('Get chat sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a specific session (admin only)
router.get('/sessions/:sessionId/messages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await MetricsService.getSessionMessages(sessionId);
    res.json({ messages });
  } catch (error: any) {
    console.error('Get session messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;