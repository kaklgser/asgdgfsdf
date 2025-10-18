// src/components/DiwaliOfferBanner.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiwaliOfferBannerProps {
  onCTAClick: () => void;
  hideOnExpire?: boolean; // optional: default true (banner auto-hides when timer ends)
  endAtISO?: string; // optional override for end date (ISO with timezone), e.g. '2025-11-15T23:59:59+05:30'
}

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number };

export const DiwaliOfferBanner: React.FC<DiwaliOfferBannerProps> = ({
  onCTAClick,
  hideOnExpire = true,
  endAtISO = '2025-11-15T23:59:59+05:30', // IST-safe default
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const offerEndTs = useMemo(() => new Date(endAtISO).getTime(), [endAtISO]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, offerEndTs - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });

      if (diff === 0 && hideOnExpire) setIsVisible(false);
    };

    tick(); // initial
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offerEndTs, hideOnExpire]);

  const close = () => setIsVisible(false);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white shadow-2xl"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="hidden sm:flex items-center space-x-2 flex-shrink-0">
                  <Gift className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold truncate">🪔 Diwali Special!</h3>
                    <span className="text-xl sm:text-2xl md:text-3xl font-extrabold bg-white text-orange-600 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg shadow-lg inline-block">
                      90% OFF
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm md:text-base mt-1">
                    Code:{' '}
                    <span className="font-bold bg-white text-orange-600 px-1.5 py-0.5 sm:px-2 rounded">DIWALI</span>
                  </p>
                </div>
              </div>

              <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
                <div className="text-center bg-white/20 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg backdrop-blur-sm">
                  <div className="text-lg sm:text-xl font-bold tabular-nums">{timeLeft.days}</div>
                  <div className="text-xs">Days</div>
                </div>
                <div className="text-center bg-white/20 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg backdrop-blur-sm">
                  <div className="text-lg sm:text-xl font-bold tabular-nums">{timeLeft.hours}</div>
                  <div className="text-xs">Hours</div>
                </div>
                <div className="text-center bg-white/20 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg backdrop-blur-sm">
                  <div className="text-lg sm:text-xl font-bold tabular-nums">{timeLeft.minutes}</div>
                  <div className="text-xs">Mins</div>
                </div>
                <div className="text-center bg-white/20 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg backdrop-blur-sm">
                  <div className="text-lg sm:text-xl font-bold tabular-nums">{timeLeft.seconds}</div>
                  <div className="text-xs">Secs</div>
                </div>
              </div>

              <button
                onClick={onCTAClick}
                className="bg-white text-orange-600 font-bold px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 rounded-lg hover:bg-orange-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base flex-shrink-0"
              >
                Claim Now
              </button>

              <button
                onClick={close}
                className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
                aria-label="Close banner"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DiwaliOfferBanner;
