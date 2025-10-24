// src/components/OfferOverlay.tsx
import React from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OfferOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  // Optional: action to perform (e.g., open SubscriptionPlans modal)
  onAction?: () => void;
  // Optional: fallback route to navigate when no onAction is provided
  targetPath?: string;
  // Optional: button label override
  ctaLabel?: string;
}

export const OfferOverlay: React.FC<OfferOverlayProps> = ({
  isOpen,
  onClose,
  onAction,
  targetPath = '/pricing',
  ctaLabel,
}) => {
  const navigate = useNavigate();
  if (!isOpen) return null;

  const handleActionClick = () => {
    if (onAction) {
      onAction();
    } else if (targetPath) {
      navigate(targetPath);
    }
    onClose();
  };

  const onKeyActivate: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActionClick();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-down">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-auto text-center border border-gray-200 relative dark:bg-dark-100 dark:border-dark-300 dark:shadow-dark-xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-gray-800/50 text-gray-100 hover:bg-gray-700 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {/* Clickable image */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleActionClick}
            onKeyDown={onKeyActivate}
            className="mb-6 cursor-pointer"
            title="View Subscription Plan Details"
          >
            <img
              src="https://i.ibb.co/Nk95wJM/offer-banner.png"
              alt="Limited Time Offers"
              className="w-full h-40 object-cover rounded-2xl shadow-md mx-auto"
            />
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Limited Time Offers
          </h2>

          {/* CTA */}
          <button
            onClick={handleActionClick}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            <span>{ctaLabel ?? 'View All Plans & Add-ons'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
