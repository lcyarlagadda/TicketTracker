// utils/deviceDetection.ts
import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallDevice: boolean;
  screenWidth: number;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'small';
}

export const getDeviceInfo = (): DeviceInfo => {
  const screenWidth = window.innerWidth;
  
  // Define breakpoints
  const mobileBreakpoint = 768; // Below this is considered mobile/small
  const tabletBreakpoint = 1024; // Between mobile and this is tablet
  const desktopBreakpoint = 1280; // Above this is desktop
  
  let deviceType: DeviceInfo['deviceType'];
  let isMobile = false;
  let isTablet = false;
  let isDesktop = false;
  let isSmallDevice = false;
  
  if (screenWidth < mobileBreakpoint) {
    deviceType = 'small';
    isSmallDevice = true;
  } else if (screenWidth < tabletBreakpoint) {
    deviceType = 'tablet';
    isTablet = true;
  } else if (screenWidth < desktopBreakpoint) {
    deviceType = 'desktop';
    isDesktop = true;
  } else {
    deviceType = 'desktop';
    isDesktop = true;
  }
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmallDevice,
    screenWidth,
    deviceType
  };
};

export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => getDeviceInfo());
  
  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return deviceInfo;
};
