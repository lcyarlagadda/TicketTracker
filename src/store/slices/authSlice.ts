// store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  OAuthProvider,
  GithubAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  reload
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { User, AuthState } from '../types/types';

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

// Async thunks for auth operations
export const signInUser = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Check if email is verified
    if (!userCredential.user.emailVerified) {
      throw new Error('Please verify your email before signing in. Check your inbox for a verification link.');
    }
    
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email!,
      displayName: userCredential.user.displayName,
      emailVerified: userCredential.user.emailVerified,
    };
  }
);

export const signUpUser = createAsyncThunk(
  'auth/signUp',
  async ({ email, password, name }: { email: string; password: string; name: string }) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    
    // Send email verification
    await sendEmailVerification(userCredential.user);
    
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email!,
      displayName: name,
      emailVerified: userCredential.user.emailVerified,
    };
  }
);

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async () => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email!,
      displayName: userCredential.user.displayName,
      emailVerified: userCredential.user.emailVerified,
    };
  }
);

export const signInWithMicrosoft = createAsyncThunk(
  'auth/signInWithMicrosoft',
  async () => {
    const provider = new OAuthProvider('microsoft.com');
    const result = await signInWithPopup(auth, provider);
    return {
      uid: result.user.uid,
      email: result.user.email!,
      displayName: result.user.displayName,
      emailVerified: result.user.emailVerified,
    };
  }
);

export const signInWithGitHub = createAsyncThunk(
  'auth/signInWithGitHub',
  async () => {
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return {
      uid: result.user.uid,
      email: result.user.email!,
      displayName: result.user.displayName,
      emailVerified: result.user.emailVerified,
    };
  }
);

export const sendVerificationEmail = createAsyncThunk(
  'auth/sendVerificationEmail',
  async () => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user found');
    }
    
    await sendEmailVerification(user);
    return { message: 'Verification email sent successfully' };
  }
);

export const checkEmailVerification = createAsyncThunk(
  'auth/checkEmailVerification',
  async () => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user found');
    }
    
    await reload(user);
    
    if (user.emailVerified) {
      return {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      };
    } else {
      throw new Error('Email not yet verified');
    }
  }
);

export const sendPasswordResetEmailThunk = createAsyncThunk(
  'auth/sendPasswordResetEmail',
  async ({ email }: { email: string }) => {
    await sendPasswordResetEmail(auth, email);
    return { message: 'Password reset email sent successfully' };
  }
);

export const verifyPasswordResetCodeThunk = createAsyncThunk(
  'auth/verifyPasswordResetCode',
  async ({ code }: { code: string }) => {
    const email = await verifyPasswordResetCode(auth, code);
    return { email, message: 'Reset code verified successfully' };
  }
);

export const confirmPasswordResetThunk = createAsyncThunk(
  'auth/confirmPasswordReset',
  async ({ code, newPassword }: { code: string; newPassword: string }) => {
    await confirmPasswordReset(auth, code, newPassword);
    return { message: 'Password reset successfully' };
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await firebaseSignOut(auth);
});

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Sign In
      .addCase(signInUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signInUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(signInUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Sign in failed';
      })
      
      // Sign Up
      .addCase(signUpUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signUpUser.fulfilled, (state, action) => {
        state.loading = false;
        // Don't set user until email is verified
        state.user = null;
        state.error = null;
      })
      .addCase(signUpUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Sign up failed';
      })
      
      // Google Sign In
      .addCase(signInWithGoogle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Google sign in failed';
      })
      
      // GitHub Sign In
      .addCase(signInWithGitHub.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signInWithGitHub.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(signInWithGitHub.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'GitHub sign in failed';
      })
      
      // Send Verification Email
      .addCase(sendVerificationEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendVerificationEmail.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(sendVerificationEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to send verification email';
      })
      
      // Check Email Verification
      .addCase(checkEmailVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkEmailVerification.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(checkEmailVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Email verification check failed';
      })
      
      // Send Password Reset Email
      .addCase(sendPasswordResetEmailThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendPasswordResetEmailThunk.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(sendPasswordResetEmailThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to send password reset email';
      })
      
      // Verify Password Reset Code
      .addCase(verifyPasswordResetCodeThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyPasswordResetCodeThunk.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(verifyPasswordResetCodeThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Invalid or expired reset code';
      })
      
      // Confirm Password Reset
      .addCase(confirmPasswordResetThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmPasswordResetThunk.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(confirmPasswordResetThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to reset password';
      })
      
      // Sign Out
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { setUser, setLoading, clearError } = authSlice.actions;