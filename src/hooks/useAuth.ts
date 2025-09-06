// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useAppSelector } from './redux';
import { authService } from '../services/authService';

export const useAuth = () => {
  const { user, loading } = useAppSelector(state => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = () => {
      authService.initializeAuthListener();
      // Mark as initialized after a short delay to ensure Firebase has time to check auth state
      const timer = setTimeout(() => {
        setIsInitialized(true);
      }, 100);
      
      return () => clearTimeout(timer);
    };

    const cleanup = initializeAuth();
    
    return () => {
      if (cleanup) cleanup();
      authService.cleanup();
    };
  }, []);

  return {
    user,
    loading: loading || !isInitialized,
    isAuthenticated: !!user,
    isInitialized
  };
};
