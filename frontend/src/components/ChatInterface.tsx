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
  IconButton,
  Tooltip,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from '@mui/material';
import { Send, PhotoCamera, Close } from '@mui/icons-material';
import { ChatMessage, MessageRating } from '../types';
import { MessageRatingComponent } from './MessageRating';
import { useTranslation } from '../hooks/useTranslation';
import { ImageModal } from './ImageModal';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, images?: string[]) => Promise<void>;
  loading?: boolean;
  // Rating functionality
  messageRatings?: Map<string, MessageRating>;
  onRateMessage?: (messageId: string, rating: 'like' | 'dislike', reason?: string) => Promise<void>;
  ratingDisabled?: boolean;
  // Vision support
  supportsVision?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  loading = false,
  messageRatings,
  onRateMessage,
  ratingDisabled = false,
  supportsVision = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [justDroppedFiles, setJustDroppedFiles] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState('');


  
  // Debug loading state
  console.log('ChatInterface loading state:', loading);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Drag and drop functionality
  useEffect(() => {
    // Prevent default browser behavior for all drag events
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Handle drag enter/over - show drag state
    const handleDragEnter = (e: DragEvent) => {
      preventDefaults(e);
      if (supportsVision) {
        setIsDragging(true);
      }
    };

    // Handle drag leave - only hide if truly leaving the window
    const handleDragLeave = (e: DragEvent) => {
      preventDefaults(e);
      // Only hide drag state if leaving the window entirely
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragging(false);
      }
    };

    // Handle drop - process files and reset state
    const handleDrop = (e: DragEvent) => {
      preventDefaults(e);
      setIsDragging(false);
      
      if (!supportsVision) return;
      
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      // Check if we have image files before processing
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      // Set flag to prevent immediate submission
      setJustDroppedFiles(true);
      
      // Process image files
      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const base64 = (event.target.result as string).split(',')[1];
            setSelectedImages(prev => [...prev, base64]);
          }
        };
        reader.readAsDataURL(file);
      });

      // Clear the flag after a short delay
      setTimeout(() => {
        setJustDroppedFiles(false);
      }, 100);
    };

    // Add event listeners to document
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', preventDefaults);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', preventDefaults);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [supportsVision]);

  // Image handling functions
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const base64 = (e.target.result as string).split(',')[1];
            setSelectedImages(prev => [...prev, base64]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleImagePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              const base64 = (e.target.result as string).split(',')[1];
              setSelectedImages(prev => [...prev, base64]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageClick = (imageSrc: string) => {
    setSelectedImageSrc(imageSrc);
    setImageModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Require either a text message or explicit user action (not just dropped images)
    if ((!inputMessage.trim() && selectedImages.length === 0) || loading || isDragging || justDroppedFiles) return;
    
    // Don't auto-send if there's no text message, even with images
    if (!inputMessage.trim() && selectedImages.length > 0) return;

    const message = inputMessage.trim();
    const images = selectedImages.length > 0 ? selectedImages : undefined;
    
    setInputMessage('');
    setSelectedImages([]);
    
    try {
      await onSendMessage(message, images);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Optionally restore the message and images
      setInputMessage(message);
      if (images) {
        setSelectedImages(images);
      }
    }
  };

  return (
    <Box 
      sx={{ 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        ...(isDragging && supportsVision && {
          '&::after': {
            content: '"Drop images here to upload"',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: 'primary.main',
            zIndex: 1000,
            pointerEvents: 'none',
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: 1
          }
        })
      }}
    >
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
              {t('chat.noMessages')}
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
                      {/* Display images if present */}
                      {message.images && message.images.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <ImageList 
                            cols={Math.min(message.images.length, 3)} 
                            gap={8}
                            sx={{ 
                              maxWidth: 400,
                              '& .MuiImageListItem-root': {
                                borderRadius: 1,
                                overflow: 'hidden'
                              }
                            }}
                          >
                            {message.images.map((image, imgIndex) => (
                              <ImageListItem key={imgIndex}>
                                <img
                                  src={/^https?:\/\//.test(image) ? image : `data:image/jpeg;base64,${image}`}
                                  alt={`Uploaded image ${imgIndex + 1}`}
                                  style={{
                                    height: 'auto',
                                    maxHeight: 200,
                                    maxWidth: '100%',
                                    objectFit: 'cover',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleImageClick(/^https?:\/\//.test(image) ? image : `data:image/jpeg;base64,${image}`)}
                                />
                              </ImageListItem>
                            ))}
                          </ImageList>
                        </Box>
                      )}
                      
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
                    {message.role === 'assistant' && messageRatings && onRateMessage && message.needsRating !== false && (
                      <Box sx={{ mt: 1, ml: message.role === 'assistant' ? 0 : 'auto' }}>
                        {message.id.startsWith('assistant-') ? (
                          <Typography variant="caption" color="text.secondary">
                            Processing response... (ID: {message.id})
                          </Typography>
                        ) : (
                          <>
                            <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                              Message ID: {message.id}
                            </Typography>
                            <MessageRatingComponent
                              messageId={message.id}
                              currentRating={messageRatings.get(message.id) || null}
                              onRate={onRateMessage}
                              disabled={ratingDisabled}
                            />
                          </>
                        )}
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
        onSubmit={(e) => {
          e.preventDefault();
          // Never auto-submit the form - only handle through button click
          return false;
        }}
        sx={{
          p: { xs: 1.5, sm: 2 },
          backgroundColor: 'rgba(99, 102, 241, 0.02)',
          borderRadius: theme.custom.borderRadius.medium,
          border: '1px solid rgba(99, 102, 241, 0.1)',
          flexShrink: 0
        }}
      >
        {/* Image Preview Area */}
        {selectedImages.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Selected Images:
            </Typography>
            <ImageList 
              cols={Math.min(selectedImages.length, isMobile ? 3 : 4)} 
              gap={8}
              sx={{ 
                maxHeight: 120,
                maxWidth: { xs: 280, sm: 400 },
                width: 'fit-content',
                '& .MuiImageListItem-root': {
                  borderRadius: 1,
                  overflow: 'hidden',
                  position: 'relative',
                  width: { xs: '70px !important', sm: '80px !important' },
                  height: { xs: '70px !important', sm: '80px !important' }
                }
              }}
            >
              {selectedImages.map((image, index) => (
                <ImageListItem key={index}>
                  <img
                    src={`data:image/jpeg;base64,${image}`}
                    alt={`Selected image ${index + 1}`}
                    style={{
                      width: isMobile ? '70px' : '80px',
                      height: isMobile ? '70px' : '80px',
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleImageClick(`data:image/jpeg;base64,${image}`)}
                  />
                  <ImageListItemBar
                    sx={{ background: 'rgba(0,0,0,0.5)' }}
                    actionIcon={
                      <IconButton
                        sx={{ color: 'white' }}
                        size="small"
                        onClick={() => removeImage(index)}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    }
                  />
                </ImageListItem>
              ))}
            </ImageList>
          </Box>
        )}

        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1, sm: 1.5 },
          alignItems: 'flex-end'
        }}>
          {/* Hidden file input */}
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImageSelect}
          />
          
          {/* Image upload button (only show if vision is supported) */}
          {supportsVision && (
            <Tooltip title="Upload Images">
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                sx={{
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.light', color: 'white' }
                }}
              >
                <PhotoCamera />
              </IconButton>
            </Tooltip>
          )}
          <TextField
            fullWidth
            multiline
            maxRows={isMobile ? 3 : 4}
            placeholder={loading ? t('chat.connecting') : `${t('chat.typeMessage')}${supportsVision ? ' or paste/drag images...' : ''}`}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onPaste={supportsVision ? handleImagePaste : undefined}
            disabled={loading || isDragging || justDroppedFiles}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: theme.custom.borderRadius.medium,
                backgroundColor: isDragging ? theme.palette.action.hover : 'white',
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
              if (e.key === 'Enter' && !e.shiftKey && inputMessage.trim() && !loading && !isDragging && !justDroppedFiles) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            variant="contained"
            onClick={(e) => handleSubmit(e)}
            disabled={!inputMessage.trim() || loading || isDragging || justDroppedFiles}
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
      
      {/* Image Modal */}
      <ImageModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageSrc={selectedImageSrc}
        alt="Image"
      />
    </Box>
  );
};
