/**
 * © 2026 Chep-koech (https://github.com/Chep-koech).
 * Part of Prep.ai. All rights reserved.
 *
 * This source is published for portfolio viewing purposes only. No
 * permission is granted to copy, modify, redistribute, or use any
 * portion of this code in your own project without explicit written
 * permission from the author.
 */
export type Role = {
  id: string;
  label: string;
  blurb: string;
};

export type CodingLanguage =
  | "python"
  | "javascript"
  | "typescript"
  | "sql"
  | "java"
  | "cpp"
  | "go"
  | "rust"
  | "csharp"
  | "ruby"
  | "shell"
  | "other";

export type CodeSubmission = {
  language: CodingLanguage;
  source: string;
  setupCode?: string;
  output?: string;
};

export type QA = {
  question: string;
  answer: string;
  topic?: string;
  expectsCode?: boolean;
  codingLanguage?: CodingLanguage | null;
  code?: CodeSubmission;
};

export type QuestionStyle = "mixed" | "theory" | "coding";
export type Difficulty = "adaptive" | "easy" | "medium" | "hard";

export const QUESTION_STYLES: { value: QuestionStyle; label: string; blurb: string }[] = [
  { value: "mixed", label: "Mixed", blurb: "Q decides per question (theory or coding)." },
  { value: "theory", label: "Theory", blurb: "Conceptual questions only — no coding." },
  { value: "coding", label: "Coding", blurb: "Hands-on code questions only." },
];

export const DIFFICULTIES: { value: Difficulty; label: string; blurb: string }[] = [
  { value: "adaptive", label: "Adaptive", blurb: "Scales up or down based on how you're doing." },
  { value: "easy", label: "Easy", blurb: "Foundational, intro-level questions." },
  { value: "medium", label: "Medium", blurb: "Applied, intermediate practitioner level." },
  { value: "hard", label: "Hard", blurb: "Edge cases, optimization, senior level." },
];

export type Topic = {
  name: string;
  count: number;
  style?: QuestionStyle;
  difficulty?: Difficulty;
};

export type TopicAssignment = {
  name: string;
  style: QuestionStyle;
  difficulty: Difficulty;
};

export type InterviewMode = "role" | "jd";

type CommonConfig = {
  totalQuestions: number;
  topics?: Topic[];
};

export type InterviewConfig =
  | (CommonConfig & {
      mode: "role";
      roleId: string;
      roleLabel: string;
    })
  | (CommonConfig & {
      mode: "jd";
      companyName: string;
      jobDescription: string;
    });

export type NextQuestionResponse = {
  question: string;
  done: boolean;
  questionNumber: number;
  totalQuestions: number;
  expectsCode?: boolean;
  codingLanguage?: CodingLanguage | null;
  topic?: string | null;
  setupCode?: string;
};

export const CODING_LANGUAGES: { value: CodingLanguage; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "sql", label: "SQL" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "csharp", label: "C#" },
  { value: "ruby", label: "Ruby" },
  { value: "shell", label: "Shell / Bash" },
  { value: "other", label: "Other" },
];

// Heuristic — does the topic name suggest a coding language?
export function guessLanguageFromTopic(
  topic: string | null | undefined,
): CodingLanguage | null {
  if (!topic) return null;
  const t = topic.toLowerCase();
  if (/\bpython\b|pandas|numpy|django|flask|pytorch|tensorflow/.test(t))
    return "python";
  if (/\bsql\b|postgres|mysql|snowflake|databricks|bigquery|warehouse|dbt/.test(t))
    return "sql";
  if (/\bjavascript\b|node|react|express\b/.test(t)) return "javascript";
  if (/\btypescript\b|\bts\b/.test(t)) return "typescript";
  if (/\bjava\b/.test(t) && !/javascript/.test(t)) return "java";
  if (/c\+\+|cpp/.test(t)) return "cpp";
  if (/golang|\bgo\b/.test(t)) return "go";
  if (/\brust\b/.test(t)) return "rust";
  if (/c#|csharp|\.net/.test(t)) return "csharp";
  if (/\bruby\b|rails/.test(t)) return "ruby";
  if (/bash|shell|linux command/.test(t)) return "shell";
  return null;
}

export type PerQuestionFeedback = {
  question: string;
  answer: string;
  strengths: string;
  improvements: string;
  score: number;
  topic?: string;
  code?: CodeSubmission;
};

export type FeedbackResponse = {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  perQuestion: PerQuestionFeedback[];
};

export type SuggestedTopic = {
  name: string;
  count: number;
  style: QuestionStyle;
  difficulty: Difficulty;
  rationale?: string;
};

export type SuggestTopicsResponse = {
  topics: SuggestedTopic[];
};

export const DEFAULT_QUESTIONS = 5;
export const QUESTION_OPTIONS = [3, 5, 10, 15, 20, 30];
export const MAX_JD_LENGTH = 30000;
export const MAX_TOTAL_QUESTIONS = 50;

export const ROLES: Role[] = [
  {
    id: "software-engineer",
    label: "Software Engineer",
    blurb: "Coding, system design, debugging, and engineering judgment.",
  },
  {
    id: "data-scientist",
    label: "Data Scientist",
    blurb: "Statistics, ML fundamentals, data wrangling, and analysis.",
  },
  {
    id: "product-manager",
    label: "Product Manager",
    blurb: "Prioritization, user empathy, metrics, and execution.",
  },
  {
    id: "ux-designer",
    label: "UX Designer",
    blurb: "Research, interaction design, critique, and design systems.",
  },
  {
    id: "marketing",
    label: "Marketing",
    blurb: "Positioning, growth, campaigns, and metrics.",
  },
  {
    id: "general-behavioral",
    label: "Behavioral (any role)",
    blurb: "Teamwork, conflict, leadership, and culture-fit questions.",
  },
];

export function configLabel(config: InterviewConfig): string {
  if (config.mode === "role") return config.roleLabel;
  return config.companyName
    ? `${config.companyName} (from job description)`
    : "Custom interview (from job description)";
}

// Build an interleaved queue of TopicAssignment from a list of topics with counts.
// e.g. [{Python:5,coding,medium}, {SQL:3,mixed,adaptive}] interleaves so questions
// don't bunch up by topic.
export function buildTopicQueue(topics: Topic[]): TopicAssignment[] {
  const remaining = topics
    .filter((t) => t.count > 0 && t.name.trim())
    .map((t) => ({
      name: t.name.trim(),
      count: Math.floor(t.count),
      style: t.style ?? "mixed",
      difficulty: t.difficulty ?? "adaptive",
    }));
  const queue: TopicAssignment[] = [];
  let safety = 1000;
  while (remaining.some((t) => t.count > 0) && safety-- > 0) {
    for (const t of remaining) {
      if (t.count > 0) {
        queue.push({ name: t.name, style: t.style, difficulty: t.difficulty });
        t.count -= 1;
      }
    }
  }
  return queue;
}

export function totalFromTopics(topics: Topic[]): number {
  return topics.reduce((acc, t) => acc + Math.max(0, Math.floor(t.count)), 0);
}