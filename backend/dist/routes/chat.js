"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chatService_1 = require("../services/chatService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Create new chat session
router.post('/sessions', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const session = await chatService_1.ChatService.createChatSession(userId);
        res.status(201).json({ session });
    }
    catch (error) {
        console.error('Create chat session error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get user's chat sessions
router.get('/sessions', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const sessions = await chatService_1.ChatService.getChatSessions(userId);
        res.json({ sessions });
    }
    catch (error) {
        console.error('Get chat sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get messages for a specific session
router.get('/sessions/:sessionId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.userId;
        const messages = await chatService_1.ChatService.getChatMessages(sessionId, userId);
        res.json({ messages });
    }
    catch (error) {
        console.error('Get chat messages error:', error);
        res.status(404).json({ error: error.message });
    }
});
// Send message in chat
router.post('/sessions/:sessionId/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { message } = req.body;
        const userId = req.user.userId;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }
        // Save user message
        const userMessage = await chatService_1.ChatService.saveMessage(sessionId, userId, 'user', message);
        // Get AI response
        const aiResponse = await chatService_1.ChatService.sendMessageToLLM(message, sessionId, userId);
        // Save AI response
        const assistantMessage = await chatService_1.ChatService.saveMessage(sessionId, userId, 'assistant', aiResponse);
        res.json({
            userMessage,
            assistantMessage,
        });
    }
    catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Simple chat endpoint for direct messaging (creates session if needed)
router.post('/message', auth_1.authenticateToken, async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const userId = req.user.userId;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }
        let currentSessionId = sessionId;
        // Create new session if not provided
        if (!currentSessionId) {
            const session = await chatService_1.ChatService.createChatSession(userId);
            currentSessionId = session.id;
        }
        // Save user message
        await chatService_1.ChatService.saveMessage(currentSessionId, userId, 'user', message);
        // Get AI response
        const aiResponse = await chatService_1.ChatService.sendMessageToLLM(message, currentSessionId, userId);
        // Save AI response
        const assistantMessage = await chatService_1.ChatService.saveMessage(currentSessionId, userId, 'assistant', aiResponse);
        res.json({
            response: aiResponse,
            sessionId: currentSessionId,
            messageId: assistantMessage.id,
        });
    }
    catch (error) {
        console.error('Direct message error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map