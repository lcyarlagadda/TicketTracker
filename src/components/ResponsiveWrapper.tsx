// components/ResponsiveWrapper.tsx
import React from 'react';
import { useDeviceDetection } from '../utils/deviceDetection';
import { Monitor, Smartphone, AlertTriangle } from 'lucide-react';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
}

const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({ children }) => {
  const deviceInfo = useDeviceDetection();

  // Show unsupported message for small devices
  if (deviceInfo.isSmallDevice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Device Not Supported
            </h1>
            <p className="text-slate-600 mb-6">
              This application is optimized for tablets and larger screens. 
              Please access it from an iPad, laptop, or desktop computer for the best experience.
            </p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-center gap-3 text-slate-500">
              <Smartphone className="w-5 h-5" />
              <span className="text-sm">Mobile devices not supported</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-green-600">
              <Monitor className="w-5 h-5" />
              <span className="text-sm font-medium">Tablets & laptops supported</span>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">
              Current screen width: <span className="font-mono font-medium">{deviceInfo.screenWidth}px</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Minimum supported width: 768px
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render the app for supported devices
  return <>{children}</>;
};

export default ResponsiveWrapper;
