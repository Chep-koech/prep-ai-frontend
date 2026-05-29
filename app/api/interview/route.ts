import { NextRequest, NextResponse } from "next/server";
import { generateFeedback, nextQuestion } from "@/lib/ai";
import {
  Difficulty,
  InterviewConfig,
  MAX_JD_LENGTH,
  MAX_TOTAL_QUESTIONS,
  QA,
  QuestionStyle,
  Topic,
} from "@/lib/types";

const STYLES = new Set(["mixed", "theory", "coding"]);
const DIFFS = new Set(["adaptive", "easy", "medium", "hard"]);

export const runtime = "nodejs";
export const maxDuration = 60;

type Body =
  | {
      action: "next";
      config: InterviewConfig;
      history: QA[];
      currentTopic?: string;
      style?: string;
      difficulty?: string;
    }
  | { action: "feedback"; config: InterviewConfig; history: QA[] };

function validateTopics(raw: unknown): Topic[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const out: Topic[] = [];
  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    const obj = t as {
      name?: unknown;
      count?: unknown;
      style?: unknown;
      difficulty?: unknown;
    };
    if (typeof obj.name !== "string" || !obj.name.trim()) continue;
    const n = Number(obj.count);
    if (!Number.isFinite(n) || n < 1) continue;
    const style =
      typeof obj.style === "string" && STYLES.has(obj.style)
        ? (obj.style as QuestionStyle)
        : "mixed";
    const difficulty =
      typeof obj.difficulty === "string" && DIFFS.has(obj.difficulty)
        ? (obj.difficulty as Difficulty)
        : "adaptive";
    out.push({
      name: obj.name.trim(),
      count: Math.floor(n),
      style,
      difficulty,
    });
  }
  return out.length > 0 ? out : undefined;
}

function validateConfig(c: unknown): InterviewConfig | string {
  if (!c || typeof c !== "object") return "config is missing";
  const cfg = c as {
    mode?: string;
    roleId?: string;
    roleLabel?: string;
    companyName?: string;
    jobDescription?: string;
    totalQuestions?: number;
    topics?: unknown;
  };
  if (cfg.mode !== "role" && cfg.mode !== "jd") {
    return "config.mode must be 'role' or 'jd'";
  }
  if (
    typeof cfg.totalQuestions !== "number" ||
    cfg.totalQuestions < 1 ||
    cfg.totalQuestions > MAX_TOTAL_QUESTIONS
  ) {
    return `config.totalQuestions must be a number between 1 and ${MAX_TOTAL_QUESTIONS}`;
  }
  const topics = validateTopics(cfg.topics);
  if (cfg.mode === "role") {
    if (typeof cfg.roleId !== "string" || !cfg.roleId) {
      return "config.roleId is required for role mode";
    }
    if (typeof cfg.roleLabel !== "string" || !cfg.roleLabel) {
      return "config.roleLabel is required for role mode";
    }
    return {
      mode: "role",
      roleId: cfg.roleId,
      roleLabel: cfg.roleLabel,
      totalQuestions: cfg.totalQuestions,
      topics,
    };
  }
  if (typeof cfg.jobDescription !== "string" || !cfg.jobDescription.trim()) {
    return "config.jobDescription is required for jd mode";
  }
  if (cfg.jobDescription.length > MAX_JD_LENGTH) {
    return `jobDescription too long (max ${MAX_JD_LENGTH} chars)`;
  }
  return {
    mode: "jd",
    companyName: (cfg.companyName ?? "").trim(),
    jobDescription: cfg.jobDescription.trim(),
    totalQuestions: cfg.totalQuestions,
    topics,
  };
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || !Array.isArray(body.history)) {
    return NextResponse.json(
      { error: "Missing history array" },
      { status: 400 },
    );
  }
  const configOrErr = validateConfig(body.config);
  if (typeof configOrErr === "string") {
    return NextResponse.json({ error: configOrErr }, { status: 400 });
  }
  const config = configOrErr;

  try {
    if (body.action === "next") {
      const currentTopic =
        typeof body.currentTopic === "string" && body.currentTopic.trim()
          ? body.currentTopic.trim()
          : undefined;
      const style =
        typeof body.style === "string" && STYLES.has(body.style)
          ? (body.style as QuestionStyle)
          : undefined;
      const difficulty =
        typeof body.difficulty === "string" && DIFFS.has(body.difficulty)
          ? (body.difficulty as Difficulty)
          : undefined;
      const result = await nextQuestion(
        config,
        body.history,
        currentTopic,
        style,
        difficulty,
      );
      return NextResponse.json({
        ...result,
        topic: currentTopic ?? null,
      });
    }
    if (body.action === "feedback") {
      const result = await generateFeedback(config, body.history);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Interview API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
