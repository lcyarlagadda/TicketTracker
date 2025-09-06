// services/authService.ts
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import { User } from '../store/types/types';
import { store } from '../store';
import { setUser } from '../store/slices/authSlice';
import { boardService } from './boardService';

class AuthService {
  private unsubscribe: (() => void) | null = null;

  // Initialize auth state listener
  initializeAuthListener(): void {
    this.unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      const user: User | null = firebaseUser
        ? {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || undefined,
            emailVerified: firebaseUser.emailVerified,
          }
        : null;
      
      store.dispatch(setUser(user));
      
      // Grant pending board access when user logs in
      if (user) {
        try {
          await boardService.grantPendingAccessForUser(user.uid, user.email);
        } catch (error) {
          console.error('Error granting pending board access:', error);
        }
      }
    }, (error) => {
      console.error('Auth state change error:', error);
      // Set user to null and loading to false on error
      store.dispatch(setUser(null));
    });
  }

  // Clean up auth listener
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export const authService = new AuthService();