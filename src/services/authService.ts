// services/authService.ts
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import { User } from '../store/types/types';
import { store } from '../store';
import { setUser } from '../store/slices/authSlice';

class AuthService {
  private unsubscribe: (() => void) | null = null;

  // Initialize auth state listener
  initializeAuthListener(): void {
    this.unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      const user: User | null = firebaseUser
        ? {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || undefined,
          }
        : null;
      
      store.dispatch(setUser(user));
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