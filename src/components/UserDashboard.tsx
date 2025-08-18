import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Alert, Container, useTheme, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import { ChatInterface } from './ChatInterface';
import { LLMSelector } from './LLMSelector';
import { ChatMessage, MessageRating, LLMConfig } from '../types';
import { useAuthStore } from '../store/authStore';
import { chatAPI, messageRatingAPI, userProfileAPI, configAPI } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';
import { UserProfileForm, ProfileData } from './UserProfileForm';
import { Person } from '@mui/icons-material';

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
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedLLMId, setSelectedLLMId] = useState<string | null>(null);
  const [enabledLLMs, setEnabledLLMs] = useState<LLMConfig[]>([]);
  const [isWindowDragging, setIsWindowDragging] = useState(false);

  // Fetch enabled LLM configurations and user preference
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [configs, pref] = await Promise.all([
          configAPI.getEnabledConfigs(),
          userProfileAPI.getLLMPreference(),
        ]);
        
        setEnabledLLMs(configs);

        if (pref.preferred_llm_id && configs.some(c => c.id === pref.preferred_llm_id)) {
          setSelectedLLMId(pref.preferred_llm_id);
        } else {
          const defaultLLM = configs.find(c => c.isDefault);
          if (defaultLLM) {
            setSelectedLLMId(defaultLLM.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        setIsWindowDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.relatedTarget === null) {
        setIsWindowDragging(false);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
    };
  }, []);

  // Get current LLM configuration
  const getCurrentLLM = () => {
    if (selectedLLMId) {
      return enabledLLMs.find(llm => llm.id === selectedLLMId);
    }
    return enabledLLMs.find(llm => llm.isDefault);
  };

  // Check if there's an unrated assistant message
  const hasUnratedAssistantMessage = () => {
    const lastMessage = messages[messages.length - 1];
    return lastMessage && 
           lastMessage.role === 'assistant' && 
           lastMessage.needsRating !== false &&
           !messageRatings.has(lastMessage.id);
  };

  const handleMessageRating = async (messageId: string, rating: 'like' | 'dislike', reason?: string) => {
    // Prevent rating messages with temporary IDs
    if (messageId.startsWith('assistant-')) {
      console.warn('Cannot rate message with temporary ID:', messageId);
      return;
    }
    
    try {
      const currentRating = messageRatings.get(messageId);
      
      if (currentRating?.rating === rating) {
        // Remove rating if clicking the same one
        await messageRatingAPI.removeMessageRating(messageId);
        const newRatings = new Map(messageRatings);
        newRatings.delete(messageId);
        setMessageRatings(newRatings);
        // Force waiting for rating since we just removed a rating
        setWaitingForRating(true);
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

  const handleProfileClick = async () => {
    try {
      const profile = await userProfileAPI.getUserProfile();
      setUserProfile(profile);
      setShowProfileForm(true);
    } catch (error) {
      console.error('Failed to load profile:', error);
      setUserProfile(null);
      setShowProfileForm(true);
    }
  };

  const handleProfileSubmit = async (profileData: ProfileData) => {
    setProfileLoading(true);
    try {
      const updatedProfile = await userProfileAPI.updateUserProfile(profileData);
      setUserProfile(updatedProfile);
      setShowProfileForm(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLLMChange = (llmId: string | null) => {
    setSelectedLLMId(llmId);
    // Reset chat session when model changes
    setMessages([]);
    setCurrentSessionId(null);
    setMessageRatings(new Map());
    setWaitingForRating(false);
  };

  const handleSendMessage = async (content: string, images?: string[]) => {
    if (!user) return;
    
    // Check if there's an unrated assistant message before sending
    if (hasUnratedAssistantMessage()) {
      setWaitingForRating(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      images,
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    // Create placeholder assistant message ID for streaming (but don't add to messages yet)
    const assistantMessageId = `assistant-${Date.now()}`;

    try {
      await chatAPI.sendMessageStream(
        content,
        user.id,
        currentSessionId || undefined,
        // On chunk received
        (chunk: string) => {
          setMessages(prev => {
            // Check if assistant message already exists
            const assistantExists = prev.some(msg => msg.id === assistantMessageId);
            
            if (!assistantExists) {
              // First chunk - create the assistant message
              const assistantMessage: ChatMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: chunk,
                timestamp: new Date().toISOString(),
                needsRating: true,
              };
              return [...prev, assistantMessage];
            } else {
              // Subsequent chunks - append to existing message
              return prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              );
            }
          });
        },
        // On complete
        (data: { sessionId?: string; messageId: string }) => {
          // Update session ID if we got a new one
          if (data.sessionId && !currentSessionId) {
            setCurrentSessionId(data.sessionId);
          }
          
          console.log('Stream complete, updating message ID from', assistantMessageId, 'to', data.messageId);
          
          // Update message with real ID from backend and set waiting for rating
          setMessages(prev => 
            prev.map(msg => {
              if (msg.id === assistantMessageId) {
                console.log('Updating message ID:', msg.id, '->', data.messageId);
                const updatedMsg = { ...msg, id: data.messageId };
                console.log('Updated message:', updatedMsg);
                return updatedMsg;
              }
              return msg;
            })
          );
          
          // Force a small delay to ensure React re-renders with new ID
          setTimeout(() => {
            console.log('Current messages after ID update:', messages);
          }, 100);
          
          // Set waiting for rating immediately since we just got a new assistant message
          setWaitingForRating(true);
          
          setLoading(false);
        },
        // On error
        (error: string) => {
          setMessages(prev => {
            const assistantExists = prev.some(msg => msg.id === assistantMessageId);
            
            if (!assistantExists) {
              // Create error message if assistant message doesn't exist
              const errorMessage: ChatMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: t('errors.generic'),
                timestamp: new Date().toISOString(),
                needsRating: false,
              };
              return [...prev, errorMessage];
            } else {
              // Update existing message with error
              return prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { 
                      ...msg, 
                      content: t('errors.generic'),
                      needsRating: false
                    }
                  : msg
              );
            }
          });
          setLoading(false);
          // Don't block input for error messages
        },
        images
      );
    } catch (error) {
      setMessages(prev => {
        const assistantExists = prev.some(msg => msg.id === assistantMessageId);
        
        if (!assistantExists) {
          // Create error message if assistant message doesn't exist
          const errorMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: t('errors.generic'),
            timestamp: new Date().toISOString(),
            needsRating: false,
          };
          return [...prev, errorMessage];
        } else {
          // Update existing message with error
          return prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: t('errors.generic'),
                  needsRating: false
                }
              : msg
          );
        }
      });
      setLoading(false);
    }
  };


  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', // Full height minus app bar
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {isWindowDragging && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Typography variant="h4" color="white">
            Drop image here to upload
          </Typography>
        </Box>
      )}
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
              flexShrink: 0,
              flexWrap: { xs: 'wrap', md: 'nowrap' }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
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
              
              {/* LLM Selector */}
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                order: { xs: 3, md: 2 },
                width: { xs: '100%', md: 'auto' },
                mt: { xs: 1, md: 0 }
              }}>
                <LLMSelector
                  selectedLLMId={selectedLLMId}
                  onLLMChange={handleLLMChange}
                  size="small"
                  disabled={loading}
                  hasChatHistory={messages.length > 0}
                />
              </Box>

              <Tooltip title={t('profile.title')}>
                <IconButton
                  onClick={handleProfileClick}
                  size="small"
                  sx={{
                    color: 'primary.main',
                    order: { xs: 2, md: 3 },
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText'
                    }
                  }}
                >
                  <Person />
                </IconButton>
              </Tooltip>
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
                {t('rating.ratingPrompt')}
              </Alert>
            )}
            
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                loading={loading || waitingForRating}
                messageRatings={messageRatings}
                onRateMessage={handleMessageRating}
                ratingDisabled={false}
                supportsVision={getCurrentLLM()?.supportsVision || false}
              />
            </Box>
          </CardContent>
        </Card>
      </Container>

      <UserProfileForm
        open={showProfileForm}
        onClose={() => setShowProfileForm(false)}
        onSubmit={handleProfileSubmit}
        loading={profileLoading}
        initialData={userProfile ? {
          height: userProfile.height,
          weight: userProfile.weight,
          body_fat: userProfile.body_fat,
          lifestyle_habits: userProfile.lifestyle_habits
        } : undefined}
      />
    </Box>
  );
};