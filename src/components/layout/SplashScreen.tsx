import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Slash logo icon matching dashboard/auth branding
const SlashLogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="15" y1="5" x2="9" y2="19" />
  </svg>
);

interface SplashScreenProps {
  onComplete: () => void;
  minDisplayTime?: number;
  isDataReady?: boolean;
}

export function SplashScreen({ onComplete, minDisplayTime = 1000, isDataReady = false }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  // Maximum timeout - force dismiss after 3 seconds to prevent infinite black screen
  useEffect(() => {
    const maxTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(maxTimeout);
  }, []);

  // Only hide splash when both min time has elapsed AND data is ready
  // Add a small buffer to ensure smooth transition
  useEffect(() => {
    if (minTimeElapsed && isDataReady) {
      // Minimal delay to ensure app is fully rendered
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [minTimeElapsed, isDataReady]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
          style={{ 
            paddingTop: 'env(safe-area-inset-top)', 
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
        >
          {/* Content */}
          <div className="relative flex flex-col items-center gap-6">
            {/* Logo Icon - matching dashboard sidebar logo */}
            <motion.img
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              src="/splash-icon.png"
              alt="MyTradeLog"
              className="h-24 md:h-32 w-auto object-contain dark:invert-0 invert"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
