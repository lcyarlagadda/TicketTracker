// components/Atoms/SecondaryButton.tsx
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  className = ''
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`border-2 border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 ${className}`}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
};

export default SecondaryButton;
