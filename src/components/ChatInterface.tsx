import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  CircularProgress,
  Chip,
  useTheme,
  useMediaQuery,
  Fade,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { ChatMessage, MessageRating } from '../types';
import { MessageRatingComponent } from './MessageRating';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  loading?: boolean;
  // Rating functionality
  messageRatings?: Map<string, MessageRating>;
  onRateMessage?: (messageId: string, rating: 'like' | 'dislike', reason?: string) => Promise<void>;
  ratingDisabled?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  loading = false,
  messageRatings,
  onRateMessage,
  ratingDisabled = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const message = inputMessage.trim();
    setInputMessage('');
    await onSendMessage(message);
  };

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex', 
      flexDirection: 'column'
    }}>
      <Paper sx={{ 
        flex: 1, 
        overflow: 'auto', 
        mb: { xs: 1.5, sm: 2 }, 
        p: { xs: 1.5, sm: 2 },
        borderRadius: theme.custom.borderRadius.medium,
        backgroundColor: 'rgba(99, 102, 241, 0.01)',
        border: '1px solid rgba(99, 102, 241, 0.1)',
        minHeight: 0 // Important for flex child with overflow
      }}>
        {messages.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
            flexDirection="column"
            sx={{ p: 3 }}
          >
            <Box sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: theme.custom.gradients.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              color: 'white',
              fontSize: '1.5rem'
            }}>
              🤖
            </Box>
            <Typography 
              color="text.secondary"
              sx={{ 
                textAlign: 'center',
                fontSize: { xs: '0.95rem', sm: '1rem' },
                maxWidth: 300
              }}
            >
              Start a conversation with the AI assistant
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {messages.map((message, index) => (
              <Fade key={message.id} in timeout={300 + index * 100}>
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                    p: { xs: 1, sm: 1.5 },
                    mb: 2
                  }}
                >
                  <Chip
                    label={message.role === 'user' ? 'You' : 'AI Assistant'}
                    size="small"
                    sx={{ 
                      mb: 1,
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      ...(message.role === 'user' ? {
                        background: theme.custom.gradients.primary,
                        color: 'white'
                      } : {
                        background: theme.custom.gradients.secondary,
                        color: 'white'
                      })
                    }}
                  />
                  <Box sx={{ 
                    maxWidth: { xs: '90%', sm: '75%', md: '65%', lg: '60%' },
                    width: 'fit-content'
                  }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: theme.custom.borderRadius.medium,
                        position: 'relative',
                        ...(message.role === 'user' ? {
                          background: theme.custom.gradients.primary,
                          color: 'white',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: -8,
                            right: 16,
                            width: 0,
                            height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderBottom: '8px solid #6366f1'
                          }
                        } : {
                          backgroundColor: 'white',
                          border: '1px solid rgba(99, 102, 241, 0.1)',
                          color: 'text.primary',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: -8,
                            left: 16,
                            width: 0,
                            height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderBottom: '8px solid white'
                          }
                        })
                      }}
                    >
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          lineHeight: 1.6
                        }}
                      >
                        {message.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 1,
                          opacity: message.role === 'user' ? 0.8 : 0.6,
                          fontSize: '0.75rem'
                        }}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Paper>
                    
                    {/* Show rating for assistant messages */}
                    {message.role === 'assistant' && messageRatings && onRateMessage && (
                      <Box sx={{ mt: 1, ml: message.role === 'assistant' ? 0 : 'auto' }}>
                        <MessageRatingComponent
                          messageId={message.id}
                          currentRating={messageRatings.get(message.id) || null}
                          onRate={onRateMessage}
                          disabled={ratingDisabled}
                        />
                      </Box>
                    )}
                  </Box>
                </ListItem>
              </Fade>
            ))}
          </List>
        )}
        <div ref={messagesEndRef} />
      </Paper>

      <Box 
        component="form" 
        onSubmit={handleSubmit}
        sx={{
          p: { xs: 1.5, sm: 2 },
          backgroundColor: 'rgba(99, 102, 241, 0.02)',
          borderRadius: theme.custom.borderRadius.medium,
          border: '1px solid rgba(99, 102, 241, 0.1)',
          flexShrink: 0
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1, sm: 1.5 },
          alignItems: 'flex-end'
        }}>
          <TextField
            fullWidth
            multiline
            maxRows={isMobile ? 3 : 4}
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: theme.custom.borderRadius.medium,
                backgroundColor: 'white',
                fontSize: { xs: '0.9rem', sm: '1rem' },
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: '2px'
                  }
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={!inputMessage.trim() || loading}
            sx={{ 
              minWidth: { xs: 48, sm: 56 },
              height: { xs: 48, sm: 56 },
              borderRadius: theme.custom.borderRadius.medium,
              background: theme.custom.gradients.primary,
              '&:hover': {
                background: theme.custom.gradients.primary,
                transform: 'translateY(-1px)',
                boxShadow: theme.custom.shadows.button
              },
              '&:disabled': {
                background: 'rgba(99, 102, 241, 0.3)'
              }
            }}
          >
            {loading ? (
              <CircularProgress size={isMobile ? 20 : 24} sx={{ color: 'white' }} />
            ) : (
              <Send sx={{ fontSize: isMobile ? '1.2rem' : '1.5rem' }} />
            )}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};