"use client";

import { FeedbackResponse, InterviewConfig, QA } from "./types";

const KEY = "prepai.history.v1";
const MAX_ENTRIES = 50;

export type HistoryEntry = {
  id: string;
  completedAt: number;
  label: string;
  overallScore: number;
  totalQuestions: number;
  questionsAnswered: number;
  config: InterviewConfig;
  history: QA[];
  feedback: FeedbackResponse;
};

function newId(): string {
  return `hist_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function listHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryEntry[];
    if (!Array.isArray(arr)) return [];
    return arr.sort((a, b) => b.completedAt - a.completedAt);
  } catch {
    return [];
  }
}

export function saveHistoryEntry(
  config: InterviewConfig,
  history: QA[],
  feedback: FeedbackResponse,
  label: string,
): HistoryEntry {
  const entry: HistoryEntry = {
    id: newId(),
    completedAt: Date.now(),
    label,
    overallScore: feedback.overallScore,
    totalQuestions: config.totalQuestions,
    questionsAnswered: history.length,
    config,
    history,
    feedback,
  };
  const current = listHistory();
  const next = [entry, ...current].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.warn("Failed to save history entry:", e);
  }
  return entry;
}

export function deleteHistoryEntry(id: string): void {
  const next = listHistory().filter((e) => e.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.warn("Failed to delete history entry:", e);
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
