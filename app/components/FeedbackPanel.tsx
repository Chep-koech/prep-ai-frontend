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

import { FeedbackResponse } from "@/lib/types";
import Button from "./Button";

type Props = {
  feedback: FeedbackResponse;
  onRestart: () => void;
  onBackHome?: () => void;
  onPracticeAgain?: () => void;
};

function scoreColor(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-green-400";
  if (pct >= 60) return "text-yellow-400";
  return "text-red-400";
}

export default function FeedbackPanel({
  feedback,
  onRestart,
  onBackHome,
  onPracticeAgain,
}: Props) {
  return (
    <div className="space-y-8">
      <div className="border border-gray-700 rounded-xl p-6 bg-gray-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold">Your interview report</h2>
          <div className="text-right">
            <p className="text-sm text-gray-400">Overall score</p>
            <p
              className={`text-4xl font-bold ${scoreColor(
                feedback.overallScore,
                100,
              )}`}
            >
              {feedback.overallScore}
              <span className="text-lg text-gray-500">/100</span>
            </p>
          </div>
        </div>
        <p className="text-gray-200 leading-relaxed">{feedback.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-green-900/60 rounded-xl p-5 bg-green-950/20">
          <h3 className="font-semibold text-green-300 mb-3">Strengths</h3>
          <ul className="space-y-2 text-gray-200">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-green-400">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-amber-900/60 rounded-xl p-5 bg-amber-950/20">
          <h3 className="font-semibold text-amber-300 mb-3">Improvements</h3>
          <ul className="space-y-2 text-gray-200">
            {feedback.improvements.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-400">!</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Per-question breakdown</h3>
        {feedback.perQuestion.map((q, i) => (
          <div
            key={i}
            className="border border-gray-700 rounded-xl p-5 bg-gray-900 space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-gray-500">Question {i + 1}</p>
                  {q.topic && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-700 text-blue-300">
                      {q.topic}
                    </span>
                  )}
                </div>
                <p className="font-medium">{q.question}</p>
              </div>
              <div className={`text-2xl font-bold ${scoreColor(q.score, 10)}`}>
                {q.score}
                <span className="text-sm text-gray-500">/10</span>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-3 space-y-2">
              {q.code ? (
                <>
                  {q.answer && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Your notes</p>
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {q.answer}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Your code ({q.code.language})
                    </p>
                    <pre className="bg-black/60 border border-gray-800 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap overflow-x-auto text-gray-200">
                      {q.code.source}
                    </pre>
                  </div>
                  {q.code.output && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Output</p>
                      <pre className="bg-black/60 border border-gray-800 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap overflow-x-auto text-gray-200">
                        {q.code.output}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Your answer</p>
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {q.answer || "(no answer given)"}
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-gray-800 pt-3">
              <div>
                <p className="text-xs text-green-400 mb-1">What worked</p>
                <p className="text-sm text-gray-300">{q.strengths}</p>
              </div>
              <div>
                <p className="text-xs text-amber-400 mb-1">What to improve</p>
                <p className="text-sm text-gray-300">{q.improvements}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        {onPracticeAgain && (
          <Button variant="secondary" onClick={onPracticeAgain}>
            Practice this same interview again
          </Button>
        )}
        <Button onClick={onRestart}>Try a different interview</Button>
        <Button
          variant="ghost"
          onClick={() => {
            onBackHome?.();
            window.location.href = "/";
          }}
        >
          Back home
        </Button>
      </div>
    </div>
  );
}