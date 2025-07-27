import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Alert, Container, useTheme, useMediaQuery } from '@mui/material';
import { ChatInterface } from './ChatInterface';
import { ChatMessage, MessageRating } from '../types';
import { useAuthStore } from '../store/authStore';
import { chatAPI, messageRatingAPI } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';

export const UserDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuthStore();
  const { t } = useTranslation();
  useLanguage(); // This will monitor for language changes
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
        // Check if we need to wait for rating again after removal
        setWaitingForRating(hasUnratedAssistantMessage());
      } else {
        // Set or update rating
        const response = await messageRatingAPI.rateMessage(messageId, rating, reason);
        const newRatings = new Map(messageRatings);
        newRatings.set(messageId, response.rating);
        setMessageRatings(newRatings);
        // Enable input after rating
        setWaitingForRating(false);
      }
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
        content: t('errors.generic'),
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
    <Box sx={{ 
      height: 'calc(100vh - 64px)', // Full height minus app bar
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Container maxWidth="lg" sx={{ 
        py: { xs: 1, sm: 2 },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        
        <Card sx={{ 
          borderRadius: theme.custom.borderRadius.large,
          boxShadow: theme.custom.shadows.card,
          overflow: 'hidden',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <CardContent sx={{ 
            p: { xs: 1.5, sm: 2 },
            '&:last-child': { pb: { xs: 1.5, sm: 2 } },
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: { xs: 1.5, sm: 2 },
              flexShrink: 0
            }}>
              <Box sx={{
                width: 6,
                height: 30,
                background: theme.custom.gradients.secondary,
                borderRadius: theme.custom.borderRadius.small
              }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.125rem' }
                }}
              >
                {t('chat.title')}
              </Typography>
            </Box>
            
            {waitingForRating && (
              <Alert 
                severity="info" 
                sx={{ 
                  mb: { xs: 1.5, sm: 2 },
                  borderRadius: theme.custom.borderRadius.medium,
                  flexShrink: 0,
                  '& .MuiAlert-message': {
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }
                }}
              >
                {t('rating.reasonRequired')}
              </Alert>
            )}
            
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                loading={loading || waitingForRating}
                messageRatings={messageRatings}
                onRateMessage={handleMessageRating}
                ratingDisabled={loading}
              />
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};