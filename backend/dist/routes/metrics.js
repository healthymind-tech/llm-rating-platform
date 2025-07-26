"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const metricsService_1 = require("../services/metricsService");
const auth_1 = require("../middleware/auth");
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
        const history = await metricsService_1.MetricsService.getChatHistory(limit, offset);
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
        const sessions = await metricsService_1.MetricsService.getChatSessionsWithDetails(limit, offset);
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
exports.default = router;
//# sourceMappingURL=metrics.js.map