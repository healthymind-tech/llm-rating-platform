import React, { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  useTheme,
} from '@mui/material';
import { ThumbUp, ThumbDown, ThumbUpOffAlt, ThumbDownOffAlt, Report } from '@mui/icons-material';
import { MessageRating } from '../types';

const PRESET_REASONS = [
  'The response was incorrect or contained false information',
  'The response was not relevant to my question',
  'The response was unclear or confusing',
  'The response was incomplete or missing important details',
  'The response was too generic or not specific enough',
  'The response was inappropriate or offensive',
  'Other (specify below)'
];

interface MessageRatingProps {
  messageId: string;
  currentRating: MessageRating | null;
  onRate: (messageId: string, rating: 'like' | 'dislike', reason?: string) => Promise<void>;
  disabled?: boolean;
}

export const MessageRatingComponent: React.FC<MessageRatingProps> = ({
  messageId,
  currentRating,
  onRate,
  disabled = false,
}) => {
  const theme = useTheme();
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLike = async () => {
    if (disabled) return;
    
    if (currentRating?.rating === 'like') {
      // Remove rating if clicking the same one
      await onRate(messageId, 'like'); // This will be handled by parent to remove rating
    } else {
      await onRate(messageId, 'like');
    }
  };

  const handleDislike = () => {
    if (disabled) return;
    
    if (currentRating?.rating === 'dislike') {
      // Remove rating if clicking the same one
      onRate(messageId, 'dislike'); // This will be handled by parent to remove rating
    } else {
      // Open reason dialog for new dislike
      const existingReason = currentRating?.reason || '';
      
      // Check if existing reason matches a preset
      const presetMatch = PRESET_REASONS.find(preset => preset === existingReason);
      if (presetMatch) {
        setSelectedReason(presetMatch);
        setCustomReason('');
      } else if (existingReason) {
        setSelectedReason('Other (specify below)');
        setCustomReason(existingReason);
      } else {
        setSelectedReason('');
        setCustomReason('');
      }
      
      setReasonDialogOpen(true);
    }
  };

  const handleSubmitDislike = async () => {
    let finalReason = '';
    
    if (selectedReason === 'Other (specify below)') {
      finalReason = customReason.trim();
    } else {
      finalReason = selectedReason;
    }
    
    if (!finalReason) return;
    
    setSubmitting(true);
    try {
      await onRate(messageId, 'dislike', finalReason);
      setReasonDialogOpen(false);
      setSelectedReason('');
      setCustomReason('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setReasonDialogOpen(false);
    setSelectedReason('');
    setCustomReason('');
  };

  const isSubmitDisabled = () => {
    if (selectedReason === 'Other (specify below)') {
      return !customReason.trim() || submitting;
    }
    return !selectedReason || submitting;
  };

  return (
    <>
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Rate this response:
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant={currentRating?.rating === 'like' ? 'contained' : 'outlined'}
            color="success"
            startIcon={currentRating?.rating === 'like' ? <ThumbUp /> : <ThumbUpOffAlt />}
            onClick={handleLike}
            size="small"
            disabled={disabled}
          >
            Helpful
          </Button>
          <Button
            variant={currentRating?.rating === 'dislike' ? 'contained' : 'outlined'}
            color="error"
            startIcon={currentRating?.rating === 'dislike' ? <ThumbDown /> : <ThumbDownOffAlt />}
            onClick={handleDislike}
            size="small"
            disabled={disabled}
          >
            Not Helpful
          </Button>
          {currentRating && (
            <Chip 
              label={`Rated ${currentRating.rating === 'like' ? 'helpful' : 'not helpful'}`}
              size="small"
              color={currentRating.rating === 'like' ? 'success' : 'error'}
              variant="outlined"
            />
          )}
        </Stack>
        {currentRating?.reason && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Reason: {currentRating.reason}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Reason Dialog for Dislike */}
      <Dialog 
        open={reasonDialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: theme.custom?.borderRadius?.large || 2,
            boxShadow: theme.custom?.shadows?.card || '0 4px 6px rgba(0, 0, 0, 0.1)'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          pb: 2
        }}>
          <Report />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Why wasn't this response helpful?
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Please help us improve by selecting a reason
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 4, pb: 3 }}>
          <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
            <InputLabel id="reason-select-label">
              Select the issue with this response
            </InputLabel>
            <Select
              labelId="reason-select-label"
              value={selectedReason}
              label="Select the issue with this response"
              onChange={(e) => setSelectedReason(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: theme.custom?.borderRadius?.medium || 1,
                }
              }}
            >
              <MenuItem value="">
                <em>Choose a reason...</em>
              </MenuItem>
              {PRESET_REASONS.map((reason, index) => (
                <MenuItem key={index} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Collapse in={selectedReason === 'Other (specify below)'} timeout={300}>
            <Box>
              <TextField
                autoFocus={selectedReason === 'Other (specify below)'}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                label="Please describe the specific issue"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please be specific about what was wrong with the response..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: theme.custom?.borderRadius?.medium || 1,
                  }
                }}
              />
            </Box>
          </Collapse>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={handleCloseDialog} 
            disabled={submitting}
            sx={{ 
              borderRadius: theme.custom?.borderRadius?.medium || 1,
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitDislike}
            variant="contained"
            color="error"
            disabled={isSubmitDisabled()}
            sx={{ 
              borderRadius: theme.custom?.borderRadius?.medium || 1,
              px: 3,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              }
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};