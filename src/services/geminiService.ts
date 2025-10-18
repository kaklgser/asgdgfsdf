// src/services/geminiService.ts
import { ResumeData, UserType, AdditionalSection } from '../types/resume';

const AGENTROUTER_API_KEY = import.meta.env.VITE_AGENTROUTER_API_KEY;
if (!AGENTROUTER_API_KEY) {
  throw new Error('AgentRouter API key missing. Add VITE_AGENTROUTER_API_KEY to environment variables.');
}

export const AGENTROUTER_API_URL = "https://api.agentrouter.ai/v1/chat/completions";
export const MAX_INPUT_LENGTH = 50000;
export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY_MS = 1000;

const deepCleanComments = (val: any): any => {
  const strip = (input: string): string => {
    let c = input.replace(/\/\*[\s\S]*?\*\//g, '');
    c = c.replace(/\/\/\s*Line\s*\d+\s*/g, '');
    const lines = c.split(/\r?\n/).map(line => {
      if (/^\s*\/\//.test(line)) return '';
      const i = line.indexOf('//');
      if (i !== -1) {
        const before = line.slice(0, i);
        if (!before.includes('://')) return line.slice(0, i).trimEnd();
      }
      return line;
    });
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };
  if (typeof val === 'string') return strip(val);
  if (Array.isArray(val)) return val.map(deepCleanComments);
  if (val && typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(val)) out[k] = deepCleanComments(val[k]);
    return out;
  }
  return val;
};

const safeFetch = async (options: RequestInit, maxRetries = MAX_RETRIES): Promise<Response> => {
  let retries = 0, delay = INITIAL_RETRY_DELAY_MS;
  while (retries < maxRetries) {
    try {
      const res = await fetch(AGENTROUTER_API_URL, options);
      if (!res.ok) {
        const text = await res.text();
        let msg = `AgentRouter error ${res.status}`;
        try {
          const j = JSON.parse(text);
          if (j.error?.message) msg = `${j.error.message} (Code: ${j.error.code || res.status})`;
        } catch {}
        if (res.status === 400) throw new Error(`Bad Request: ${msg}`);
        if (res.status === 401) throw new Error(`Unauthorized: ${msg}`);
        if (res.status === 402) throw new Error(`Insufficient Credits: ${msg}`);
        if (res.status === 429 || res.status >= 500) {
          retries++; if (retries >= maxRetries) throw new Error(`Failed after ${maxRetries} retries: ${msg}`);
          await new Promise(r => setTimeout(r, delay)); delay *= 2; continue;
        }
        throw new Error(msg);
      }
      return res;
    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        retries++; if (retries >= maxRetries) throw new Error(`Network error after ${maxRetries} retries: ${err.message}`);
        await new Promise(r => setTimeout(r, delay)); delay *= 2; continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed after ${maxRetries} retries`);
};

export const optimizeResume = async (
  resume: string,
  jobDescription: string,
  userType: UserType,
  userName?: string,
  userEmail?: string,
  userPhone?: string,
  userLinkedin?: string,
  userGithub?: string,
  linkedinUrl?: string,
  githubUrl?: string,
  targetRole?: string,
  additionalSections?: AdditionalSection[]
): Promise<ResumeData> => {
  if (resume.length + jobDescription.length > MAX_INPUT_LENGTH)
    throw new Error(`Input too long. Max ${MAX_INPUT_LENGTH} chars.`);

  const prompt = `You are an AI Resume Optimizer using GPT-5.
Analyze the resume and job description, then return an optimized JSON resume.
Resume:\n${resume}\n\nJob Description:\n${jobDescription}\n\nUser Type: ${userType}`;

  const response = await safeFetch({
    method: "POST",
    headers: {
      Authorization: `Bearer ${AGENTROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://primoboost.ai",
      "X-Title": "PrimoBoost AI"
    },
    body: JSON.stringify({
      model: "openai/gpt-5",
      messages: [{ role: "user", content: prompt }]
    }),
  });

  const data = await response.json();
  let raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("No content from AgentRouter");
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
  let cleaned = jsonMatch?.[1]?.trim() || raw.replace(/```json|```/g, '').trim();
  let parsed = JSON.parse(cleaned);
  parsed = deepCleanComments(parsed);
  parsed.origin = 'jd_optimized';
  return parsed;
};

export const generateAtsOptimizedSection = async (
  sectionType: string,
  data: any,
  modelOverride?: string,
  draftText?: string
): Promise<string | string[]> => {
  const prompt = `Use GPT-5 to generate ATS-optimized ${sectionType} section.\nData:\n${JSON.stringify(data)}\nDraft:\n${draftText || ''}`;
  const response = await safeFetch({
    method: "POST",
    headers: {
      Authorization: `Bearer ${AGENTROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://primoboost.ai",
      "X-Title": "PrimoBoost AI"
    },
    body: JSON.stringify({
      model: modelOverride || "openai/gpt-5",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const j = await response.json();
  let r = j?.choices?.[0]?.message?.content;
  if (!r) throw new Error('No response from AgentRouter');
  r = r.replace(/```json|```/g, '').trim();
  try { return JSON.parse(r); }
  catch { return r.split('\n').filter(l => l.trim()); }
};

export interface CompanyDescriptionParams {
  companyName: string;
  roleTitle: string;
  jobDescription: string;
  qualification: string;
  domain: string;
  experienceRequired: string;
}

export const generateCompanyDescription = async (p: CompanyDescriptionParams): Promise<string> => {
  const prompt = `You are a GPT-5 professional writer.
Create a 2–3 paragraph "About the Company" section for a job listing.

Company: ${p.companyName}
Role: ${p.roleTitle}
Domain: ${p.domain}
Experience: ${p.experienceRequired}
Job Description: ${p.jobDescription}
Qualification: ${p.qualification}

Guidelines:
- Keep tone professional and concise (150–250 words)
- No fictional data or stats
- Emphasize company strengths and opportunities`;

  const response = await safeFetch({
    method: "POST",
    headers: {
      Authorization: `Bearer ${AGENTROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://primoboost.ai",
      "X-Title": "PrimoBoost AI"
    },
    body: JSON.stringify({
      model: "openai/gpt-5",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await response.json();
  let t = d?.choices?.[0]?.message?.content;
  if (!t) throw new Error("No response from AgentRouter");
  return t.replace(/```markdown|```/g, '').trim();
};
