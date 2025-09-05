// components/Atoms/SuccessModal.tsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  message: string;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  message, 
  onClose, 
  autoClose = true, 
  duration = 5000 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (message) {
      setIsVisible(true);

      if (autoClose) {
        timer = setTimeout(() => {
          handleClose();
        }, duration);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [message, autoClose, duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 200);
  };

  if (!message) return null;

  return (
    <div className={`fixed top-4 right-4 z-[70] transition-all duration-300 transform ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-white border-l-4 border-green-500 rounded-xl shadow-2xl p-4 max-w-md">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle size={16} className="text-green-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 mb-1">Success</h4>
            <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
          </div>
          
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <X size={14} className="text-slate-500" />
          </button>
        </div>
        
        {autoClose && (
          <div className="mt-3 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all ease-linear"
              style={{
                animation: `shrink ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default SuccessModal;
