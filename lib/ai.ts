import Anthropic from "@anthropic-ai/sdk";
import {
  CodingLanguage,
  Difficulty,
  FeedbackResponse,
  InterviewConfig,
  QA,
  QuestionStyle,
  SuggestTopicsResponse,
} from "./types";
import {
  feedbackSystemPrompt,
  feedbackUserPrompt,
  interviewerSystemPrompt,
  nextQuestionUserPrompt,
  suggestTopicsSystemPrompt,
  suggestTopicsUserPrompt,
} from "./prompts";

// Sonnet 4.6 is much faster than Opus 4.7 for back-and-forth Q&A while still
// producing high-quality interview questions and feedback. We omit `thinking`
// entirely to keep latency low.
const MODEL = "claude-sonnet-4-6";
// Haiku for lighter side tasks (topic suggestion) — faster and cheaper, plenty
// capable for "list 5-8 topics for this JD".
const FAST_MODEL = "claude-haiku-4-5";

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set (or is empty). Add it to .env.local in the project root. If you see this from a parent shell that exports an empty ANTHROPIC_API_KEY, unset it before starting the dev server.",
    );
  }
  return new Anthropic({ apiKey });
}

const nextQuestionSchema = {
  type: "object",
  properties: {
    question: {
      type: "string",
      description:
        "The next interview question to ask the candidate. 1-3 sentences (longer if a coding prompt requires defining input/output).",
    },
    expectsCode: {
      type: "boolean",
      description:
        "true if this question expects the candidate to answer by WRITING CODE (e.g. write a SQL query, implement a function). false for conceptual/behavioral/design questions.",
    },
    codingLanguage: {
      type: "string",
      enum: [
        "python",
        "javascript",
        "typescript",
        "sql",
        "java",
        "cpp",
        "go",
        "rust",
        "csharp",
        "ruby",
        "shell",
        "other",
        "",
      ],
      description:
        "When expectsCode is true, the language the candidate should write in. Empty string when expectsCode is false.",
    },
    setupCode: {
      type: "string",
      description:
        "Sample data / setup code that should run BEFORE the candidate's code. For SQL: CREATE TABLE + INSERT statements with realistic rows. For Python: import statements and sample DataFrames/data. Empty string when no setup is needed (non-coding, or coding question with no data context).",
    },
  },
  required: ["question", "expectsCode", "codingLanguage", "setupCode"],
  additionalProperties: false,
} as const;

const feedbackSchema = {
  type: "object",
  properties: {
    overallScore: {
      type: "integer",
      description: "Overall performance score from 0 to 100.",
    },
    summary: {
      type: "string",
      description:
        "2-4 sentence holistic summary of the candidate's interview performance.",
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "Top 2-4 strengths across the interview.",
    },
    improvements: {
      type: "array",
      items: { type: "string" },
      description: "Top 2-4 areas to improve.",
    },
    perQuestion: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          strengths: { type: "string" },
          improvements: { type: "string" },
          score: {
            type: "integer",
            description: "Per-answer score 0-10.",
          },
          topic: {
            type: "string",
            description:
              "The topic label for this question, if the question was tagged with one in the transcript. Empty string otherwise.",
          },
        },
        required: [
          "question",
          "answer",
          "strengths",
          "improvements",
          "score",
          "topic",
        ],
        additionalProperties: false,
      },
    },
  },
  required: [
    "overallScore",
    "summary",
    "strengths",
    "improvements",
    "perQuestion",
  ],
  additionalProperties: false,
} as const;

const suggestTopicsSchema = {
  type: "object",
  properties: {
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short noun phrase (1-3 words)." },
          count: {
            type: "integer",
            description: "Suggested number of questions (1-3).",
          },
          style: {
            type: "string",
            enum: ["mixed", "theory", "coding"],
            description:
              "theory = no coding. coding = must write code. mixed = Q decides per question.",
          },
          difficulty: {
            type: "string",
            enum: ["adaptive", "easy", "medium", "hard"],
            description:
              "adaptive scales to candidate's level. Use easy/medium/hard only if role clearly signals seniority.",
          },
          rationale: {
            type: "string",
            description: "One sentence on why this topic is worth covering.",
          },
        },
        required: ["name", "count", "style", "difficulty", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: ["topics"],
  additionalProperties: false,
} as const;

export async function nextQuestion(
  config: InterviewConfig,
  history: QA[],
  currentTopic?: string,
  style?: QuestionStyle,
  difficulty?: Difficulty,
): Promise<{
  question: string;
  done: boolean;
  questionNumber: number;
  expectsCode: boolean;
  codingLanguage: CodingLanguage | null;
  setupCode: string;
}> {
  if (history.length >= config.totalQuestions) {
    return {
      question: "",
      done: true,
      questionNumber: history.length,
      expectsCode: false,
      codingLanguage: null,
      setupCode: "",
    };
  }

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: interviewerSystemPrompt(config),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: nextQuestionUserPrompt(
          history,
          config.totalQuestions,
          currentTopic,
          style,
          difficulty,
        ),
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: nextQuestionSchema,
      },
    },
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("No text response from AI");
  }
  const parsed = JSON.parse(text.text) as {
    question: string;
    expectsCode: boolean;
    codingLanguage: string;
    setupCode: string;
  };
  const lang =
    parsed.codingLanguage && parsed.codingLanguage !== ""
      ? (parsed.codingLanguage as CodingLanguage)
      : null;
  return {
    question: parsed.question,
    done: false,
    questionNumber: history.length + 1,
    expectsCode: !!parsed.expectsCode,
    codingLanguage: parsed.expectsCode ? lang : null,
    setupCode: parsed.expectsCode ? parsed.setupCode || "" : "",
  };
}

export async function generateFeedback(
  config: InterviewConfig,
  history: QA[],
): Promise<FeedbackResponse> {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: [
      {
        type: "text",
        text: feedbackSystemPrompt(config),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: feedbackUserPrompt(history) }],
    output_config: {
      format: {
        type: "json_schema",
        schema: feedbackSchema,
      },
    },
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("No text response from AI");
  }
  return JSON.parse(text.text) as FeedbackResponse;
}

export async function suggestTopics(
  config: InterviewConfig,
): Promise<SuggestTopicsResponse> {
  const response = await client().messages.create({
    model: FAST_MODEL,
    max_tokens: 2048,
    system: suggestTopicsSystemPrompt(),
    messages: [{ role: "user", content: suggestTopicsUserPrompt(config) }],
    output_config: {
      format: {
        type: "json_schema",
        schema: suggestTopicsSchema,
      },
    },
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("No text response from AI");
  }
  return JSON.parse(text.text) as SuggestTopicsResponse;
}
