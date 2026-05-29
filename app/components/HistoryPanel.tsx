"use client";

import { useState } from "react";
import {
  deleteHistoryEntry,
  HistoryEntry,
  listHistory,
} from "@/lib/history";
import Button from "./Button";
import FeedbackPanel from "./FeedbackPanel";
import { InterviewConfig } from "@/lib/types";

type Props = {
  onClose: () => void;
  onPracticeAgain: (config: InterviewConfig) => void;
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPanel({ onClose, onPracticeAgain }: Props) {
  // Lazy init — listHistory() returns [] on SSR which matches initial client render.
  const [entries, setEntries] = useState<HistoryEntry[]>(() => listHistory());
  const [viewing, setViewing] = useState<HistoryEntry | null>(null);

  if (viewing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setViewing(null)}
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            ← Back to history
          </button>
          <Button
            onClick={() => onPracticeAgain(viewing.config)}
            variant="primary"
          >
            Practice this again
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          {viewing.label} · {formatDate(viewing.completedAt)} ·{" "}
          {viewing.questionsAnswered} of {viewing.totalQuestions} questions
          answered
        </p>
        <FeedbackPanel
          feedback={viewing.feedback}
          onRestart={() => onPracticeAgain(viewing.config)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Your interview history</h2>
          <p className="text-sm text-gray-400">
            {entries.length} completed{" "}
            {entries.length === 1 ? "interview" : "interviews"}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {entries.length === 0 && (
        <div className="border border-gray-800 rounded-xl p-10 bg-gray-900/40 text-center">
          <p className="text-gray-300">No completed interviews yet.</p>
          <p className="text-sm text-gray-500 mt-1">
            Finish an interview and the report will be saved here.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {entries.map((e) => (
          <li
            key={e.id}
            className="border border-gray-700 rounded-xl p-4 bg-gray-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <p className={`text-2xl font-bold ${scoreColor(e.overallScore)}`}>
                  {e.overallScore}
                  <span className="text-sm text-gray-500">/100</span>
                </p>
                <p className="font-medium truncate">{e.label}</p>
              </div>
              <p className="text-xs text-gray-500">
                {formatDate(e.completedAt)} · {e.questionsAnswered}/
                {e.totalQuestions} questions
                {e.config.topics &&
                  ` · ${e.config.topics.map((t) => t.name).join(", ")}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="ghost" onClick={() => setViewing(e)}>
                View report
              </Button>
              <Button onClick={() => onPracticeAgain(e.config)}>
                Practice again
              </Button>
              <button
                onClick={() => {
                  if (confirm(`Delete this entry from your history?`)) {
                    deleteHistoryEntry(e.id);
                    setEntries(listHistory());
                  }
                }}
                className="text-xs text-gray-500 hover:text-red-400 underline px-2"
                aria-label="Delete entry"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
