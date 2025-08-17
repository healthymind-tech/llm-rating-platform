import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import { Tune, Star, CheckCircle } from '@mui/icons-material';
import { LLMConfig } from '../types';
import { configAPI, userProfileAPI } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

interface LLMPreferencesProps {
  open: boolean;
  onClose: () => void;
}

export const LLMPreferences: React.FC<LLMPreferencesProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [enabledLLMs, setEnabledLLMs] = useState<LLMConfig[]>([]);
  const [userPreference, setUserPreference] = useState<string | null>(null);
  const [selectedLLM, setSelectedLLM] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [llmsResponse, preferenceResponse] = await Promise.all([
        configAPI.getEnabledConfigs(),
        userProfileAPI.getLLMPreference(),
      ]);
      
      setEnabledLLMs(llmsResponse);
      setUserPreference(preferenceResponse.preferred_llm_id);
      setSelectedLLM(preferenceResponse.preferred_llm_id);
    } catch (error: any) {
      console.error('Failed to load LLM preferences:', error);
      setError(error.message || 'Failed to load LLM preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await userProfileAPI.updateLLMPreference(selectedLLM);
      setUserPreference(selectedLLM);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Failed to save LLM preference:', error);
      setError(error.message || 'Failed to save LLM preference');
    } finally {
      setSaving(false);
    }
  };

  const getDefaultLLM = () => {
    return enabledLLMs.find(llm => llm.isDefault);
  };

  const getCurrentLLM = () => {
    if (selectedLLM) {
      return enabledLLMs.find(llm => llm.id === selectedLLM);
    }
    return getDefaultLLM();
  };

  const hasChanges = userPreference !== selectedLLM;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tune sx={{ color: 'primary.main' }} />
          <Typography variant="h6" component="span">
            LLM Preferences
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose your preferred AI model for conversations. If no preference is set, 
              the system default will be used.
            </Typography>

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle fontSize="small" />
                  Preference saved successfully!
                </Box>
              </Alert>
            )}

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Preferred LLM</InputLabel>
              <Select
                value={selectedLLM || ''}
                onChange={(e) => setSelectedLLM(e.target.value || null)}
                label="Preferred LLM"
              >
                <MenuItem value="">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Star sx={{ color: 'gold', fontSize: '1rem' }} />
                    Use System Default
                  </Box>
                </MenuItem>
                {enabledLLMs.map((llm) => (
                  <MenuItem key={llm.id} value={llm.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <span>{llm.name}</span>
                      <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                        <Chip 
                          label={llm.type} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: '20px' }}
                        />
                        {llm.isDefault && (
                          <Chip 
                            label="Default" 
                            size="small" 
                            color="primary"
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        )}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Current Selection Info */}
            {getCurrentLLM() && (
              <Card sx={{ bgcolor: 'grey.50', mb: 2 }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Selection:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body1" fontWeight={600}>
                      {getCurrentLLM()?.name}
                    </Typography>
                    <Chip 
                      label={getCurrentLLM()?.type} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                    {getCurrentLLM()?.isDefault && (
                      <Chip 
                        label="System Default" 
                        size="small" 
                        color="success"
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Model: {getCurrentLLM()?.model}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {enabledLLMs.length === 0 && (
              <Alert severity="warning">
                No LLM configurations are currently enabled. Please contact an administrator.
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving || !hasChanges || enabledLLMs.length === 0}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? 'Saving...' : 'Save Preference'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};