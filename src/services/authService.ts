// services/authService.ts
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
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
      
      // Create or update user record in Firestore and grant pending board access
      if (user) {
        try {
          // Create or update user record in users collection
          await this.createOrUpdateUserRecord(user);
          
          // Grant pending board access when user logs in
          await boardService.grantPendingAccessForUser(user.uid, user.email);
        } catch (error) {
          // Error('Error setting up user:', error);
        }
      }
    }, (error) => {
      // Error('Auth state change error:', error);
      // Set user to null and loading to false on error
      store.dispatch(setUser(null));
    });
  }

  // Create or update user record in Firestore
  private async createOrUpdateUserRecord(user: User): Promise<void> {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new user record
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          emailVerified: user.emailVerified,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });
        // New user record created
      } else {
        // Update existing user record with last login time
        await setDoc(userRef, {
          ...userDoc.data(),
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
        // User record updated
      }
    } catch (error) {
      // Error('Error creating/updating user record:', error);
      throw error;
    }
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