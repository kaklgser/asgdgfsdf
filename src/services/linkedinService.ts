const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  throw new Error('OpenRouter API key is not configured. Please add VITE_OPENROUTER_API_KEY to your environment variables.');
}

interface ProfileOptimizationForm {
  headline: string;
  about: string;
  experience: string;
  skills: string;
  achievements: string;
  targetRole: string;
  industry: string;
  tone: 'professional' | 'conversational' | 'ambitious';
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

export const optimizeLinkedInProfile = async (formData: ProfileOptimizationForm): Promise<OptimizedProfile> => {
  const prompt = `You are a LinkedIn profile optimization expert with deep knowledge of recruiter search algorithms, ATS systems, and professional branding.

PROFILE TO OPTIMIZE:
Target Role: ${formData.targetRole}
Industry: ${formData.industry}
Seniority Level: ${formData.seniorityLevel}
Desired Tone: ${formData.tone}

Current Headline: ${formData.headline || 'Not provided'}
Current About Section: ${formData.about || 'Not provided'}
Experience Details: ${formData.experience || 'Not provided'}
Skills: ${formData.skills || 'Not provided'}
Achievements: ${formData.achievements || 'Not provided'}

TASK: Optimize this LinkedIn profile to maximize visibility, engagement, and recruiter interest.

Provide optimization suggestions in the following JSON format:

{
  "headline": {
    "optimized": "string (max 220 characters, include role, value prop, keywords)",
    "explanation": "string (why this headline is effective)"
  },
  "about": {
    "optimized": "string (compelling about section with clear structure, emojis for visual appeal, 300-600 chars)",
    "explanation": "string (what makes this about section strong)"
  },
  "experience": {
    "optimized": "string (3-5 bullet points with action verbs, metrics, and impact)",
    "explanation": "string (how these bullets demonstrate value)"
  },
  "skills": {
    "optimized": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7", "skill8", "skill9", "skill10"],
    "explanation": "string (why these skills matter for the role)"
  },
  "achievements": {
    "optimized": ["achievement1", "achievement2", "achievement3", "achievement4"],
    "explanation": "string (how achievements differentiate the candidate)"
  },
  "overallScore": number (1-100, profile optimization score),
  "keyImprovements": ["improvement1", "improvement2", "improvement3", "improvement4", "improvement5"]
}

OPTIMIZATION GUIDELINES:
1. Headline: Include role + industry keywords + unique value proposition
2. About: Use storytelling, quantify impact, add visual breaks with emojis, include CTA
3. Experience: Start with strong action verbs, quantify results with %, $, or numbers
4. Skills: Mix hard skills (technical) and soft skills (leadership, communication)
5. Achievements: Highlight awards, recognitions, and measurable wins
6. Use keywords that recruiters search for in ${formData.industry}
7. Tone should be ${formData.tone}
8. Optimize for ${formData.seniorityLevel} level positioning

Respond ONLY with valid JSON. No markdown, no code blocks, just the JSON object.`;

  const maxRetries = 3;
  let retryCount = 0;
  let delay = 1000;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          "HTTP-Referer": "https://primoboost.ai",
          "X-Title": "PrimoBoost AI"
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1:free",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error response:', errorText);

        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenRouter API key configuration.');
        } else if (response.status === 429 || response.status >= 500) {
          console.warn(`Retrying due to OpenRouter API error: ${response.status}. Attempt ${retryCount + 1}/${maxRetries}. Retrying in ${delay / 1000}s...`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        } else {
          throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      let result = data?.choices?.[0]?.message?.content;

      if (!result) {
        throw new Error('No response content from OpenRouter API');
      }

      result = result.trim();
      if (result.startsWith('```json')) {
        result = result.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (result.startsWith('```')) {
        result = result.replace(/```\n?/g, '');
      }

      let optimizationData;
      try {
        optimizationData = JSON.parse(result);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', result);
        throw new Error('Invalid JSON response from AI. Please try again.');
      }

      const optimizedProfile: OptimizedProfile = {
        headline: {
          original: formData.headline,
          optimized: optimizationData.headline?.optimized || formData.headline,
          explanation: optimizationData.headline?.explanation || 'Optimized for clarity and impact',
          characterCount: (optimizationData.headline?.optimized || formData.headline).length
        },
        about: {
          original: formData.about,
          optimized: optimizationData.about?.optimized || formData.about,
          explanation: optimizationData.about?.explanation || 'Enhanced for engagement',
          characterCount: (optimizationData.about?.optimized || formData.about).length
        },
        experience: {
          original: formData.experience,
          optimized: optimizationData.experience?.optimized || formData.experience,
          explanation: optimizationData.experience?.explanation || 'Strengthened with metrics and action verbs'
        },
        skills: {
          original: formData.skills,
          optimized: Array.isArray(optimizationData.skills?.optimized)
            ? optimizationData.skills.optimized
            : [],
          explanation: optimizationData.skills?.explanation || 'Curated for role relevance'
        },
        achievements: {
          original: formData.achievements,
          optimized: Array.isArray(optimizationData.achievements?.optimized)
            ? optimizationData.achievements.optimized
            : [],
          explanation: optimizationData.achievements?.explanation || 'Highlighted measurable accomplishments'
        },
        overallScore: optimizationData.overallScore || 75,
        keyImprovements: Array.isArray(optimizationData.keyImprovements)
          ? optimizationData.keyImprovements
          : ['Profile optimized for better visibility']
      };

      return optimizedProfile;

    } catch (error) {
      console.error('Error calling OpenRouter API:', error);

      if (error instanceof Error && (
          error.message.includes('API key') ||
          error.message.includes('Rate limit') ||
          error.message.includes('service is temporarily unavailable')
      )) {
        throw error;
      }

      if (retryCount === maxRetries - 1) {
        throw new Error('Failed to optimize LinkedIn profile after multiple attempts.');
      }

      retryCount++;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error(`Failed to optimize LinkedIn profile after ${maxRetries} attempts.`);
};
