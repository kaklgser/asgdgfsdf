// src/components/DiwaliOfferBanner.tsx
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiwaliOfferBannerProps {
  onCTAClick: () => void;
}

export const DiwaliOfferBanner: React.FC<DiwaliOfferBannerProps> = ({ onCTAClick }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Set your Diwali offer end date here
  const offerEndDate = new Date('2024-11-15T23:59:59'); // Adjust this date

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = offerEndDate.getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white shadow-lg"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="hidden sm:flex items-center space-x-2">
                <Gift className="w-6 h-6 animate-bounce" />
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                  <h3 className="text-lg sm:text-xl font-bold">
                    🪔 Diwali Special Offer!
                  </h3>
                  <span className="text-2xl sm:text-3xl font-extrabold bg-white text-orange-600 px-3 py-1 rounded-lg shadow-lg">
                    90% OFF
                  </span>
                </div>
                <p className="text-sm sm:text-base mt-1">
                  Use code <span className="font-bold bg-white text-orange-600 px-2 py-0.5 rounded">DIWALI</span> at checkout
                </p>
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="hidden md:flex items-center space-x-2 mr-4">
              <div className="text-center bg-white/20 px-3 py-2 rounded-lg backdrop-blur-sm">
                <div className="text-xl font-bold">{timeLeft.days}</div>
                <div className="text-xs">Days</div>
              </div>
              <div className="text-center bg-white/20 px-3 py-2 rounded-lg backdrop-blur-sm">
                <div className="text-xl font-bold">{timeLeft.hours}</div>
                <div className="text-xs">Hours</div>
              </div>
              <div className="text-center bg-white/20 px-3 py-2 rounded-lg backdrop-blur-sm">
                <div className="text-xl font-bold">{timeLeft.minutes}</div>
                <div className="text-xs">Mins</div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={onCTAClick}
              className="bg-white text-orange-600 font-bold px-4 sm:px-6 py-2 rounded-lg hover:bg-orange-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ml-2 sm:ml-4"
            >
              Claim Now
            </button>

            {/* Close Button */}
            <button
              onClick={() => setIsVisible(false)}
              className="ml-2 sm:ml-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
