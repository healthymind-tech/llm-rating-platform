import React, { useState, useEffect } from 'react';
import { UserProfileForm, ProfileData } from './UserProfileForm';
import { userProfileAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface ProfileCompletionCheckProps {
  children: React.ReactNode;
}

export const ProfileCompletionCheck: React.FC<ProfileCompletionCheckProps> = ({
  children
}) => {
  const { user } = useAuthStore();
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialProfileData, setInitialProfileData] = useState<Partial<ProfileData>>({});

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
            lifestyle_habits: profileResponse.lifestyle_habits || ''
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
    // Don't allow closing if profile is not complete
    if (isProfileComplete) {
      setShowProfileForm(false);
    }
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
    </>
  );
};