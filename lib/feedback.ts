/**
 * © 2026 Chep-koech (https://github.com/Chep-koech).
 * Part of Prep.ai. All rights reserved.
 *
 * This source is published for portfolio viewing purposes only. No
 * permission is granted to copy, modify, redistribute, or use any
 * portion of this code in your own project without explicit written
 * permission from the author.
 */
"use client";

const KEY = "prepai.feedback.v1";

export type FeedbackContext = {
  // Where the feedback was triggered from.
  source: "report" | "header" | "other";
  // Optional context about the last interview when source === "report".
  interviewLabel?: string;
  overallScore?: number;
};

export type FeedbackPayload = {
  id: string;
  rating: number; // 1-5
  whatWorked: string;
  whatToImprove: string;
  contactEmail?: string;
  context: FeedbackContext;
  userAgent: string;
  submittedAt: number;
};

function newId(): string {
  return `fb_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function listLocalFeedback(): FeedbackPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as FeedbackPayload[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function submitFeedback(input: {
  rating: number;
  whatWorked: string;
  whatToImprove: string;
  contactEmail?: string;
  context: FeedbackContext;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload: FeedbackPayload = {
    id: newId(),
    rating: input.rating,
    whatWorked: input.whatWorked.trim(),
    whatToImprove: input.whatToImprove.trim(),
    contactEmail: input.contactEmail?.trim() || undefined,
    context: input.context,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    submittedAt: Date.now(),
  };

  // Save locally first (works even if the network call fails).
  try {
    const current = listLocalFeedback();
    localStorage.setItem(KEY, JSON.stringify([payload, ...current].slice(0, 100)));
  } catch (e) {
    console.warn("Failed to persist feedback locally:", e);
  }

  // Best-effort POST to the server endpoint (logs to console for now;
  // can be hooked up to email/Slack/database later).
  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error ?? `Server returned ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}