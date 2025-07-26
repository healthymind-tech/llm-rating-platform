import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';
import { ChatInterface } from './ChatInterface';
import { ChatMessage, MessageRating } from '../types';
import { useAuthStore } from '../store/authStore';
import { chatAPI, messageRatingAPI } from '../services/api';

export const UserDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [waitingForRating, setWaitingForRating] = useState(false);
  const [messageRatings, setMessageRatings] = useState<Map<string, MessageRating>>(new Map());

  // Check if there's an unrated assistant message
  const hasUnratedAssistantMessage = () => {
    const lastMessage = messages[messages.length - 1];
    return lastMessage && 
           lastMessage.role === 'assistant' && 
           !messageRatings.has(lastMessage.id);
  };

  const handleMessageRating = async (messageId: string, rating: 'like' | 'dislike', reason?: string) => {
    try {
      const currentRating = messageRatings.get(messageId);
      
      if (currentRating?.rating === rating) {
        // Remove rating if clicking the same one
        await messageRatingAPI.removeMessageRating(messageId);
        const newRatings = new Map(messageRatings);
        newRatings.delete(messageId);
        setMessageRatings(newRatings);
      } else {
        // Set or update rating
        const response = await messageRatingAPI.rateMessage(messageId, rating, reason);
        const newRatings = new Map(messageRatings);
        newRatings.set(messageId, response.rating);
        setMessageRatings(newRatings);
      }
      
      // Check if we can continue chatting
      setWaitingForRating(hasUnratedAssistantMessage());
    } catch (error) {
      console.error('Failed to rate message:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!user || waitingForRating) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const data = await chatAPI.sendMessage(content, user.id, currentSessionId || undefined);
      
      // Update session ID if we got a new one (first message in session)
      if (data.sessionId && !currentSessionId) {
        setCurrentSessionId(data.sessionId);
      }
      
      const assistantMessage: ChatMessage = {
        id: data.messageId, // Use actual message ID from backend
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        needsRating: true,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setWaitingForRating(true); // Block further input until rated
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`, // Temporary ID for error messages (won't be rated)
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        needsRating: false, // Don't require rating for error messages
      };
      setMessages(prev => [...prev, errorMessage]);
      // Don't block input for error messages
    } finally {
      setLoading(false);
    }
  };


  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome, {user?.username}!
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Chat with AI Assistant
          </Typography>
          
          {waitingForRating && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Please rate the assistant's response before continuing the conversation.
            </Alert>
          )}
          
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loading || waitingForRating}
            messageRatings={messageRatings}
            onRateMessage={handleMessageRating}
            ratingDisabled={loading}
          />
        </CardContent>
      </Card>
    </Box>
  );
};