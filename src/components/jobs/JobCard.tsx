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

  const getSkillTags = () => {
    const tags: string[] = [];
    if (job.domain) tags.push(job.domain);

    const descriptionLower = job.short_description?.toLowerCase() || '';
    const commonSkills = ['React', 'Node.js', 'Python', 'Java', 'TypeScript', 'JavaScript', 'SQL', 'AWS', 'Docker', 'Kubernetes'];

    commonSkills.forEach(skill => {
      if (descriptionLower.includes(skill.toLowerCase()) && tags.length < 8) {
        tags.push(skill.toUpperCase());
      }
    });

    return tags.slice(0, 8);
  };

  const skillTags = getSkillTags();
  const postedDaysAgo = Math.floor((Date.now() - new Date(job.posted_date).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleCardClick}
      className="bg-white dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-dark-300 hover:border-blue-400 dark:hover:border-neon-cyan-500 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div className="p-5">
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

              {/* Upload Resume Progress */}
              <div className="flex-shrink-0 relative">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className="text-gray-200 dark:text-dark-300"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - 0.2)}`}
                    className="text-orange-500 dark:text-orange-400"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">20%</span>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
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
            <div className="flex flex-wrap gap-2 mb-4">
              {skillTags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium border border-gray-200 dark:border-dark-300"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Actions Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {job.has_referral && (
                  <span className="px-2.5 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-md text-xs font-semibold flex items-center animate-pulse">
                    <Users className="w-3 h-3 mr-1" />
                    Referral
                  </span>
                )}
                {job.ai_polished && (
                  <span className="px-2.5 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-700 dark:text-purple-300 rounded-md text-xs font-medium flex items-center border border-purple-200 dark:border-purple-700">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Enhanced
                  </span>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {postedDaysAgo === 0 ? 'Posted today' : `${postedDaysAgo} days ago`}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBookmark}
                  className={`p-2 rounded-lg transition-colors ${
                    isBookmarked
                      ? 'bg-blue-100 dark:bg-neon-cyan-500/20 text-blue-600 dark:text-neon-cyan-400'
                      : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-300'
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
                      : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-300'
                  }`}
                  aria-label="Favorite"
                >
                  <Heart className="w-4 h-4" fill={isFavorited ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors"
                  aria-label="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleApplyClick}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-500 dark:to-neon-cyan-500 hover:from-purple-700 hover:to-blue-700 dark:hover:from-purple-600 dark:hover:to-neon-cyan-600 text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-1 shadow-md hover:shadow-lg"
                >
                  <span>APPLIED</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
