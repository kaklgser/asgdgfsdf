import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  Clock,
  Calendar,
  Users,
  Sparkles
} from 'lucide-react';
import { JobListing } from '../../types/jobs';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface JobCardProps {
  job: JobListing;
  isAuthenticated: boolean;
  onShowAuth: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  isAuthenticated,
  onShowAuth
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
    if (!isAuthenticated) {
      onShowAuth();
      return;
    }
   navigate(/jobs/${job.id}/apply);;
  };

  const skillTags = job.skills || [];
  const postedDaysAgo = Math.floor((Date.now() - new Date(job.posted_date).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleCardClick}
      className="bg-white dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-dark-300 hover:border-blue-400 dark:hover:border-neon-cyan-500 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div className="p-3">
        <div className="flex items-start space-x-4">
          {/* Company Logo */}
          <div className="flex-shrink-0 w-14 h-14 bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-300 flex items-center justify-center p-2">
            {job.company_logo_url ? (
              <img
                src={job.company_logo_url}
                alt={`${job.company_name} logo`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="w-full h-full rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">${job.company_name.charAt(0)}</div>`;
                  }
                }}
              />
            ) : (
              <div className="w-full h-full rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {job.company_name.charAt(0)}
              </div>
            )}
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">
                  {job.role_title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {job.company_name}
                </p>
              </div>

              {/* Commission Badge */}
              {job.user_has_applied && job.commission_percentage && job.commission_percentage > 0 && (
                <div className="flex-shrink-0 relative">
                  <svg className="w-10 h-10 transform -rotate-90">
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
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{Math.round(job.commission_percentage)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Job Details */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
              <div className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{job.location_city || job.location_type}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Full-time</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-3.5 h-3.5" />
                <span>{job.experience_required}</span>
              </div>
              {eligibleYearTags.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{eligibleYearTags.join(' / ')}</span>
                </div>
              )}
            </div>

            {/* Skill Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {skillTags.slice(0, 6).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 rounded text-[11px] font-medium border border-blue-200 dark:border-blue-700/50"
                >
                  {tag}
                </span>
              ))}
              {skillTags.length > 6 && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 rounded text-[11px] font-medium">
                  +{skillTags.length - 6}
                </span>
              )}
            </div>

            {/* Actions Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                {job.has_referral && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded text-[10px] font-semibold flex items-center animate-pulse">
                    <Users className="w-2.5 h-2.5 mr-0.5" />
                    Referral
                  </span>
                )}
                {job.ai_polished && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-700 dark:text-purple-300 rounded text-[10px] font-medium flex items-center border border-purple-200 dark:border-purple-700">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    AI
                  </span>
                )}
                <span className="text-[11px] text-gray-500 dark:text-gray-500">
                  {postedDaysAgo === 0 ? 'Today' : `${postedDaysAgo}d ago`}
                </span>
              </div>

              {/* New Apply Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  disabled
                  className="px-3 py-1.5 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-dark-300 dark:to-dark-200 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold cursor-not-allowed"
                >
                  Auto Apply (Coming Soon)
                </button>
                <button
                  onClick={handleManualApply}
                  className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Manual Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
