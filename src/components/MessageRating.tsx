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
import { useTranslation } from '../hooks/useTranslation';


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
  const { t } = useTranslation();
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getPresetReasons = () => [
    t('rating.reasons.incorrect'),
    t('rating.reasons.irrelevant'),
    t('rating.reasons.unclear'),
    t('rating.reasons.incomplete'),
    t('rating.reasons.generic'),
    t('rating.reasons.inappropriate'),
    t('rating.reasons.other')
  ];

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
      const presetReasons = getPresetReasons();
      const presetMatch = presetReasons.find(preset => preset === existingReason);
      if (presetMatch) {
        setSelectedReason(presetMatch);
        setCustomReason('');
      } else if (existingReason) {
        setSelectedReason(t('rating.reasons.other'));
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
    
    if (selectedReason === t('rating.reasons.other')) {
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
    if (selectedReason === t('rating.reasons.other')) {
      return !customReason.trim() || submitting;
    }
    return !selectedReason || submitting;
  };

  return (
    <>
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {t('rating.like')} or {t('rating.dislike')}:
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
            {t('rating.like')}
          </Button>
          <Button
            variant={currentRating?.rating === 'dislike' ? 'contained' : 'outlined'}
            color="error"
            startIcon={currentRating?.rating === 'dislike' ? <ThumbDown /> : <ThumbDownOffAlt />}
            onClick={handleDislike}
            size="small"
            disabled={disabled}
          >
            {t('rating.dislike')}
          </Button>
          {currentRating && (
            <Chip 
              label={`${currentRating.rating === 'like' ? t('rating.like') : t('rating.dislike')}`}
              size="small"
              color={currentRating.rating === 'like' ? 'success' : 'error'}
              variant="outlined"
            />
          )}
        </Stack>
        {currentRating?.reason && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="textSecondary">
              {t('rating.reason')}: {currentRating.reason}
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
              {t('rating.reason')}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {t('rating.reasonRequired')}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 4, pb: 3 }}>
          <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
            <InputLabel id="reason-select-label">
{t('rating.reason')}
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
                <em>{t('rating.reasonRequired')}</em>
              </MenuItem>
              {getPresetReasons().map((reason, index) => (
                <MenuItem key={index} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Collapse in={selectedReason === t('rating.reasons.other')} timeout={300}>
            <Box>
              <TextField
                autoFocus={selectedReason === t('rating.reasons.other')}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                label={t('rating.reason')}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={t('rating.reasonPlaceholder')}
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
            {t('common.cancel')}
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
            {submitting ? t('common.loading') : t('common.submit')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};