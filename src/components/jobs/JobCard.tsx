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
  Sparkles,
  Zap,
  FileText
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

  const handleManualApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to job details page
    navigate(`/jobs/${job.id}`);
  };

  const handleAutoApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Coming soon - show toast or do nothing
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
      <div className="p-2 sm:p-3">
        <div className="flex items-start space-x-3">
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
              <span className="hidden sm:inline-flex gap-1.5">
                {skillTags.slice(4, 6).map((tag, index) => (
                  <span
                    key={index + 4}
                    className="px-2 py-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 rounded text-[11px] font-medium border border-blue-200 dark:border-blue-700/50"
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

            {/* Actions Row - Badges on left, Apply buttons on right */}
            <div className="flex items-center justify-between">
              {/* Left: Badges */}
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

              {/* Right: Auto Apply & Manual Apply Buttons */}
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {/* Auto Apply - Coming Soon */}
                <button
                  onClick={handleAutoApply}
                  disabled
                  className="relative px-2 sm:px-3 py-1.5 bg-gradient-to-r from-green-400 to-emerald-400 dark:from-green-500 dark:to-emerald-500 text-white rounded-lg text-[10px] sm:text-xs font-semibold transition-all duration-200 opacity-60 cursor-not-allowed flex items-center space-x-1"
                  title="Coming Soon"
                >
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Auto</span>
                  <span className="sm:hidden">Auto</span>
                </button>

                {/* Manual Apply */}
                <button
                  onClick={handleManualApply}
                  className="px-2 sm:px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-500 dark:to-neon-cyan-500 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-600 dark:hover:to-neon-cyan-600 text-white rounded-lg text-[10px] sm:text-xs font-semibold transition-all duration-200 active:scale-95 flex items-center space-x-1 shadow-sm hover:shadow-md"
                >
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Manual</span>
                  <span className="sm:hidden">Manual</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
