import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  User,
  Building,
  Target,
  Loader2,
  CheckCircle,
  Linkedin,
  Sparkles,
  Copy,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Award,
  Briefcase,
  FileText
} from 'lucide-react';

import { paymentService } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { Subscription } from '../types/payment';
import { useNavigate } from 'react-router-dom';

type ProfileSection = 'headline' | 'about' | 'experience' | 'skills' | 'achievements';
type OptimizationTone = 'professional' | 'conversational' | 'ambitious';

interface ProfileOptimizationForm {
  headline: string;
  about: string;
  experience: string;
  skills: string;
  achievements: string;
  targetRole: string;
  industry: string;
  tone: OptimizationTone;
  seniorityLevel: 'entry' | 'mid' | 'senior' | 'executive';
}

interface OptimizedProfile {
  headline: {
    original: string;
    optimized: string;
    explanation: string;
    characterCount: number;
  };
  about: {
    original: string;
    optimized: string;
    explanation: string;
    characterCount: number;
  };
  experience: {
    original: string;
    optimized: string;
    explanation: string;
  };
  skills: {
    original: string;
    optimized: string[];
    explanation: string;
  };
  achievements: {
    original: string;
    optimized: string[];
    explanation: string;
  };
  overallScore: number;
  keyImprovements: string[];
}

interface LinkedInProfileOptimizerProps {
  onNavigateBack: () => void;
  isAuthenticated: boolean;
  onShowAuth: () => void;
  userSubscription: Subscription | null;
  onShowSubscriptionPlans: (featureId?: string) => void;
  onShowAlert: (
    title: string,
    message: string,
    type?: 'info' | 'success' | 'warning' | 'error',
    actionText?: string,
    onAction?: () => void
  ) => void;
  refreshUserSubscription: () => Promise<void>;
  toolProcessTrigger: (() => void) | null;
  setToolProcessTrigger: React.Dispatch<React.SetStateAction<(() => void) | null>>;
}

const generateLinkedInProfileOptimization = async (formData: ProfileOptimizationForm): Promise<OptimizedProfile> => {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    headline: {
      original: formData.headline,
      optimized: `${formData.targetRole} | Driving Innovation in ${formData.industry} | Proven Track Record in Delivering Results`,
      explanation: 'Added role clarity, industry specificity, and value proposition. Optimized for LinkedIn search with relevant keywords.',
      characterCount: 118
    },
    about: {
      original: formData.about,
      optimized: `${formData.tone === 'professional' ? 'As an experienced' : formData.tone === 'conversational' ? "I'm a passionate" : "I'm a results-driven"} ${formData.targetRole} with expertise in ${formData.industry}, I specialize in transforming challenges into opportunities.\n\n🎯 Core Expertise:\n• Strategic planning and execution\n• Cross-functional team leadership\n• Data-driven decision making\n\n💼 Professional Achievements:\n${formData.achievements || '• Delivered measurable impact across multiple projects'}\n\n📫 Let's connect and explore how we can create value together!`,
      explanation: 'Restructured for readability with clear sections, added emojis for visual appeal, highlighted key skills and achievements, and included a call-to-action.',
      characterCount: 450
    },
    experience: {
      original: formData.experience,
      optimized: `🏆 Led cross-functional team of 10+ members to deliver $2M+ in revenue growth\n🚀 Spearheaded implementation of innovative solutions, resulting in 40% efficiency improvement\n📊 Developed and executed strategic initiatives that increased customer satisfaction by 35%\n💡 Mentored junior team members, fostering a culture of continuous improvement`,
      explanation: 'Transformed bullets with strong action verbs, quantified results with metrics, and added visual elements for better engagement.'
    },
    skills: {
      original: formData.skills,
      optimized: [
        `${formData.targetRole} Core Skills`,
        'Strategic Planning',
        'Project Management',
        'Team Leadership',
        'Data Analysis',
        'Stakeholder Management',
        'Process Optimization',
        'Change Management',
        `${formData.industry} Expertise`,
        'Budget Management',
        'Risk Assessment'
      ],
      explanation: 'Curated relevant skills for your target role with industry-specific keywords to improve profile visibility in recruiter searches.'
    },
    achievements: {
      original: formData.achievements,
      optimized: [
        `🏅 Awarded "${formData.targetRole} of the Year" for exceptional performance`,
        '🎖️ Recognized for driving 45% productivity increase through process innovation',
        '⭐ Successfully managed 20+ high-impact projects with 100% on-time delivery',
        '🌟 Built and scaled teams from 5 to 25+ members across multiple regions'
      ],
      explanation: 'Highlighted measurable achievements with specific numbers and visual indicators to make accomplishments stand out.'
    },
    overallScore: 87,
    keyImprovements: [
      'Added compelling headline with role clarity and value proposition',
      'Restructured About section with clear formatting and CTAs',
      'Quantified achievements with specific metrics and percentages',
      'Optimized skills for recruiter search algorithms',
      'Enhanced readability with visual elements and bullet points'
    ]
  };
};

export const LinkedInProfileOptimizer: React.FC<LinkedInProfileOptimizerProps> = ({
  onNavigateBack,
  isAuthenticated,
  onShowAuth,
  userSubscription,
  onShowSubscriptionPlans,
  onShowAlert,
  refreshUserSubscription,
  toolProcessTrigger,
  setToolProcessTrigger,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ProfileOptimizationForm>({
    headline: '',
    about: '',
    experience: '',
    skills: '',
    achievements: '',
    targetRole: '',
    industry: '',
    tone: 'professional',
    seniorityLevel: 'mid'
  });

  const [optimizedProfile, setOptimizedProfile] = useState<OptimizedProfile | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [optimizationInterrupted, setOptimizationInterrupted] = useState(false);

  const handleInputChange = (field: keyof ProfileOptimizationForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateCurrentStep = useCallback(() => {
    switch (currentStep) {
      case 0:
        return !!formData.targetRole.trim() && !!formData.industry.trim();
      case 1:
        return !!formData.headline.trim() && !!formData.about.trim();
      case 2:
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  const handleOptimizeProfile = useCallback(async () => {
    if (!isAuthenticated) {
      onShowAlert(
        'Authentication Required',
        'Please sign in to optimize your LinkedIn profile.',
        'error',
        'Sign In',
        onShowAuth
      );
      return;
    }

    await refreshUserSubscription();

    const creditsLeft =
      (userSubscription?.linkedinOptimizationsTotal || 0) - (userSubscription?.linkedinOptimizationsUsed || 0);

    if (!userSubscription || creditsLeft <= 0) {
      const planDetails = paymentService.getPlanById(userSubscription?.planId);
      const planName = planDetails?.name || 'your current plan';
      const linkedinOptimizationsTotal = planDetails?.linkedinOptimizations || 0;

      setOptimizationInterrupted(true);
      onShowAlert(
        'LinkedIn Optimization Credits Exhausted',
        `You have used all your ${linkedinOptimizationsTotal} LinkedIn Profile optimizations from ${planName}. Please upgrade your plan to continue optimizing your profile.`,
        'warning',
        'Upgrade Plan',
        () => onShowSubscriptionPlans('linkedin-optimizer')
      );
      return;
    }

    if (!formData.targetRole || !formData.industry) {
      onShowAlert('Missing Information', 'Please provide your target role and industry.', 'warning');
      return;
    }

    setIsOptimizing(true);
    try {
      const optimized = await generateLinkedInProfileOptimization(formData);
      setOptimizedProfile(optimized);

      if (userSubscription) {
        const usageResult = await paymentService.useLinkedInOptimization(userSubscription.userId);
        if (usageResult.success) {
          await refreshUserSubscription();
        } else {
          console.error('Failed to decrement LinkedIn optimization usage:', usageResult.error);
          onShowAlert(
            'Usage Update Failed',
            'Failed to record LinkedIn optimization usage. Please contact support.',
            'error'
          );
        }
      }
    } catch (error: any) {
      console.error('Error optimizing LinkedIn profile:', error);
      onShowAlert(
        'Optimization Failed',
        `Failed to optimize profile: ${error?.message || 'Unknown error'}. Please try again.`,
        'error'
      );
    } finally {
      setIsOptimizing(false);
    }
  }, [isAuthenticated, onShowAuth, userSubscription, onShowSubscriptionPlans, onShowAlert, refreshUserSubscription, formData]);

  useEffect(() => {
    setToolProcessTrigger(() => handleOptimizeProfile);
    return () => {
      setToolProcessTrigger(null);
    };
  }, [setToolProcessTrigger, handleOptimizeProfile]);

  useEffect(() => {
    if (optimizationInterrupted && userSubscription) {
      refreshUserSubscription().then(() => {
        if (userSubscription && (userSubscription.linkedinOptimizationsTotal - userSubscription.linkedinOptimizationsUsed) > 0) {
          console.log('LinkedInProfileOptimizer: Credits replenished, re-attempting optimization.');
          setOptimizationInterrupted(false);
          handleOptimizeProfile();
        }
      });
    }
  }, [optimizationInterrupted, refreshUserSubscription, userSubscription, handleOptimizeProfile]);

  const handleCopyContent = useCallback(async (content: string, sectionName: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const el = document.createElement('textarea');
        el.value = content;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopySuccess(sectionName);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  }, []);

  const steps = [
    {
      title: 'Target Role & Industry',
      component: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Define Your Professional Goal</h2>
            <p className="text-gray-600 dark:text-gray-300">Tell us about your target role and industry for personalized optimization</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Role *</label>
              <input
                type="text"
                value={formData.targetRole}
                onChange={(e) => handleInputChange('targetRole', e.target.value)}
                placeholder="e.g., Senior Product Manager"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-dark-200 dark:border-dark-300 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Industry *</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                placeholder="e.g., Technology, Healthcare, Finance"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-dark-200 dark:border-dark-300 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">Profile Tone</label>
              <div className="flex rounded-xl gap-2 bg-gray-100 border border-gray-200 shadow-inner dark:bg-dark-200 dark:border-dark-300 p-1">
                {(['professional', 'conversational', 'ambitious'] as OptimizationTone[]).map((tone) => (
                  <button
                    key={tone}
                    onClick={() => handleInputChange('tone', tone)}
                    className={`w-full flex-1 flex items-center justify-center py-3 px-4 rounded-lg font-medium transition-all duration-300 capitalize min-w-touch min-h-touch ${
                      formData.tone === tone
                        ? 'bg-white shadow-md text-blue-700 dark:bg-dark-100 dark:text-neon-cyan-400'
                        : 'text-gray-600 hover:text-blue-500 dark:text-gray-300 dark:hover:text-neon-cyan-400'
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">Seniority Level</label>
              <div className="flex rounded-xl gap-2 bg-gray-100 border border-gray-200 shadow-inner dark:bg-dark-200 dark:border-dark-300 p-1">
                {(['entry', 'mid', 'senior', 'executive'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => handleInputChange('seniorityLevel', level)}
                    className={`w-full flex-1 flex items-center justify-center py-3 px-2 rounded-lg font-medium transition-all duration-300 capitalize text-sm min-w-touch min-h-touch ${
                      formData.seniorityLevel === level
                        ? 'bg-white shadow-md text-blue-700 dark:bg-dark-100 dark:text-neon-cyan-400'
                        : 'text-gray-600 hover:text-blue-500 dark:text-gray-300 dark:hover:text-neon-cyan-400'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Profile Content',
      component: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Your Current LinkedIn Profile</h2>
            <p className="text-gray-600 dark:text-gray-300">Paste your current profile content for optimization</p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Headline * <span className="text-xs text-gray-500">(Current: {formData.headline.length}/220 characters)</span>
              </label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                placeholder="e.g., Product Manager at TechCorp"
                maxLength={220}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-dark-200 dark:border-dark-300 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                About Section * <span className="text-xs text-gray-500">(Current: {formData.about.length}/2600 characters)</span>
              </label>
              <textarea
                value={formData.about}
                onChange={(e) => handleInputChange('about', e.target.value)}
                placeholder="Paste your current About section here..."
                maxLength={2600}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all dark:bg-dark-200 dark:border-dark-300 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Additional Details',
      component: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Experience, Skills & Achievements</h2>
            <p className="text-gray-600 dark:text-gray-300">Optional: Provide additional context for better optimization</p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Experience Highlights</label>
              <textarea
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                placeholder="Key responsibilities and accomplishments from your recent roles..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all dark:bg-dark-200 dark:border-dark-300 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills</label>
              <textarea
                value={formData.skills}
                onChange={(e) => handleInputChange('skills', e.target.value)}
                placeholder="List your key skills separated by commas..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all dark:bg-dark-200 dark:border-dark-300 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notable Achievements</label>
              <textarea
                value={formData.achievements}
                onChange={(e) => handleInputChange('achievements', e.target.value)}
                placeholder="Awards, recognitions, certifications, or major accomplishments..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all dark:bg-dark-200 dark:border-dark-300 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-gray-900 font-sans dark:from-dark-50 dark:to-dark-200 dark:text-gray-100 transition-colors duration-300">
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 dark:bg-dark-50 dark:border-dark-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 py-3 gap-4">
            <button
              onClick={() => {
                if (onNavigateBack) onNavigateBack();
                else navigate('/');
              }}
              className="mb-6 mt-5 bg-gradient-to-r from-neon-cyan-500 to-neon-blue-500 text-white hover:from-neon-cyan-400 hover:to-neon-blue-400 shadow-md hover:shadow-neon-cyan py-3 px-5 rounded-xl inline-flex items-center space-x-2 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:block">Back to Home</span>
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1 text-center">LinkedIn Profile Optimizer</h1>
            <div className="w-16 flex-shrink-0" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200 dark:bg-dark-100 dark:border-dark-300 dark:shadow-dark-xl">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-neon-cyan-500/20 dark:shadow-neon-cyan">
                <Linkedin className="w-8 h-8 text-blue-600 dark:text-neon-cyan-400" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
                Optimize Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-neon-cyan-400 dark:to-neon-blue-400">
                  LinkedIn Profile
                </span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Get AI-powered suggestions to enhance your profile visibility, attract recruiters, and stand out in your industry.
              </p>
            </div>
          </div>

          {!optimizedProfile ? (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200 dark:bg-dark-100 dark:border-dark-300 dark:shadow-dark-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Step {currentStep + 1}: {steps[currentStep].title}
                  </h2>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Progress: {currentStep + 1} of {steps.length}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {steps.map((step, index) => (
                    <React.Fragment key={index}>
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                            index < currentStep
                              ? 'bg-green-500 text-white border-green-500 dark:bg-neon-cyan-500 dark:border-neon-cyan-500'
                              : index === currentStep
                              ? 'bg-blue-500 text-white border-blue-500 shadow-md scale-110 dark:bg-neon-blue-500 dark:border-neon-blue-500 dark:shadow-neon-blue'
                              : 'bg-white text-gray-500 border-gray-300 dark:bg-dark-200 dark:text-gray-400 dark:border-dark-300'
                          }`}
                        >
                          {index < currentStep ? <CheckCircle className="w-6 h-6" /> : <span className="text-lg font-bold">{index + 1}</span>}
                        </div>
                        <span
                          className={`text-xs mt-2 font-medium text-center ${
                            index <= currentStep ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {step.title}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`flex-1 h-1 rounded-full mx-2 transition-all duration-300 ${
                            index < currentStep ? 'bg-green-500 dark:bg-neon-cyan-500' : 'bg-gray-200 dark:bg-dark-300'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200 dark:bg-dark-100 dark:border-dark-300 dark:shadow-dark-xl">
                {steps[currentStep].component}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200 overflow-hidden dark:bg-dark-100 dark:border-dark-300 dark:shadow-dark-xl">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl dark:from-dark-200 dark:to-dark-300 dark:border-dark-400">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold dark:from-neon-cyan-500 dark:to-neon-blue-500">
                        {optimizedProfile.overallScore}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile Optimized!</h3>
                        <p className="text-gray-600 dark:text-gray-300">Your optimization score</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setOptimizedProfile(null);
                        setCurrentStep(0);
                      }}
                      className="bg-gradient-to-r from-neon-cyan-500 to-neon-blue-500 hover:from-neon-cyan-400 hover:to-neon-blue-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg hover:shadow-neon-cyan"
                    >
                      Optimize Again
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200 dark:bg-dark-100 dark:border-dark-300 dark:shadow-dark-xl">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">🎯 Key Improvements</h3>
                <div className="space-y-2">
                  {optimizedProfile.keyImprovements.map((improvement, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5 dark:text-neon-cyan-400" />
                      <p className="text-gray-700 dark:text-gray-300">{improvement}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Headline Section */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden dark:bg-dark-100 dark:border-dark-300 dark:shadow-dark-xl">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-200 dark:from-dark-200 dark:to-dark-300 dark:border-dark-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Award className="w-6 h-6 text-blue-600 dark:text-neon-cyan-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Headline Optimization</h3>
                    </div>
                    <button
                      onClick={() => handleCopyContent(optimizedProfile.headline.optimized, 'headline')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        copySuccess === 'headline'
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {copySuccess === 'headline' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copySuccess === 'headline' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Original ({optimizedProfile.headline.original.length} chars)</p>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 dark:bg-dark-200 dark:border-dark-300">
                      <p className="text-gray-700 dark:text-gray-300">{optimizedProfile.headline.original || 'No headline provided'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-neon-cyan-400 mb-2">Optimized ({optimizedProfile.headline.characterCount} chars)</p>
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200 dark:bg-neon-cyan-500/10 dark:border-neon-cyan-500/30">
                      <p className="text-gray-800 font-medium dark:text-gray-200">{optimizedProfile.headline.optimized}</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 dark:bg-dark-200 dark:border-dark-300">
                    <p className="text-sm font-medium text-blue-800 dark:text-neon-cyan-300 mb-2">💡 Why this works:</p>
                    <p className="text-gray-700 text-sm dark:text-gray-300">{optimizedProfile.headline.explanation}</p>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden dark:bg-dark-100 dark:border-dark-300 dark:shadow-dark-xl">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-gray-200 dark:from-dark-200 dark:to-dark-300 dark:border-dark-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-purple-600 dark:text-neon-purple-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">About Section Optimization</h3>
                    </div>
                    <button
                      onClick={() => handleCopyContent(optimizedProfile.about.optimized, 'about')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        copySuccess === 'about'
                          ? 'bg-green-600 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {copySuccess === 'about' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copySuccess === 'about' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Original ({optimizedProfile.about.original.length} chars)</p>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 dark:bg-dark-200 dark:border-dark-300 max-h-40 overflow-y-auto">
                      <p className="text-gray-700 whitespace-pre-wrap dark:text-gray-300">{optimizedProfile.about.original || 'No about section provided'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-neon-purple-400 mb-2">Optimized ({optimizedProfile.about.characterCount} chars)</p>
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 dark:bg-neon-purple-500/10 dark:border-neon-purple-500/30 max-h-60 overflow-y-auto">
                      <p className="text-gray-800 whitespace-pre-wrap dark:text-gray-200">{optimizedProfile.about.optimized}</p>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 dark:bg-dark-200 dark:border-dark-300">
                    <p className="text-sm font-medium text-purple-800 dark:text-neon-purple-300 mb-2">💡 Why this works:</p>
                    <p className="text-gray-700 text-sm dark:text-gray-300">{optimizedProfile.about.explanation}</p>
                  </div>
                </div>
              </div>

              {/* Experience Section */}
              {optimizedProfile.experience.optimized && (
                <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden dark:bg-dark-100 dark:border-dark-300 dark:shadow-dark-xl">
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 border-b border-gray-200 dark:from-dark-200 dark:to-dark-300 dark:border-dark-400">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-6 h-6 text-orange-600 dark:text-neon-orange-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Experience Optimization</h3>
                      </div>
                      <button
                        onClick={() => handleCopyContent(optimizedProfile.experience.optimized, 'experience')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          copySuccess === 'experience'
                            ? 'bg-green-600 text-white'
                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                        }`}
                      >
                        {copySuccess === 'experience' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copySuccess === 'experience' ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-orange-600 dark:text-neon-orange-400 mb-2">Optimized Bullets</p>
                      <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 dark:bg-neon-orange-500/10 dark:border-neon-orange-500/30">
                        <p className="text-gray-800 whitespace-pre-wrap dark:text-gray-200">{optimizedProfile.experience.optimized}</p>
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 dark:bg-dark-200 dark:border-dark-300">
                      <p className="text-sm font-medium text-orange-800 dark:text-neon-orange-300 mb-2">💡 Why this works:</p>
                      <p className="text-gray-700 text-sm dark:text-gray-300">{optimizedProfile.experience.explanation}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Skills Section */}
              {optimizedProfile.skills.optimized.length > 0 && (
                <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden dark:bg-dark-100 dark:border-dark-300 dark:shadow-dark-xl">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-gray-200 dark:from-dark-200 dark:to-dark-300 dark:border-dark-400">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target className="w-6 h-6 text-green-600 dark:text-neon-green-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Skills Optimization</h3>
                      </div>
                      <button
                        onClick={() => handleCopyContent(optimizedProfile.skills.optimized.join(', '), 'skills')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          copySuccess === 'skills'
                            ? 'bg-green-600 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {copySuccess === 'skills' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copySuccess === 'skills' ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-neon-green-400 mb-3">Recommended Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {optimizedProfile.skills.optimized.map((skill, index) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium dark:bg-neon-green-500/20 dark:text-neon-green-300 dark:border dark:border-neon-green-500/30"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200 dark:bg-dark-200 dark:border-dark-300">
                      <p className="text-sm font-medium text-green-800 dark:text-neon-green-300 mb-2">💡 Why these skills:</p>
                      <p className="text-gray-700 text-sm dark:text-gray-300">{optimizedProfile.skills.explanation}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!optimizedProfile && (
        <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 shadow-2xl dark:bg-dark-50 dark:border-dark-300">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg ${
                  currentStep === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-600 hover:bg-gray-700 text-white hover:shadow-xl transform hover:-translate-y-0.5 dark:bg-dark-300 dark:hover:bg-dark-400'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>

              <div className="text-center hidden md:block">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Progress</div>
                <div className="w-48 bg-gray-200 rounded-full h-2 dark:bg-dark-300">
                  <div
                    className="bg-gradient-to-r from-neon-cyan-500 to-neon-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>

              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!validateCurrentStep()}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg ${
                    !validateCurrentStep()
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-neon-cyan-500 to-neon-blue-500 hover:from-neon-cyan-400 hover:to-neon-blue-400 text-white hover:shadow-neon-cyan transform hover:-translate-y-0.5'
                  }`}
                >
                  <span>Next</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleOptimizeProfile}
                  disabled={!validateCurrentStep() || isOptimizing}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg ${
                    !validateCurrentStep() || isOptimizing
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-neon-cyan-500 to-neon-purple-500 hover:from-neon-cyan-400 hover:to-neon-purple-400 text-white hover:shadow-neon-cyan transform hover:-translate-y-0.5'
                  }`}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Optimizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>{isAuthenticated ? 'Optimize Profile' : 'Sign In to Optimize'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
