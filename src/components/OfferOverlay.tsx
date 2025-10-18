// src/components/OfferOverlay.tsx
import React from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';

interface OfferOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pass onShowSubscriptionPlansDirectly here */
  onAction?: () => void;
}

export const OfferOverlay: React.FC<OfferOverlayProps> = ({
  isOpen,
  onClose,
  onAction,
}) => {
  if (!isOpen) return null;

  const viewPlans = () => {
    onAction?.(); // open All Plans & Add-ons
    onClose();    // close overlay
  };

  const onKeyActivate: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      viewPlans();
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
            onClick={viewPlans}
            onKeyDown={onKeyActivate}
            className="mb-6 cursor-pointer"
            title="View All Plans & Add-ons"
          >
            <img
              src="https://res.cloudinary.com/dvue2zenh/image/upload/v1760781622/bqr48g8czgaqubk2kyf8.png"
              alt="Diwali Offers"
              className="w-full h-40 object-cover rounded-2xl shadow-md mx-auto"
            />
          </div>

          {/* Only the title */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Diwali Offers
          </h2>

          {/* CTA */}
          <button
            onClick={viewPlans}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            <span>View All Plans & Add-ons</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
