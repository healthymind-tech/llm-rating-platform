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
    const { message, images } = req.body as { message?: string; images?: string[] };
    const userId = req.user!.userId;

    const hasMessage = typeof message === 'string' && message.trim().length > 0;
    const hasImages = Array.isArray(images) && images.length > 0;
    if (!hasMessage && !hasImages) {
      return res.status(400).json({ error: 'Message or images are required' });
    }

    // Save user message
    let imageUrls: string[] | undefined = undefined;
    if (Array.isArray(images) && images.length > 0) {
      try {
        const { storageService } = await import('../services/storageService');
        const uploads = await Promise.all(
          images.map((img) => storageService.uploadBase64Image(img, { userId, sessionId }))
        );
        imageUrls = uploads.map(u => u.url);
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr);
      }
    }

    const userMessage = await ChatService.saveMessage(sessionId, userId, 'user', hasMessage ? message! : '', 0, 0, undefined, imageUrls);

    // Get AI response
    const textForLLM = hasMessage ? message! : '';
    const aiResult = await ChatService.sendMessageToLLM(textForLLM, sessionId, userId);

    // Extract token usage
    const inputTokens = aiResult.tokenUsage?.inputTokens || 0;
    const outputTokens = aiResult.tokenUsage?.outputTokens || 0;

    // Save AI response with token tracking and model info
    const assistantMessage = await ChatService.saveMessage(sessionId, userId, 'assistant', aiResult.response, inputTokens, outputTokens, aiResult.modelInfo);

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
    const { message, sessionId } = req.body as { message?: string; sessionId?: string };
    const userId = req.user!.userId;

    const hasMessage = typeof message === 'string' && message.trim().length > 0;
    if (!hasMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let currentSessionId = sessionId;

    // Create new session if not provided
    if (!currentSessionId) {
      const session = await ChatService.createChatSession(userId);
      currentSessionId = session.id;
    }

    // Save user message
    await ChatService.saveMessage(currentSessionId, userId, 'user', message!);

    // Get AI response
    const aiResult = await ChatService.sendMessageToLLM(message, currentSessionId, userId);

    // Extract token usage
    const inputTokens = aiResult.tokenUsage?.inputTokens || 0;
    const outputTokens = aiResult.tokenUsage?.outputTokens || 0;

    // Save AI response with token tracking and model info
    const assistantMessage = await ChatService.saveMessage(currentSessionId, userId, 'assistant', aiResult.response, inputTokens, outputTokens, aiResult.modelInfo);

    res.json({
      response: aiResult.response,
      sessionId: currentSessionId,
      messageId: assistantMessage.id,
    });
  } catch (error: any) {
    console.error('Direct message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Streaming chat endpoint
router.post('/message/stream', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { message, sessionId, images } = req.body as { message?: string; sessionId?: string; images?: string[] };
    const userId = req.user!.userId;

    const hasMessage = typeof message === 'string' && message.trim().length > 0;
    const hasImages = Array.isArray(images) && images.length > 0;
    if (!hasMessage && !hasImages) {
      return res.status(400).json({ error: 'Message or images are required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    let currentSessionId = sessionId;

    // Create new session if not provided
    if (!currentSessionId) {
      const session = await ChatService.createChatSession(userId);
      currentSessionId = session.id;
    }

    // If images are provided, attempt to save them to storage and store URLs on the message
    let imageUrls: string[] | undefined = undefined;
    if (Array.isArray(images) && images.length > 0) {
      try {
        const { storageService } = await import('../services/storageService');
        const uploads = await Promise.all(
          images.map((img) => storageService.uploadBase64Image(img, { userId, sessionId: currentSessionId! }))
        );
        imageUrls = uploads.map(u => u.url);
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr);
      }
    }

    // Save user message (with images, if any)
    await ChatService.saveMessage(currentSessionId, userId, 'user', hasMessage ? message! : '', 0, 0, undefined, imageUrls);

    // Send session info first
    res.write(`data: ${JSON.stringify({ sessionId: currentSessionId, type: 'session' })}\n\n`);

    try {
      // Get AI response with streaming
      const textForLLM = hasMessage ? message! : '';
      const aiResult = await ChatService.sendMessageToLLMStream(textForLLM, currentSessionId, userId, res);

      // For streaming, estimate tokens since we don't get usage directly
      const inputTokens = Math.ceil(textForLLM.length / 4); // Simple estimation
      const outputTokens = Math.ceil(aiResult.response.length / 4);

      // Save AI response with estimated token tracking and model info
      const assistantMessage = await ChatService.saveMessage(currentSessionId, userId, 'assistant', aiResult.response, inputTokens, outputTokens, aiResult.modelInfo);

      // Send final message ID
      res.write(`data: ${JSON.stringify({ messageId: assistantMessage.id, type: 'complete' })}\n\n`);
      
    } catch (streamError: any) {
      console.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ error: streamError.message, done: true })}\n\n`);
    }

    res.end();
  } catch (error: any) {
    console.error('Streaming endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
