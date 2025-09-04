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
  Chrome
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { 
  signInUser, 
  signUpUser, 
  signInWithGoogle, 
  signInWithMicrosoft,
  signInWithGitHub,
  signOut as signOutUser,
  clearError 
} from '../../store/slices/authSlice';
import ErrorModal from '../Atoms/ErrorModal';

interface FormData {
  name: string;
  phone: string;
  email: string;
  password: string;
}

const Auth: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, loading, error } = useAppSelector(state => state.auth);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

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
    return 'An unexpected error occurred. Please try again.';
  };

  const signUp = async () => {
    const { name, phone, email, password } = form;
    
    if (!name || !phone || !email || !password) {
      dispatch({ type: 'auth/signUp/rejected', error: { message: 'Please fill in all fields' } });
      return;
    }

    if (password.length < 6) {
      dispatch({ type: 'auth/signUp/rejected', error: { message: 'Password must be at least 6 characters' } });
      return;
    }

    try {
      await dispatch(signUpUser({ email, password, name })).unwrap();
      navigate('/boards');
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

  const logOut = async () => {
    try {
      await dispatch(signOutUser()).unwrap();
      navigate('/');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // If user is logged in, show success state
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-60 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10"></div>
              <div className="relative">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome Back!</h2>
                <p className="text-green-100">You're successfully logged in</p>
              </div>
            </div>
            
            <div className="p-8 text-center">
              <div className="mb-6">
                <p className="text-slate-600 mb-2">Logged in as:</p>
                <p className="text-lg font-semibold text-slate-800">{user.displayName || user.email}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              
              <button
                onClick={logOut}
                disabled={loading}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 mx-auto hover:scale-105 disabled:opacity-50"
              >
                <LogOut size={20} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10"></div>
            <div className="relative">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h1>
              <p className="text-blue-100">
                {isSignUp ? 'Join Ticket Tracker to manage your projects' : 'Sign in to your account'}
              </p>
            </div>
          </div>

          <div className="p-8">
            {/* Sign Up Fields */}
            {isSignUp && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <StylishInput
                  label="Full Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  icon={<User size={20} />}
                  placeholder="John Doe"
                />
                <StylishInput
                  label="Phone Number"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  icon={<Phone size={20} />}
                  placeholder="(555) 123-4567"
                />
              </div>
            )}

            {/* Email */}
            <div className="mb-6">
              <StylishInput
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                icon={<Mail size={20} />}
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <StylishInput
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                icon={<Lock size={20} />}
                placeholder={isSignUp ? 'Create a secure password' : 'Enter your password'}
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                }
              />
            </div>

            {/* Auth Button */}
            <button
              onClick={isSignUp ? signUp : logIn}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-purple-800 text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 mb-6 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={googleSignIn}
              disabled={loading}
              className="w-full border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-6 hover:scale-105"
            >
              <span className="font-medium text-slate-700">Continue with Google</span>
            </button>

          {/* GitHub Sign In */}
          <button
            onClick={async () => {
              try {
                await dispatch(signInWithGitHub()).unwrap();
                navigate('/boards');
              } catch (err: any) {
                console.error('GitHub sign in error:', err);
              }
            }}
            disabled={loading}
            className="w-full border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-4 hover:scale-105"
          >
            <span className="font-medium text-slate-700">Continue with GitHub</span>
          </button>


            {/* Toggle Sign Up/In */}
            <div className="text-center">
              <p className="text-sm text-slate-600">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button 
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setForm({ name: '', phone: '', email: '', password: '' });
                    if (error) dispatch(clearError());
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      {error && (
        <ErrorModal 
          message={getFriendlyError(error)} 
          onClose={() => dispatch(clearError())} 
        />
      )}
    </div>
  );
};

// Stylish Input Component
interface StylishInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
  placeholder?: string;
}

const StylishInput: React.FC<StylishInputProps> = ({ 
  label, 
  name, 
  value, 
  onChange, 
  type = 'text', 
  icon, 
  endIcon, 
  placeholder 
}) => {
  const [focused, setFocused] = useState(false);
  
  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      <div className={`relative border-2 rounded-xl transition-all duration-300 ${
        focused ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-slate-200 hover:border-slate-300'
      }`}>
        <div className="flex items-center">
          {icon && (
            <div className="p-4 text-slate-400">
              {icon}
            </div>
          )}
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={`flex-1 p-4 bg-transparent focus:outline-none text-slate-800 placeholder-slate-400 ${
              icon ? 'pl-0' : ''
            } ${endIcon ? 'pr-0' : ''}`}
            placeholder={placeholder}
          />
          {endIcon && (
            <div className="p-4">
              {endIcon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;