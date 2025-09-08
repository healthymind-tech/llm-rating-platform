import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Fade,
} from '@mui/material';
import { Psychology, Login } from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();
  useLanguage(); // This will monitor for language changes
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onLogin(email, password);
    } catch (err) {
      if (err instanceof Error) {
        // Map specific API error messages to translation keys
        if (err.message === 'Email and password are required') {
          setError(t('auth.emailRequired'));
        } else if (err.message === 'Invalid credentials') {
          setError(t('auth.invalidCredentials'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('auth.loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: theme.custom.gradients.background,
        p: { xs: 2, sm: 3 }
      }}
    >
      <Fade in timeout={600}>
        <Card sx={{ 
          maxWidth: { xs: '100%', sm: 420 }, 
          width: '100%',
          borderRadius: theme.custom.borderRadius.large,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <Box sx={{
            background: theme.custom.gradients.primary,
            p: { xs: 3, sm: 4 },
            textAlign: 'center',
            color: 'white'
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              backdropFilter: 'blur(10px)'
            }}>
              <Psychology sx={{ fontSize: '2.5rem', color: 'white' }} />
            </Box>
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                mb: 1
              }}
            >
              LLM Testing Platform
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              {t('auth.loginButton')}
            </Typography>
          </Box>
          
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            {error && (
              <Fade in>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: theme.custom.borderRadius.medium
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: theme.custom.borderRadius.medium
                  }
                }}
              />
              <TextField
                fullWidth
                label={t('auth.password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: theme.custom.borderRadius.medium
                  }
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                startIcon={loading ? undefined : <Login />}
                sx={{ 
                  mt: 3, 
                  mb: 2,
                  py: 1.5,
                  borderRadius: theme.custom.borderRadius.medium,
                  background: theme.custom.gradients.primary,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    background: theme.custom.gradients.primary,
                    transform: 'translateY(-1px)',
                    boxShadow: theme.custom.shadows.button
                  },
                  '&:disabled': {
                    background: 'rgba(99, 102, 241, 0.3)'
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : (
                  t('auth.loginButton')
                )}
              </Button>
            </Box>
            
            <Box sx={{ 
              mt: 3, 
              p: 2, 
              backgroundColor: 'rgba(99, 102, 241, 0.05)',
              borderRadius: theme.custom.borderRadius.medium,
              border: '1px solid rgba(99, 102, 241, 0.1)'
            }}>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '0.8rem'
                }}
              >
                Demo credentials: admin@example.com/admin or user@example.com/user
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Fade>
    </Box>
  );
};