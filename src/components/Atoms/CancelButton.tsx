// components/Atoms/CancelButton.tsx
import React from 'react';

interface CancelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const CancelButton: React.FC<CancelButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};

export default CancelButton;