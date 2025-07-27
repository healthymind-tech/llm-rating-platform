import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { Person, MonitorWeight, FitnessCenter, DirectionsRun } from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';

interface UserProfileFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (profileData: ProfileData) => Promise<void>;
  loading?: boolean;
  initialData?: Partial<ProfileData>;
}

export interface ProfileData {
  height: number;
  weight: number;
  body_fat?: number;
  lifestyle_habits: string;
}

export const UserProfileForm: React.FC<UserProfileFormProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialData
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ProfileData>({
    height: 0,
    weight: 0,
    body_fat: undefined,
    lifestyle_habits: ''
  });
  const [errors, setErrors] = useState<Partial<ProfileData>>({});
  const [submitError, setSubmitError] = useState('');

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        height: initialData.height || 0,
        weight: initialData.weight || 0,
        body_fat: initialData.body_fat || undefined,
        lifestyle_habits: initialData.lifestyle_habits || ''
      });
    } else {
      // Reset form for new users
      setFormData({
        height: 0,
        weight: 0,
        body_fat: undefined,
        lifestyle_habits: ''
      });
    }
    // Clear errors when form data resets
    setErrors({});
    setSubmitError('');
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileData> = {};

    if (!formData.height || formData.height <= 0 || formData.height > 300) {
      newErrors.height = 0;
    }

    if (!formData.weight || formData.weight <= 0 || formData.weight > 500) {
      newErrors.weight = 0;
    }

    if (formData.body_fat !== undefined && (formData.body_fat < 0 || formData.body_fat > 50)) {
      newErrors.body_fat = 0;
    }

    if (!formData.lifestyle_habits || formData.lifestyle_habits.trim().length === 0) {
      newErrors.lifestyle_habits = '';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        ...formData,
        lifestyle_habits: formData.lifestyle_habits.trim()
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('profile.updateError'));
    }
  };

  const handleInputChange = (field: keyof ProfileData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputValue = e.target.value;
    let value: any;
    
    if (field === 'lifestyle_habits') {
      value = inputValue;
    } else {
      // Handle numeric fields
      if (inputValue === '' || inputValue === null) {
        value = field === 'body_fat' ? undefined : 0;
      } else {
        const numValue = parseFloat(inputValue);
        value = isNaN(numValue) ? 0 : numValue;
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field] !== undefined) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={!loading ? onClose : undefined}
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Person color="primary" />
          <Typography variant="h6">
            {t('profile.title')}
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('profile.description')}
          </Typography>

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t('profile.height')}
              type="number"
              value={formData.height === 0 ? '' : formData.height}
              onChange={handleInputChange('height')}
              error={!!errors.height}
              helperText={errors.height !== undefined ? t('profile.heightError') : ''}
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">cm</InputAdornment>
              }}
              inputProps={{ min: 1, max: 300, step: 0.1 }}
            />

            <TextField
              label={t('profile.weight')}
              type="number"
              value={formData.weight === 0 ? '' : formData.weight}
              onChange={handleInputChange('weight')}
              error={!!errors.weight}
              helperText={errors.weight !== undefined ? t('profile.weightError') : ''}
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MonitorWeight />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">kg</InputAdornment>
              }}
              inputProps={{ min: 1, max: 500, step: 0.1 }}
            />

            <TextField
              label={t('profile.bodyFat')}
              type="number"
              value={formData.body_fat || ''}
              onChange={handleInputChange('body_fat')}
              error={!!errors.body_fat}
              helperText={errors.body_fat !== undefined ? t('profile.bodyFatError') : t('profile.bodyFatOptional')}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FitnessCenter />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">%</InputAdornment>
              }}
              inputProps={{ min: 0, max: 50, step: 0.1 }}
            />

            <TextField
              label={t('profile.lifestyleHabits')}
              multiline
              rows={3}
              value={formData.lifestyle_habits}
              onChange={handleInputChange('lifestyle_habits')}
              error={!!errors.lifestyle_habits}
              helperText={errors.lifestyle_habits !== undefined ? t('profile.lifestyleError') : t('profile.lifestyleExample')}
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DirectionsRun />
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={onClose} 
            disabled={loading}
            color="inherit"
          >
            {t('common.cancel')}
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};