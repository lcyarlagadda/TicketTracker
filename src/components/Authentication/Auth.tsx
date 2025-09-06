// components/Authentication/Auth.tsx
import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Shield, 
  CheckCircle,
  LogOut,
  ArrowLeft,
  Send,
  KeyRound
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { 
  signInUser, 
  signUpUser, 
  signInWithGoogle, 
  signInWithGitHub,
  signOut as signOutUser,
  clearError,
  sendVerificationEmail,
  checkEmailVerification,
  sendPasswordResetEmailThunk,
  confirmPasswordResetThunk
} from '../../store/slices/authSlice';
import ErrorModal from '../Atoms/ErrorModal';
import SuccessModal from '../Atoms/SuccessModal';

type AuthView = 'signin' | 'signup' | 'forgot' | 'reset' | 'verify';

interface FormData {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  resetCode: string;
}

const Auth: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, loading, error } = useAppSelector(state => state.auth);
  const navigate = useNavigate();

  const [view, setView] = useState<AuthView>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    resetCode: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) dispatch(clearError());
  };

  const getFriendlyError = (errorMessage: string): string => {
    if (errorMessage.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (errorMessage.includes('email-already-in-use')) {
      return 'This email is already registered.';
    }
    if (errorMessage.includes('weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    if (errorMessage.includes('wrong-password')) {
      return 'Incorrect password.';
    }
    if (errorMessage.includes('user-not-found')) {
      return 'No account found with this email.';
    }
    if (errorMessage.includes('invalid-credential')) {
      return 'Invalid login credentials.';
    }
    if (errorMessage.includes('too-many-requests')) {
      return 'Too many failed attempts. Please try again later.';
    }
    return errorMessage || 'An unexpected error occurred. Please try again.';
  };

  const signUp = async () => {
    const { name, phone, email, password, confirmPassword } = form;
    
    if (!name || !phone || !email || !password || !confirmPassword) {
      dispatch({ type: 'auth/signUp/rejected', error: { message: 'Please fill in all fields' } });
      return;
    }

    if (password !== confirmPassword) {
      dispatch({ type: 'auth/signUp/rejected', error: { message: 'Passwords do not match' } });
      return;
    }

    if (password.length < 6) {
      dispatch({ type: 'auth/signUp/rejected', error: { message: 'Password must be at least 6 characters' } });
      return;
    }

    try {
      await dispatch(signUpUser({ email, password, name })).unwrap();
      setSuccessMessage(`Verification email sent to ${email}. Please check your inbox and spam folder.`);
      setView('verify');
    } catch (err: any) {
      console.error('Sign up error:', err);
    }
  };

  const logIn = async () => {
    if (!form.email || !form.password) {
      dispatch({ type: 'auth/signIn/rejected', error: { message: 'Please enter both email and password' } });
      return;
    }

    try {
      await dispatch(signInUser({ email: form.email, password: form.password })).unwrap();
      navigate('/boards');
    } catch (err: any) {
      console.error('Sign in error:', err);
    }
  };

  const googleSignIn = async () => {
    try {
      await dispatch(signInWithGoogle()).unwrap();
      navigate('/boards');
    } catch (err: any) {
      console.error('Google sign in error:', err);
    }
  };

  const githubSignIn = async () => {
    try {
      await dispatch(signInWithGitHub()).unwrap();
      navigate('/boards');
    } catch (err: any) {
      console.error('GitHub sign in error:', err);
    }
  };

  const sendResetEmail = async () => {
    if (!form.email) {
      dispatch({ type: 'auth/sendPasswordResetEmail/rejected', error: { message: 'Please enter your email' } });
      return;
    }
    
    try {
      await dispatch(sendPasswordResetEmailThunk({ email: form.email })).unwrap();
      setSuccessMessage(`Password reset email sent to ${form.email}. Please check your inbox and spam folder.`);
      setView('reset');
    } catch (err: any) {
      console.error('Reset email error:', err);
    }
  };

  const resetPassword = async () => {
    if (!form.resetCode || !form.password || !form.confirmPassword) {
      dispatch({ type: 'auth/confirmPasswordReset/rejected', error: { message: 'Please fill in all fields' } });
      return;
    }

    if (form.password !== form.confirmPassword) {
      dispatch({ type: 'auth/confirmPasswordReset/rejected', error: { message: 'Passwords do not match' } });
      return;
    }

    if (form.password.length < 6) {
      dispatch({ type: 'auth/confirmPasswordReset/rejected', error: { message: 'Password must be at least 6 characters' } });
      return;
    }

    try {
      await dispatch(confirmPasswordResetThunk({ code: form.resetCode, newPassword: form.password })).unwrap();
      setView('signin');
      setForm({ ...form, password: '', confirmPassword: '', resetCode: '' });
    } catch (err: any) {
      console.error('Reset password error:', err);
    }
  };

  const resendVerification = async () => {
    try {
      await dispatch(sendVerificationEmail()).unwrap();
      setSuccessMessage(`Verification email resent to ${form.email}. Please check your inbox and spam folder.`);
    } catch (err: any) {
      console.error('Resend verification error:', err);
    }
  };

  const checkVerification = async () => {
    try {
      await dispatch(checkEmailVerification()).unwrap();
      navigate('/boards');
    } catch (err: any) {
      console.error('Check verification error:', err);
    }
  };

  const logOut = async () => {
    try {
      await dispatch(signOutUser()).unwrap();
      navigate('/');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      resetCode: ''
    });
    if (error) dispatch(clearError());
    if (successMessage) setSuccessMessage('');
  };

  // If user is logged in, show success state
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-sm">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Welcome!</h2>
            <p className="text-gray-600 text-sm mb-4">You're logged in as:</p>
            <p className="font-medium text-gray-800">{user.displayName || user.email}</p>
            <p className="text-sm text-gray-500 mb-6">{user.email}</p>
            
            <button
              onClick={logOut}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getViewConfig = () => {
    switch (view) {
      case 'signin':
        return {
          title: 'Welcome Back',
          subtitle: 'Sign in to your account',
          icon: <Shield className="w-6 h-6 text-white" />
        };
      case 'signup':
        return {
          title: 'Create Account',
          subtitle: 'Join Ticket Tracker today',
          icon: <User className="w-6 h-6 text-white" />
        };
      case 'forgot':
        return {
          title: 'Reset Password',
          subtitle: 'Enter your email to reset',
          icon: <Mail className="w-6 h-6 text-white" />
        };
      case 'reset':
        return {
          title: 'Enter Reset Code',
          subtitle: 'Check your email for the code',
          icon: <KeyRound className="w-6 h-6 text-white" />
        };
      case 'verify':
        return {
          title: 'Check Your Email',
          subtitle: 'Verify your account to continue',
          icon: <Send className="w-6 h-6 text-white" />
        };
    }
  };

  const config = getViewConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            {config.icon}
          </div>
          <h1 className="text-xl font-bold text-white mb-1">{config.title}</h1>
          <p className="text-blue-100 text-sm">{config.subtitle}</p>
        </div>

        <div className="p-6">
          {/* Back button for secondary views */}
          {view !== 'signin' && view !== 'signup' && (
            <button
              onClick={() => {
                setView('signin');
                resetForm();
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 text-sm"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </button>
          )}

          {/* Sign In View */}
          {view === 'signin' && (
            <>
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                icon={<Mail size={18} />}
                placeholder="you@example.com"
              />
              
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                icon={<Lock size={18} />}
                placeholder="Enter password"
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />

              <button
                onClick={() => setView('forgot')}
                className="text-sm text-blue-600 hover:text-blue-700 mb-4 text-right w-full"
              >
                Forgot password?
              </button>

              <Button onClick={logIn} loading={loading} variant="primary">
                Sign In
              </Button>

              <div className="my-4 flex items-center">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="px-3 text-sm text-gray-500">or</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              <Button onClick={googleSignIn} loading={loading} variant="outline" className="mb-3">
                Continue with Google
              </Button>

              <Button onClick={githubSignIn} loading={loading} variant="outline" className="mb-4">
                Continue with GitHub
              </Button>

              <p className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setView('signup');
                    resetForm();
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign up
                </button>
              </p>
            </>
          )}

          {/* Sign Up View */}
          {view === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Input
                  label="Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John"
                  compact
                />
                <Input
                  label="Phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  compact
                />
              </div>

              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                icon={<Mail size={18} />}
                placeholder="you@example.com"
              />

              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                icon={<Lock size={18} />}
                placeholder="Create password"
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />

              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                icon={<Lock size={18} />}
                placeholder="Confirm password"
              />

              <Button onClick={signUp} loading={loading} variant="primary">
                Create Account
              </Button>

              <p className="text-center text-sm text-gray-600 mt-4">
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setView('signin');
                    resetForm();
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign in
                </button>
              </p>
            </>
          )}

          {/* Forgot Password View */}
          {view === 'forgot' && (
            <>
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                icon={<Mail size={18} />}
                placeholder="Enter your email"
              />

              <Button onClick={sendResetEmail} loading={loading} variant="primary">
                Send Reset Email
              </Button>
            </>
          )}

          {/* Reset Password View */}
          {view === 'reset' && (
            <>
              <Input
                label="Reset Code"
                name="resetCode"
                value={form.resetCode}
                onChange={handleChange}
                icon={<KeyRound size={18} />}
                placeholder="Enter 6-digit code"
              />

              <Input
                label="New Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                icon={<Lock size={18} />}
                placeholder="New password"
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />

              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                icon={<Lock size={18} />}
                placeholder="Confirm new password"
              />

              <Button onClick={resetPassword} loading={loading} variant="primary">
                Reset Password
              </Button>
            </>
          )}

          {/* Email Verification View */}
          {view === 'verify' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              
              <h3 className="font-medium text-gray-800 mb-2">Check your email</h3>
              <p className="text-sm text-gray-600 mb-6">
                We sent a verification link to<br />
                <span className="font-medium">{form.email}</span>
              </p>

              <Button onClick={checkVerification} loading={loading} variant="primary" className="mb-3">
                I've verified my email
              </Button>

              <Button onClick={resendVerification} loading={loading} variant="outline" className="mb-4">
                Resend Email
              </Button>

              <p className="text-sm text-gray-600">
                Wrong email?{' '}
                <button
                  onClick={() => {
                    setView('signup');
                    resetForm();
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Go back
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Modal */}
      {error && (
        <ErrorModal 
          message={getFriendlyError(error)} 
          onClose={() => dispatch(clearError())} 
        />
      )}

      {/* Success Modal */}
      {successMessage && (
        <SuccessModal 
          message={successMessage} 
          onClose={() => setSuccessMessage('')} 
        />
      )}
    </div>
  );
};

// Compact Input Component
interface InputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
  placeholder?: string;
  compact?: boolean;
}

const Input: React.FC<InputProps> = ({ 
  label, 
  name, 
  value, 
  onChange, 
  type = 'text', 
  icon, 
  endIcon, 
  placeholder,
  compact = false
}) => {
  return (
    <div className={compact ? 'mb-3' : 'mb-4'}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <div className="flex items-center">
          {icon && (
            <div className="p-3 text-gray-400">
              {icon}
            </div>
          )}
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            className={`flex-1 p-3 bg-transparent focus:outline-none text-gray-800 placeholder-gray-400 ${
              icon ? 'pl-0' : ''
            } ${endIcon ? 'pr-0' : ''}`}
            placeholder={placeholder}
          />
          {endIcon && (
            <div className="p-3">
              {endIcon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Button Component
interface ButtonProps {
  onClick: () => void;
  loading: boolean;
  variant: 'primary' | 'outline';
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ onClick, loading, variant, children, className = '' }) => {
  const baseClasses = "w-full px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = variant === 'primary' 
    ? "bg-blue-600 hover:bg-blue-700 text-white" 
    : "border border-gray-300 hover:bg-gray-50 text-gray-700";

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Auth;