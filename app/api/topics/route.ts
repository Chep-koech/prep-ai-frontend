import { NextRequest, NextResponse } from "next/server";
import { suggestTopics } from "@/lib/ai";
import { InterviewConfig, MAX_JD_LENGTH } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

function validateConfig(c: unknown): InterviewConfig | string {
  if (!c || typeof c !== "object") return "config is missing";
  const cfg = c as {
    mode?: string;
    roleId?: string;
    roleLabel?: string;
    companyName?: string;
    jobDescription?: string;
  };
  if (cfg.mode !== "role" && cfg.mode !== "jd") {
    return "config.mode must be 'role' or 'jd'";
  }
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
      totalQuestions: 0, // not used for suggestion
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
    totalQuestions: 0,
  };
}

export async function POST(req: NextRequest) {
  let body: { config?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const configOrErr = validateConfig(body.config);
  if (typeof configOrErr === "string") {
    return NextResponse.json({ error: configOrErr }, { status: 400 });
  }
  try {
    const result = await suggestTopics(configOrErr);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Topics API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
