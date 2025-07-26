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
    <Box sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ flex: 1, overflow: 'auto', mb: 2, p: 2 }}>
        {messages.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <Typography color="text.secondary">
              Start a conversation with the AI assistant
            </Typography>
          </Box>
        ) : (
          <List>
            {messages.map((message) => (
              <ListItem
                key={message.id}
                sx={{
                  flexDirection: 'column',
                  alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                  p: 1,
                }}
              >
                <Chip
                  label={message.role === 'user' ? 'You' : 'Assistant'}
                  size="small"
                  color={message.role === 'user' ? 'primary' : 'secondary'}
                  sx={{ mb: 1 }}
                />
                <Box sx={{ maxWidth: '80%' }}>
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: message.role === 'user' ? 'primary.light' : 'grey.100',
                      color: message.role === 'user' ? 'white' : 'text.primary',
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1,
                        opacity: 0.7,
                      }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Paper>
                  
                  {/* Show rating for assistant messages */}
                  {message.role === 'assistant' && messageRatings && onRateMessage && (
                    <MessageRatingComponent
                      messageId={message.id}
                      currentRating={messageRatings.get(message.id) || null}
                      onRate={onRateMessage}
                      disabled={ratingDisabled}
                    />
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        )}
        <div ref={messagesEndRef} />
      </Paper>

      <Box component="form" onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
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
            sx={{ minWidth: 'auto', px: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : <Send />}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};