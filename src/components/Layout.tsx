import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Avatar,
  Chip,
} from '@mui/material';
import { ExitToApp, Psychology } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  useLanguage(); // This will monitor for language changes
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  return (
    <Box sx={{ 
      flexGrow: 1,
      minHeight: '100vh',
      backgroundColor: 'background.default'
    }}>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{
          background: theme.custom.gradients.primary,
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 2,
            flexGrow: 1
          }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <Psychology sx={{ color: 'white', fontSize: '1.5rem' }} />
            </Box>
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              component="div" 
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(45deg, #ffffff 30%, rgba(255,255,255,0.8) 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {isMobile ? "LLM Platform" : "LLM Testing Platform"}
            </Typography>
          </Box>
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
              {!isMobile && (
                <Chip
                  label={`${user.username} • ${user.role}`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontWeight: 500,
                    '& .MuiChip-label': {
                      fontSize: '0.85rem'
                    }
                  }}
                />
              )}
              <IconButton
                size={isMobile ? "medium" : "large"}
                onClick={handleMenu}
                sx={{
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)'
                  }
                }}
              >
                <Avatar sx={{ 
                  width: isMobile ? 32 : 36, 
                  height: isMobile ? 32 : 36,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}>
                  {user.username.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                  sx: {
                    mt: 1,
                    borderRadius: theme.custom.borderRadius.medium,
                    boxShadow: theme.custom.shadows.card,
                    minWidth: 200
                  }
                }}
              >
                {isMobile && (
                  <MenuItem disabled>
                    <Box sx={{ py: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {user.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.role}
                      </Typography>
                    </Box>
                  </MenuItem>
                )}
                <MenuItem 
                  onClick={handleLogout}
                  sx={{
                    color: 'error.main',
                    '&:hover': {
                      backgroundColor: 'error.light',
                      color: 'error.contrastText'
                    }
                  }}
                >
                  <ExitToApp sx={{ mr: 2 }} />
                  {t('auth.logout')}
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      <Box sx={{ 
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: 'background.default'
      }}>
        {children}
      </Box>
    </Box>
  );
};