import express from 'express';
import { ChatService } from '../services/chatService';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();

// Create new chat session
router.post('/sessions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const session = await ChatService.createChatSession(userId);
    res.status(201).json({ session });
  } catch (error: any) {
    console.error('Create chat session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's chat sessions
router.get('/sessions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const sessions = await ChatService.getChatSessions(userId);
    res.json({ sessions });
  } catch (error: any) {
    console.error('Get chat sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a specific session
router.get('/sessions/:sessionId/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.userId;
    const messages = await ChatService.getChatMessages(sessionId, userId);
    res.json({ messages });
  } catch (error: any) {
    console.error('Get chat messages error:', error);
    res.status(404).json({ error: error.message });
  }
});

// Send message in chat
router.post('/sessions/:sessionId/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const userId = req.user!.userId;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Save user message
    const userMessage = await ChatService.saveMessage(sessionId, userId, 'user', message);

    // Get AI response
    const aiResponse = await ChatService.sendMessageToLLM(message, sessionId, userId);

    // Save AI response
    const assistantMessage = await ChatService.saveMessage(sessionId, userId, 'assistant', aiResponse);

    res.json({
      userMessage,
      assistantMessage,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple chat endpoint for direct messaging (creates session if needed)
router.post('/message', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user!.userId;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    let currentSessionId = sessionId;

    // Create new session if not provided
    if (!currentSessionId) {
      const session = await ChatService.createChatSession(userId);
      currentSessionId = session.id;
    }

    // Save user message
    await ChatService.saveMessage(currentSessionId, userId, 'user', message);

    // Get AI response
    const aiResponse = await ChatService.sendMessageToLLM(message, currentSessionId, userId);

    // Save AI response
    const assistantMessage = await ChatService.saveMessage(currentSessionId, userId, 'assistant', aiResponse);

    res.json({
      response: aiResponse,
      sessionId: currentSessionId,
      messageId: assistantMessage.id,
    });
  } catch (error: any) {
    console.error('Direct message error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;