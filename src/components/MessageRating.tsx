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
} from '@mui/material';
import { ThumbUp, ThumbDown, ThumbUpOffAlt, ThumbDownOffAlt } from '@mui/icons-material';
import { MessageRating } from '../types';

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
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
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
      setReason(currentRating?.reason || '');
      setReasonDialogOpen(true);
    }
  };

  const handleSubmitDislike = async () => {
    if (!reason.trim()) return;
    
    setSubmitting(true);
    try {
      await onRate(messageId, 'dislike', reason.trim());
      setReasonDialogOpen(false);
      setReason('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setReasonDialogOpen(false);
    setReason('');
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Why wasn't this response helpful?</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Please explain what was wrong with this response"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., The information was incorrect, not relevant, or unclear..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitDislike}
            variant="contained"
            color="error"
            disabled={!reason.trim() || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};