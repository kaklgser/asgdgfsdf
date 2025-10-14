// src/components/jobs/JobCard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  Clock,
  Calendar,
  ExternalLink,
  Users,
  Bookmark,
  Heart,
  Copy,
  Sparkles
} from 'lucide-react';
import { JobListing, AutoApplyResult, OptimizedResume } from '../../types/jobs';
import { jobsService } from '../../services/jobsService';
import { autoApplyOrchestrator } from '../../services/autoApplyOrchestrator';
import { profileResumeService } from '../../services/profileResumeService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface JobCardProps {
  job: JobListing;
  onManualApply: (job: JobListing, optimizedResume: OptimizedResume) => void;
  onAutoApply: (job: JobListing, result: AutoApplyResult) => void;
  isAuthenticated: boolean;
  onShowAuth: () => void;
  onCompleteProfile?: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onManualApply,
  onAutoApply,
  isAuthenticated,
  onShowAuth,
  onCompleteProfile
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const eligibleYearTags = useMemo(() => {
    const raw = job.eligible_years;
    if (!raw) return [];

    const tokens = Array.isArray(raw)
      ? raw
      : raw.includes(',') || raw.includes('|') || raw.includes('/')
        ? raw.split(/[,|/]/)
        : raw.split(/\s+/);

    return tokens
      .map((value) => value.trim())
      .filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index)
      .slice(0, 3);
  }, [job.eligible_years]);

  const handleCardClick = () => {
    navigate(`/jobs/${job.id}`);
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onShowAuth();
      return;
    }
    navigate(`/jobs/${job.id}/apply`);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(job.application_link);
  };

  const skillTags = job.skills || [];
  const postedDaysAgo = Math.floor((Date.now() - new Date(job.posted_date).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleCardClick}
      className="bg-white dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-dark-300 hover:border-blue-400 dark:hover:border-neon-cyan-500 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden active:scale-[0.99]"
    >
      {/* CHANGE: Reduced padding from p-3 to p-2 on mobile, p-3 on larger screens */}
      <div className="p-2 sm:p-3">
        <div className="flex items-start space-x-3">
          {/* CHANGE: Fixed logo container size and removed zoom effects */}
          {/* Company Logo - Fixed size, no scaling issues */}
          <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-300 flex items-center justify-center p-2 overflow-hidden">
            {job.company_logo_url ? (
              <img
                src={job.company_logo_url}
                alt={`${job.company_name} logo`}
                className="w-full h-full object-contain"
                style={{ objectFit: 'contain' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="w-full h-full rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-base sm:text-lg">${job.company_name.charAt(0)}</div>`;
                  }
                }}
              />
            ) : (
              <div className="w-full h-full rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-base sm:text-lg">
                {job.company_name.charAt(0)}
              </div>
            )}
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1.5 sm:mb-2">
              <div className="flex-1 min-w-0 pr-2 sm:pr-4">
                {/* CHANGE: Made text smaller on mobile */}
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-0.5 sm:mb-1 truncate">
                  {job.role_title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2 truncate">
                  {job.company_name}
                </p>
              </div>

              {/* Commission Badge */}
              {job.user_has_applied && job.commission_percentage && job.commission_percentage > 0 && (
                <div className="flex-shrink-0 relative">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 transform -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="none"
                      className="text-gray-200 dark:text-dark-300"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 16}`}
                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - job.commission_percentage / 100)}`}
                      className={job.user_application_method === 'auto' ? 'text-green-500 dark:text-green-400' : 'text-blue-500 dark:text-blue-400'}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-300">{Math.round(job.commission_percentage)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* CHANGE: Made job details more compact on mobile */}
            {/* Job Details */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">
              <div className="flex items-center space-x-0.5 sm:space-x-1">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="truncate max-w-[100px] sm:max-w-none">{job.location_city || job.location_type}</span>
              </div>
              <div className="flex items-center space-x-0.5 sm:space-x-1">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Full-time</span>
              </div>
              <div className="flex items-center space-x-0.5 sm:space-x-1">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="truncate">{job.experience_required}</span>
              </div>
              {eligibleYearTags.length > 0 && (
                <div className="flex items-center space-x-0.5 sm:space-x-1">
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="truncate">{eligibleYearTags.join(' / ')}</span>
                </div>
              )}
            </div>

            {/* CHANGE: Limited skill tags to 4 on mobile, 6 on larger screens */}
            {/* Skill Tags */}
            <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
              {skillTags.slice(0, 4).map((tag, index) => (
                <span
                  key={index}
                  className="px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 rounded text-[10px] sm:text-[11px] font-medium border border-blue-200 dark:border-blue-700/50"
                >
                  {tag}
                </span>
              ))}
              {/* Show more on desktop */}
              <span className="hidden sm:inline-flex">
                {skillTags.slice(4, 6).map((tag, index) => (
                  <span
                    key={index + 4}
                    className="px-2 py-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 rounded text-[11px] font-medium border border-blue-200 dark:border-blue-700/50 mr-1.5"
                  >
                    {tag}
                  </span>
                ))}
              </span>
              {skillTags.length > 4 && (
                <span className="px-1.5 sm:px-2 py-0.5 bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 rounded text-[10px] sm:text-[11px] font-medium">
                  +{skillTags.length - 4}
                </span>
              )}
            </div>

            {/* CHANGE: Restructured actions layout - badges on top, buttons below */}
            {/* Actions Section */}
            <div className="space-y-2">
              {/* Top Row: Badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  {job.has_referral && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded text-[9px] sm:text-[10px] font-semibold flex items-center animate-pulse">
                      <Users className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5" />
                      Referral
                    </span>
                  )}
                  {job.ai_polished && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-700 dark:text-purple-300 rounded text-[9px] sm:text-[10px] font-medium flex items-center border border-purple-200 dark:border-purple-700">
                      <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5" />
                      AI
                    </span>
                  )}
                  <span className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-500">
                    {postedDaysAgo === 0 ? 'Today' : `${postedDaysAgo}d ago`}
                  </span>
                </div>

                {/* CHANGE: Icon buttons only on desktop, moved to separate row on mobile */}
                <div className="hidden sm:flex items-center space-x-1.5">
                  <button
                    onClick={handleBookmark}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isBookmarked
                        ? 'bg-blue-100 dark:bg-neon-cyan-500/20 text-blue-600 dark:text-neon-cyan-400'
                        : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-300'
                    }`}
                    aria-label="Bookmark"
                  >
                    <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={handleFavorite}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isFavorited
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-300'
                    }`}
                    aria-label="Favorite"
                  >
                    <Heart className="w-3.5 h-3.5" fill={isFavorited ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors"
                    aria-label="Copy link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* CHANGE: Bottom Row - Apply button and action buttons */}
              {/* Bottom Row: Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                {/* Icon buttons on mobile */}
                <div className="flex sm:hidden items-center space-x-1.5">
                  <button
                    onClick={handleBookmark}
                    className={`p-2 rounded-lg transition-colors ${
                      isBookmarked
                        ? 'bg-blue-100 dark:bg-neon-cyan-500/20 text-blue-600 dark:text-neon-cyan-400'
                        : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 active:bg-gray-200 dark:active:bg-dark-300'
                    }`}
                    aria-label="Bookmark"
                  >
                    <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={handleFavorite}
                    className={`p-2 rounded-lg transition-colors ${
                      isFavorited
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 active:bg-gray-200 dark:active:bg-dark-300'
                    }`}
                    aria-label="Favorite"
                  >
                    <Heart className="w-4 h-4" fill={isFavorited ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 active:bg-gray-200 dark:active:bg-dark-300 transition-colors"
                    aria-label="Copy link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {/* Apply button - full width on mobile, auto width on desktop */}
                {job.user_has_applied ? (
                  <div className="flex-1 sm:flex-none">
                    <span className={`w-full sm:w-auto px-3 py-1.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 ${
                      job.user_application_method === 'auto'
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
                        : 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                    }`}>
                      <span>{job.user_application_method === 'auto' ? 'AUTO APPLIED' : 'APPLIED'}</span>
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleApplyClick}
                    className="flex-1 sm:flex-none px-4 sm:px-4 py-2 sm:py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-500 dark:to-neon-cyan-500 hover:from-purple-700 hover:to-blue-700 dark:hover:from-purple-600 dark:hover:to-neon-cyan-600 active:scale-95 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
                  >
                    Apply Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
