import { supabase } from '../lib/supabaseClient';
import { geminiService } from './geminiServiceWrapper';
import { interviewService } from './interviewService';
import {
  UserResume,
  QuestionGenerationMode,
  DynamicQuestionContext,
  GeneratedQuestion
} from '../types/resumeInterview';
import {
  InterviewQuestion,
  QuestionCategory,
  QuestionDifficulty,
  InterviewConfig
} from '../types/interview';

class HybridQuestionService {
  async selectQuestionsForInterview(
    config: InterviewConfig,
    resume: UserResume,
    totalQuestions: number = 10
  ): Promise<InterviewQuestion[]> {
    const mode: QuestionGenerationMode = 'hybrid';
    const databaseQuestionsCount = Math.ceil(totalQuestions * 0.6);
    const aiQuestionsCount = totalQuestions - databaseQuestionsCount;

    const databaseQuestions = await this.selectDatabaseQuestions(
      config,
      resume,
      databaseQuestionsCount
    );

    const aiQuestions = await this.generateAIQuestions(
      config,
      resume,
      aiQuestionsCount
    );

    const allQuestions = [...databaseQuestions, ...aiQuestions];
    return this.shuffleQuestions(allQuestions);
  }

  private async selectDatabaseQuestions(
    config: InterviewConfig,
    resume: UserResume,
    count: number
  ): Promise<InterviewQuestion[]> {
    const categories = this.getCategoriesForConfig(config);
    const difficulty = this.getDifficultyForExperience(resume.experience_level || 'junior');

    let query = supabase
      .from('interview_questions')
      .select('*')
      .eq('is_active', true)
      .eq('is_dynamic', false)
      .in('category', categories);

    if (config.companyName) {
      query = query.or(
        `interview_type.eq.general,and(interview_type.eq.company-specific,company_name.eq.${config.companyName})`
      );
    } else {
      query = query.eq('interview_type', 'general');
    }

    const { data: allQuestions, error } = await query;

    if (error) {
      console.error('Error fetching database questions:', error);
      return [];
    }

    if (!allQuestions || allQuestions.length === 0) {
      return [];
    }

    const scoredQuestions = allQuestions.map(q => ({
      question: q,
      score: this.calculateRelevanceScore(q, resume)
    }));

    scoredQuestions.sort((a, b) => b.score - a.score);

    const selected = scoredQuestions.slice(0, count).map(sq => sq.question);

    return selected;
  }

  private calculateRelevanceScore(
    question: InterviewQuestion,
    resume: UserResume
  ): number {
    let score = 0;

    const questionText = question.question_text.toLowerCase();
    const resumeSkills = resume.skills_detected.map(s => s.toLowerCase());

    resumeSkills.forEach(skill => {
      if (questionText.includes(skill)) {
        score += 10;
      }
    });

    if (question.difficulty === 'Easy') score += 1;
    else if (question.difficulty === 'Medium') score += 2;
    else if (question.difficulty === 'Hard') score += 3;

    const experienceMap: Record<string, number> = {
      entry: 1,
      junior: 2,
      mid: 3,
      senior: 4,
      lead: 5,
      executive: 6
    };

    const difficultyMap: Record<string, number> = {
      Easy: 1,
      Medium: 2,
      Hard: 3
    };

    const expLevel = experienceMap[resume.experience_level || 'junior'] || 2;
    const qDifficulty = difficultyMap[question.difficulty] || 2;

    if (Math.abs(expLevel - qDifficulty) <= 1) {
      score += 5;
    }

    return score + Math.random() * 2;
  }

  private async generateAIQuestions(
    config: InterviewConfig,
    resume: UserResume,
    count: number
  ): Promise<InterviewQuestion[]> {
    const generatedQuestions: InterviewQuestion[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const question = await this.generateSingleQuestion(config, resume, i);
        if (question) {
          generatedQuestions.push(question);
        }
      } catch (error) {
        console.error(`Failed to generate question ${i + 1}:`, error);
      }
    }

    return generatedQuestions;
  }

  async generateSingleQuestion(
    config: InterviewConfig,
    resume: UserResume,
    index: number
  ): Promise<InterviewQuestion | null> {
    const context: DynamicQuestionContext = {
      resume_id: resume.id,
      user_id: resume.user_id,
      skill_being_tested: resume.skills_detected[index % resume.skills_detected.length] || 'general',
      experience_level: resume.experience_level || 'junior',
      specific_project: resume.parsed_data?.projects?.[0]?.name,
      specific_technology: resume.skills_detected[0]
    };

    const prompt = this.buildQuestionGenerationPrompt(config, resume, context);

    try {
      const response = await geminiService.generateText(prompt);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const generated: GeneratedQuestion = JSON.parse(cleaned);

      const { data: savedQuestion, error } = await supabase
        .from('interview_questions')
        .insert({
          question_text: generated.question_text,
          category: this.mapToQuestionCategory(generated.category),
          difficulty: generated.difficulty as QuestionDifficulty,
          interview_type: config.companyName ? 'company-specific' : 'general',
          company_name: config.companyName,
          role: config.targetRole,
          is_active: true,
          is_dynamic: true,
          generated_for_user: resume.user_id,
          resume_context: context
        })
        .select()
        .single();

      if (error || !savedQuestion) {
        console.error('Failed to save generated question:', error);
        return null;
      }

      return savedQuestion;
    } catch (error) {
      console.error('AI question generation failed:', error);
      return null;
    }
  }

  private buildQuestionGenerationPrompt(
    config: InterviewConfig,
    resume: UserResume,
    context: DynamicQuestionContext
  ): string {
    return `Generate a personalized interview question based on the candidate's resume.

Resume Information:
- Experience Level: ${resume.experience_level}
- Years of Experience: ${resume.years_of_experience || 0}
- Key Skills: ${resume.skills_detected.join(', ')}
- Domains: ${resume.domains.join(', ')}
- Projects: ${resume.parsed_data?.projects?.map(p => p.name).join(', ') || 'None listed'}

Interview Configuration:
- Type: ${config.sessionType}
- Category: ${config.interviewCategory}
- Company: ${config.companyName || 'General'}
- Role: ${config.targetRole || 'Software Engineer'}

Specific Context for This Question:
- Testing Skill: ${context.skill_being_tested}
- Specific Project: ${context.specific_project || 'N/A'}
- Technology Focus: ${context.specific_technology || 'N/A'}

Generate ONE interview question that:
1. Tests the candidate's knowledge of "${context.skill_being_tested}"
2. Is appropriate for ${resume.experience_level} level candidates
3. References their specific experience or projects when relevant
4. Feels natural and conversational
5. Has clear evaluation criteria

Return a JSON object with this structure:
{
  "question_text": "Your personalized question here",
  "category": "Technical|HR|Behavioral|Coding|Projects",
  "difficulty": "Easy|Medium|Hard",
  "generation_rationale": "Why this question is relevant",
  "expected_topics": ["topic1", "topic2"],
  "resume_context": {}
}

IMPORTANT: Return ONLY the JSON object, no additional text.`;
  }

  async generateFollowUpQuestion(
    previousQuestion: InterviewQuestion,
    userAnswer: string,
    resume: UserResume
  ): Promise<InterviewQuestion | null> {
    const prompt = `Based on the candidate's answer, generate a relevant follow-up question.

Previous Question: ${previousQuestion.question_text}

Candidate's Answer: ${userAnswer}

Resume Context:
- Skills: ${resume.skills_detected.join(', ')}
- Experience Level: ${resume.experience_level}

Generate a follow-up question that:
1. Probes deeper into their answer
2. Validates their claimed skills
3. Is appropriate for their experience level
4. Feels like a natural conversation

Return JSON with: {"question_text": "...", "category": "...", "difficulty": "...", "generation_rationale": "...", "expected_topics": []}`;

    try {
      const response = await geminiService.generateText(prompt);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const generated: GeneratedQuestion = JSON.parse(cleaned);

      const { data: savedQuestion, error } = await supabase
        .from('interview_questions')
        .insert({
          question_text: generated.question_text,
          category: this.mapToQuestionCategory(generated.category),
          difficulty: generated.difficulty as QuestionDifficulty,
          interview_type: 'general',
          is_active: true,
          is_dynamic: true,
          generated_for_user: resume.user_id,
          source_question_id: previousQuestion.id,
          resume_context: {
            resume_id: resume.id,
            user_id: resume.user_id,
            skill_being_tested: 'follow-up',
            experience_level: resume.experience_level || 'junior',
            previous_answers: [userAnswer]
          }
        })
        .select()
        .single();

      if (error || !savedQuestion) {
        return null;
      }

      return savedQuestion;
    } catch (error) {
      console.error('Follow-up question generation failed:', error);
      return null;
    }
  }

  private getCategoriesForConfig(config: InterviewConfig): QuestionCategory[] {
    if (config.interviewCategory === 'technical') {
      return ['Technical', 'Coding', 'Projects'];
    } else if (config.interviewCategory === 'hr') {
      return ['HR', 'Behavioral'];
    } else {
      return ['Technical', 'HR', 'Behavioral', 'Coding', 'Projects'];
    }
  }

  private getDifficultyForExperience(level: string): QuestionDifficulty[] {
    switch (level) {
      case 'entry':
      case 'junior':
        return ['Easy', 'Medium'];
      case 'mid':
        return ['Medium', 'Hard'];
      case 'senior':
      case 'lead':
      case 'executive':
        return ['Medium', 'Hard'];
      default:
        return ['Easy', 'Medium', 'Hard'];
    }
  }

  private mapToQuestionCategory(category: string): QuestionCategory {
    const normalized = category.toLowerCase();
    if (normalized.includes('tech')) return 'Technical';
    if (normalized.includes('hr')) return 'HR';
    if (normalized.includes('behavior')) return 'Behavioral';
    if (normalized.includes('cod')) return 'Coding';
    if (normalized.includes('project')) return 'Projects';
    return 'Technical';
  }

  private shuffleQuestions(questions: InterviewQuestion[]): InterviewQuestion[] {
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const hybridQuestionService = new HybridQuestionService();
