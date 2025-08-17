import express from 'express';
import { MetricsService } from '../services/metricsService';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import pool from '../config/database';

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
    const username = req.query.username as string;
    const role = req.query.role as string;
    const rating = req.query.rating as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const messageContent = req.query.messageContent as string;
    const modelName = req.query.modelName as string;

    const history = await MetricsService.getChatHistory(limit, offset, {
      username,
      role,
      rating,
      dateFrom,
      dateTo,
      messageContent,
      modelName
    });
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
    const username = req.query.username as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const modelName = req.query.modelName as string;

    const sessions = await MetricsService.getChatSessionsWithDetails(limit, offset, {
      username,
      dateFrom,
      dateTo,
      modelName
    });
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

// Get users list for filters (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT u.id, u.username, u.email
      FROM users u
      INNER JOIN chat_messages cm ON u.id = cm.user_id
      ORDER BY u.username ASC
    `);
    res.json({ users: result.rows });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export chat sessions (admin only)
router.get('/export/sessions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const format = (req.query.format as string) || 'json';
    const username = req.query.username as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const modelName = req.query.modelName as string;

    const sessions = await MetricsService.exportChatSessions({
      username,
      dateFrom,
      dateTo,
      modelName,
      format
    });

    // Set appropriate headers based on format
    switch (format.toLowerCase()) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="chat-sessions-${new Date().toISOString().split('T')[0]}.csv"`);
        break;
      case 'xml':
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="chat-sessions-${new Date().toISOString().split('T')[0]}.xml"`);
        break;
      default:
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="chat-sessions-${new Date().toISOString().split('T')[0]}.json"`);
    }

    res.send(sessions);
  } catch (error: any) {
    console.error('Export sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export chat messages (admin only)
router.get('/export/messages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const format = (req.query.format as string) || 'json';
    const username = req.query.username as string;
    const role = req.query.role as string;
    const rating = req.query.rating as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const messageContent = req.query.messageContent as string;
    const modelName = req.query.modelName as string;

    const messages = await MetricsService.exportChatMessages({
      username,
      role,
      rating,
      dateFrom,
      dateTo,
      messageContent,
      modelName,
      format
    });

    // Set appropriate headers based on format
    switch (format.toLowerCase()) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="chat-messages-${new Date().toISOString().split('T')[0]}.csv"`);
        break;
      case 'xml':
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="chat-messages-${new Date().toISOString().split('T')[0]}.xml"`);
        break;
      default:
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="chat-messages-${new Date().toISOString().split('T')[0]}.json"`);
    }

    res.send(messages);
  } catch (error: any) {
    console.error('Export messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;