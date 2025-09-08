import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box, 
  Typography 
} from '@mui/material';
import { ExitToApp, Warning } from '@mui/icons-material';
import { UserProfileForm, ProfileData } from './UserProfileForm';
import { userProfileAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';

interface ProfileCompletionCheckProps {
  children: React.ReactNode;
}

export const ProfileCompletionCheck: React.FC<ProfileCompletionCheckProps> = ({
  children
}) => {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialProfileData, setInitialProfileData] = useState<Partial<ProfileData>>({});
  const [isBodyInfoRequired, setIsBodyInfoRequired] = useState<boolean>(true);

  useEffect(() => {
    // Skip profile completion check for admin users
    if (user?.role === 'admin') {
      setIsProfileComplete(true);
      return;
    }
    
    checkProfileCompletion();
  }, [user]);

  const checkProfileCompletion = async () => {
    try {
      // First check if body info is required
      const bodyInfoResponse = await userProfileAPI.isBodyInfoRequired();
      setIsBodyInfoRequired(bodyInfoResponse.required);
      
      // If body info is not required, profile is automatically complete
      if (!bodyInfoResponse.required) {
        setIsProfileComplete(true);
        return;
      }
      
      // Otherwise check actual completion status
      const completionResponse = await userProfileAPI.checkProfileCompletion();
      const isComplete = completionResponse.completed;
      setIsProfileComplete(isComplete);
      
      if (!isComplete) {
        // Try to get existing profile data
        try {
          const profileResponse = await userProfileAPI.getUserProfile();
          setInitialProfileData({
            height: profileResponse.height || undefined,
            weight: profileResponse.weight || undefined,
            body_fat: profileResponse.body_fat || undefined,
            lifestyle_habits: profileResponse.lifestyle_habits || '',
            include_body_in_prompts: profileResponse.include_body_in_prompts !== undefined ? profileResponse.include_body_in_prompts : true
          });
        } catch (error) {
          // Profile doesn't exist yet, use empty data
          setInitialProfileData({});
        }
        setShowProfileForm(true);
      }
    } catch (error) {
      console.error('Failed to check profile completion:', error);
      // Assume profile is incomplete to be safe
      setIsProfileComplete(false);
      setShowProfileForm(true);
    }
  };

  const handleProfileSubmit = async (profileData: ProfileData) => {
    setLoading(true);
    try {
      await userProfileAPI.updateUserProfile(profileData);
      setIsProfileComplete(true);
      setShowProfileForm(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClose = () => {
    // Don't allow closing if profile is not complete - show logout confirmation instead
    if (!isProfileComplete) {
      setShowLogoutConfirm(true);
    } else {
      setShowProfileForm(false);
    }
  };

  const handleLogoutConfirm = () => {
    logout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  // Still loading profile completion status
  if (isProfileComplete === null) {
    return null;
  }

  return (
    <>
      {children}
      <UserProfileForm
        open={showProfileForm}
        onClose={handleProfileClose}
        onSubmit={handleProfileSubmit}
        loading={loading}
        initialData={initialProfileData}
      />
      
      {/* Logout confirmation dialog */}
      <Dialog
        open={showLogoutConfirm}
        onClose={handleLogoutCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Warning color="warning" />
            <Typography variant="h6">
              {t('profile.incompleteLogoutTitle')}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {t('profile.incompleteLogoutMessage')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('profile.incompleteLogoutWarning')}
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleLogoutCancel}
            variant="outlined"
            color="primary"
          >
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleLogoutConfirm}
            variant="contained"
            color="warning"
            startIcon={<ExitToApp />}
          >
            {t('auth.logout')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};