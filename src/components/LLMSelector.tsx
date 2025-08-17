import React, { useState, useEffect } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { Tune, Star } from '@mui/icons-material';
import { LLMConfig } from '../types';
import { configAPI, userProfileAPI } from '../services/api';

interface LLMSelectorProps {
  selectedLLMId?: string | null;
  onLLMChange?: (llmId: string | null) => void;
  size?: 'small' | 'medium';
  disabled?: boolean;
}

export const LLMSelector: React.FC<LLMSelectorProps> = ({
  selectedLLMId,
  onLLMChange,
  size = 'small',
  disabled = false,
}) => {
  const [enabledLLMs, setEnabledLLMs] = useState<LLMConfig[]>([]);
  const [userPreference, setUserPreference] = useState<string | null>(null);
  const [currentSelection, setCurrentSelection] = useState<string | null>(selectedLLMId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentSelection(selectedLLMId || null);
  }, [selectedLLMId]);

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
      
      // Set initial selection based on user preference or provided selectedLLMId
      if (!selectedLLMId) {
        setCurrentSelection(preferenceResponse.preferred_llm_id);
      }
    } catch (error: any) {
      console.error('Failed to load LLM data:', error);
      setError('Failed to load LLM configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (llmId: string | null) => {
    setCurrentSelection(llmId);
    
    // Save user preference
    try {
      await userProfileAPI.updateLLMPreference(llmId);
      setUserPreference(llmId);
    } catch (error) {
      console.error('Failed to save LLM preference:', error);
    }
    
    // Notify parent component
    if (onLLMChange) {
      onLLMChange(llmId);
    }
  };

  const getDefaultLLM = () => {
    return enabledLLMs.find(llm => llm.isDefault);
  };

  const getCurrentLLM = () => {
    if (currentSelection) {
      return enabledLLMs.find(llm => llm.id === currentSelection);
    }
    return getDefaultLLM();
  };

  const getDisplayName = () => {
    const currentLLM = getCurrentLLM();
    if (currentLLM) {
      return currentLLM.name;
    }
    return 'Default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Loading LLMs...
        </Typography>
      </Box>
    );
  }

  if (error || enabledLLMs.length === 0) {
    return (
      <Tooltip title={error || "No LLMs available"}>
        <Chip
          icon={<Tune />}
          label="No LLMs"
          size={size}
          variant="outlined"
          color="error"
        />
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tune sx={{ fontSize: '1rem', color: 'text.secondary' }} />
      <FormControl size={size} sx={{ minWidth: 140 }}>
        <Select
          value={currentSelection || ''}
          onChange={(e) => handleChange(e.target.value || null)}
          disabled={disabled}
          displayEmpty
          variant="outlined"
          sx={{
            fontSize: size === 'small' ? '0.875rem' : '1rem',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 0, 0, 0.12)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
          }}
        >
          <MenuItem value="">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Star sx={{ color: 'gold', fontSize: '0.875rem' }} />
              <Typography variant="inherit">System Default</Typography>
            </Box>
          </MenuItem>
          {enabledLLMs.map((llm) => (
            <MenuItem key={llm.id} value={llm.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="inherit" sx={{ flexGrow: 1 }}>
                  {llm.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Chip 
                    label={llm.type} 
                    size="small" 
                    variant="outlined"
                    sx={{ fontSize: '0.6rem', height: '16px' }}
                  />
                  {llm.isDefault && (
                    <Chip 
                      label="Default" 
                      size="small" 
                      color="primary"
                      sx={{ fontSize: '0.6rem', height: '16px' }}
                    />
                  )}
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {/* Current selection info */}
      <Tooltip title={`Model: ${getCurrentLLM()?.model || 'Default model'}`}>
        <Chip
          label={getDisplayName()}
          size={size}
          color="primary"
          variant="outlined"
          sx={{
            fontSize: size === 'small' ? '0.75rem' : '0.875rem',
            maxWidth: 120,
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }
          }}
        />
      </Tooltip>
    </Box>
  );
};