import { useState, useEffect } from 'react';
import { Loader2, Car } from 'lucide-react';

interface OptimizedSplashScreenProps {
  minimumLoadTime?: number;
  children: React.ReactNode;
}

/**
 * Optimized splash screen that shows for a minimum time
 * to prevent flashing and ensure smooth transitions
 */
export function OptimizedSplashScreen({ 
  minimumLoadTime = 800,
  children 
}: OptimizedSplashScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progressive loading
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 100);

    // Minimum display time for smooth UX
    const timer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setIsLoading(false), 200);
    }, minimumLoadTime);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [minimumLoadTime]);

  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6 max-w-sm mx-auto px-4">
        {/* Logo Animation */}
        <div className="relative">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
            <Car className="h-10 w-10 text-white" />
          </div>
          {/* Spinning ring */}
          <div className="absolute -inset-2 border-2 border-primary/20 rounded-3xl animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Chadwick SchoolPool</h1>
          <p className="text-sm text-gray-500">Loading your carpool experience...</p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Loading spinner */}
        <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
      </div>
    </div>
  );
}

/**
 * Preload critical resources
 */
export function useResourcePreload() {
  useEffect(() => {
    // Preload critical fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.href = '/fonts/inter-var.woff2';
    fontLink.as = 'font';
    fontLink.type = 'font/woff2';
    fontLink.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink);

    // Preconnect to Supabase
    const preconnectSupabase = document.createElement('link');
    preconnectSupabase.rel = 'preconnect';
    preconnectSupabase.href = 'https://dchwbbvpsgxwqezqhbfw.supabase.co';
    document.head.appendChild(preconnectSupabase);

    return () => {
      document.head.removeChild(fontLink);
      document.head.removeChild(preconnectSupabase);
    };
  }, []);
}

/**
 * Smooth page transition wrapper
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay for smooth fade in
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      {children}
    </div>
  );
}
