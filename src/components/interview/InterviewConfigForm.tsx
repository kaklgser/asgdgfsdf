import React, { useState } from 'react';
import { ArrowLeft, Clock, Briefcase, Target } from 'lucide-react';
import {
  InterviewType,
  InterviewCategory,
  InterviewConfig,
  POPULAR_COMPANIES,
  TECHNICAL_DOMAINS,
  DURATION_OPTIONS
} from '../../types/interview';

interface InterviewConfigFormProps {
  interviewType: InterviewType;
  onConfigComplete: (config: InterviewConfig) => void;
  onBack: () => void;
}

export const InterviewConfigForm: React.FC<InterviewConfigFormProps> = ({
  interviewType,
  onConfigComplete,
  onBack
}) => {
  const [category, setCategory] = useState<InterviewCategory | ''>('');
  const [companyName, setCompanyName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [domain, setDomain] = useState('');
  const [duration, setDuration] = useState(15);

  const selectedCompany = POPULAR_COMPANIES.find(c => c.name === companyName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      alert('Please select an interview category');
      return;
    }

    if (interviewType === 'company-based' && !companyName) {
      alert('Please select a company');
      return;
    }

    const config: InterviewConfig = {
      sessionType: interviewType,
      interviewCategory: category as InterviewCategory,
      companyName: interviewType === 'company-based' ? companyName : undefined,
      targetRole: targetRole || undefined,
      domain: category === 'technical' ? domain : undefined,
      durationMinutes: duration
    };

    onConfigComplete(config);
  };

  const isFormValid = category && (interviewType === 'general' || companyName);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-dark-100 dark:via-dark-50 dark:to-dark-100">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-secondary-600 hover:text-secondary-900 dark:text-gray-400 dark:hover:text-gray-200 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="bg-white dark:bg-dark-200 rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-secondary-900 dark:text-gray-100 mb-2">
              Configure Your Interview
            </h2>
            <p className="text-secondary-600 dark:text-gray-400">
              {interviewType === 'general' ? 'General Mock Interview' : 'Company-Based Interview'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {interviewType === 'company-based' && (
              <div>
                <label className="block text-sm font-semibold text-secondary-900 dark:text-gray-100 mb-3">
                  <Building2 className="inline w-4 h-4 mr-2" />
                  Select Company
                </label>
                <select
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setTargetRole('');
                  }}
                  className="w-full px-4 py-3 border-2 border-secondary-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-300 dark:text-gray-100 transition-all"
                  required
                >
                  <option value="">Choose a company...</option>
                  {POPULAR_COMPANIES.map((company) => (
                    <option key={company.name} value={company.name}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {interviewType === 'company-based' && selectedCompany && (
              <div>
                <label className="block text-sm font-semibold text-secondary-900 dark:text-gray-100 mb-3">
                  <Target className="inline w-4 h-4 mr-2" />
                  Select Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-secondary-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-300 dark:text-gray-100 transition-all"
                >
                  <option value="">Choose a role...</option>
                  {selectedCompany.roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-secondary-900 dark:text-gray-100 mb-3">
                Interview Category
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCategory('technical')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    category === 'technical'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                      : 'border-secondary-200 dark:border-dark-300 hover:border-blue-300'
                  }`}
                >
                  <div className="font-semibold text-secondary-900 dark:text-gray-100">Technical</div>
                  <div className="text-sm text-secondary-600 dark:text-gray-400">Coding & Tech</div>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('hr')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    category === 'hr'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400'
                      : 'border-secondary-200 dark:border-dark-300 hover:border-purple-300'
                  }`}
                >
                  <div className="font-semibold text-secondary-900 dark:text-gray-100">HR</div>
                  <div className="text-sm text-secondary-600 dark:text-gray-400">Behavioral & Soft Skills</div>
                </button>
              </div>
            </div>

            {category === 'technical' && (
              <div>
                <label className="block text-sm font-semibold text-secondary-900 dark:text-gray-100 mb-3">
                  <Briefcase className="inline w-4 h-4 mr-2" />
                  Technical Domain (Optional)
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-secondary-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-300 dark:text-gray-100 transition-all"
                >
                  <option value="">Choose a domain...</option>
                  {TECHNICAL_DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {interviewType === 'general' && (
              <div>
                <label className="block text-sm font-semibold text-secondary-900 dark:text-gray-100 mb-3">
                  <Target className="inline w-4 h-4 mr-2" />
                  Target Role (Optional)
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g., Software Engineer, Data Analyst"
                  className="w-full px-4 py-3 border-2 border-secondary-200 dark:border-dark-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-300 dark:text-gray-100 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-secondary-900 dark:text-gray-100 mb-3">
                <Clock className="inline w-4 h-4 mr-2" />
                Interview Duration: {duration} minutes
              </label>
              <input
                type="range"
                min={DURATION_OPTIONS[0]}
                max={DURATION_OPTIONS[DURATION_OPTIONS.length - 1]}
                step={5}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-secondary-200 dark:bg-dark-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-secondary-600 dark:text-gray-400 mt-2">
                {DURATION_OPTIONS.map((d) => (
                  <span key={d}>{d}m</span>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-dark-300 rounded-lg p-4">
              <h4 className="font-semibold text-secondary-900 dark:text-gray-100 mb-2">
                📝 Interview Summary
              </h4>
              <ul className="text-sm text-secondary-700 dark:text-gray-300 space-y-1">
                <li>• Type: {interviewType === 'general' ? 'General' : 'Company-Based'}</li>
                {companyName && <li>• Company: {companyName}</li>}
                {targetRole && <li>• Role: {targetRole}</li>}
                <li>• Category: {category || 'Not selected'}</li>
                {domain && <li>• Domain: {domain}</li>}
                <li>• Duration: {duration} minutes</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={!isFormValid}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                isFormValid
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                  : 'bg-secondary-300 dark:bg-dark-300 cursor-not-allowed'
              }`}
            >
              Start Interview
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

function Building2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
