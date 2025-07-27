"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const metricsService_1 = require("../services/metricsService");
const auth_1 = require("../middleware/auth");
const database_1 = __importDefault(require("../config/database"));
const router = express_1.default.Router();
// Get system metrics (admin only)
router.get('/system', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const metrics = await metricsService_1.MetricsService.getSystemMetrics();
        res.json({ metrics });
    }
    catch (error) {
        console.error('Get system metrics error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get chat history (admin only)
router.get('/chat-history', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const username = req.query.username;
        const role = req.query.role;
        const rating = req.query.rating;
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const messageContent = req.query.messageContent;
        const history = await metricsService_1.MetricsService.getChatHistory(limit, offset, {
            username,
            role,
            rating,
            dateFrom,
            dateTo,
            messageContent
        });
        res.json(history);
    }
    catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get chat sessions with details (admin only)
router.get('/chat-sessions', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const username = req.query.username;
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const sessions = await metricsService_1.MetricsService.getChatSessionsWithDetails(limit, offset, {
            username,
            dateFrom,
            dateTo
        });
        res.json(sessions);
    }
    catch (error) {
        console.error('Get chat sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get messages for a specific session (admin only)
router.get('/sessions/:sessionId/messages', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const messages = await metricsService_1.MetricsService.getSessionMessages(sessionId);
        res.json({ messages });
    }
    catch (error) {
        console.error('Get session messages error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get users list for filters (admin only)
router.get('/users', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const result = await database_1.default.query(`
      SELECT DISTINCT u.id, u.username, u.email
      FROM users u
      INNER JOIN chat_messages cm ON u.id = cm.user_id
      ORDER BY u.username ASC
    `);
        res.json({ users: result.rows });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Export chat sessions (admin only)
router.get('/export/sessions', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const username = req.query.username;
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const sessions = await metricsService_1.MetricsService.exportChatSessions({
            username,
            dateFrom,
            dateTo,
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
    }
    catch (error) {
        console.error('Export sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Export chat messages (admin only)
router.get('/export/messages', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const username = req.query.username;
        const role = req.query.role;
        const rating = req.query.rating;
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const messageContent = req.query.messageContent;
        const messages = await metricsService_1.MetricsService.exportChatMessages({
            username,
            role,
            rating,
            dateFrom,
            dateTo,
            messageContent,
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
    }
    catch (error) {
        console.error('Export messages error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=metrics.js.map