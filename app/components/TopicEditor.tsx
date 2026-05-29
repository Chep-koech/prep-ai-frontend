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

import { useState } from "react";
import {
  DIFFICULTIES,
  Difficulty,
  MAX_TOTAL_QUESTIONS,
  QUESTION_STYLES,
  QuestionStyle,
  Topic,
  totalFromTopics,
} from "@/lib/types";

type Props = {
  topics: Topic[];
  onChange: (topics: Topic[]) => void;
  onSuggest?: () => void;
  suggesting?: boolean;
  suggestError?: string | null;
  suggestionsLoaded?: boolean;
};

export default function TopicEditor({
  topics,
  onChange,
  onSuggest,
  suggesting,
  suggestError,
  suggestionsLoaded,
}: Props) {
  const [newTopic, setNewTopic] = useState("");
  const total = totalFromTopics(topics);
  const overLimit = total > MAX_TOTAL_QUESTIONS;

  const update = (i: number, patch: Partial<Topic>) => {
    const copy = topics.slice();
    copy[i] = { ...copy[i], ...patch };
    onChange(copy);
  };
  const remove = (i: number) => {
    onChange(topics.filter((_, idx) => idx !== i));
  };
  const add = (name: string, count = 1) => {
    const clean = name.trim();
    if (!clean) return;
    if (
      topics.some(
        (t) => t.name.toLowerCase() === clean.toLowerCase(),
      )
    ) {
      return; // already exists
    }
    onChange([...topics, { name: clean, count }]);
    setNewTopic("");
  };
  const adjust = (i: number, delta: number) => {
    const next = Math.max(0, topics[i].count + delta);
    update(i, { count: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm text-gray-300 font-medium">
          Topics{" "}
          <span className="text-gray-500">
            ({total} question{total === 1 ? "" : "s"} total)
          </span>
        </label>
        {onSuggest && (
          <button
            onClick={onSuggest}
            disabled={suggesting}
            className="text-xs text-blue-400 hover:text-blue-300 underline disabled:opacity-50"
          >
            {suggesting
              ? "Q is suggesting topics..."
              : suggestionsLoaded
                ? "Re-suggest topics"
                : "Suggest topics with Q"}
          </button>
        )}
      </div>

      {suggestError && (
        <p className="text-sm text-amber-400">{suggestError}</p>
      )}

      {suggesting && (
        <div
          className="border border-blue-700 bg-blue-950/40 rounded-lg p-4 flex items-center gap-3"
          aria-live="polite"
        >
          <svg
            className="h-5 w-5 animate-spin text-blue-400 flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-30"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <div>
            <p className="text-sm text-blue-200 font-medium">
              Q is analyzing this and picking topics for you...
            </p>
            <p className="text-xs text-blue-300/70">
              Usually takes 3-5 seconds.
            </p>
          </div>
        </div>
      )}

      {topics.length === 0 && !suggesting && (
        <p className="text-sm text-gray-500 italic">
          No topics yet. Click &ldquo;Suggest topics&rdquo; above, or add one
          manually below.
        </p>
      )}

      <ul className="space-y-2">
        {topics.map((t, i) => {
          const style: QuestionStyle = t.style ?? "mixed";
          const difficulty: Difficulty = t.difficulty ?? "adaptive";
          return (
            // Stable index-only key — name-based key would remount the input on
            // every keystroke and steal focus from the textbox the user is typing in.
            <li
              key={i}
              className="flex items-center flex-wrap gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2"
            >
              <input
                value={t.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="flex-1 min-w-[120px] bg-transparent text-white focus:outline-none"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => adjust(i, -1)}
                  disabled={t.count <= 0}
                  className="h-7 w-7 rounded bg-gray-800 hover:bg-gray-700 text-white text-lg font-bold leading-none disabled:opacity-30"
                  aria-label="Decrease count"
                >
                  −
                </button>
                <span className="w-8 text-center text-white font-mono">
                  {t.count}
                </span>
                <button
                  onClick={() => adjust(i, 1)}
                  className="h-7 w-7 rounded bg-gray-800 hover:bg-gray-700 text-white text-lg font-bold leading-none"
                  aria-label="Increase count"
                >
                  +
                </button>
              </div>
              <select
                value={style}
                onChange={(e) =>
                  update(i, { style: e.target.value as QuestionStyle })
                }
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                title={
                  QUESTION_STYLES.find((s) => s.value === style)?.blurb ?? ""
                }
              >
                {QUESTION_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={difficulty}
                onChange={(e) =>
                  update(i, { difficulty: e.target.value as Difficulty })
                }
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                title={
                  DIFFICULTIES.find((d) => d.value === difficulty)?.blurb ?? ""
                }
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => remove(i)}
                className="text-gray-500 hover:text-red-400 text-sm"
                aria-label="Remove topic"
                title="Remove topic"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      {topics.length > 0 && (
        <p className="text-xs text-gray-500">
          Per-topic controls: count, style (mixed / theory / coding), and
          difficulty (adaptive / easy / medium / hard). Hover any dropdown for
          details.
        </p>
      )}

      <div className="flex gap-2">
        <input
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(newTopic);
            }
          }}
          placeholder="Add a custom topic (e.g. Snowflake, A/B testing, Leadership)"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => add(newTopic)}
          disabled={!newTopic.trim()}
          className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm border border-gray-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {overLimit && (
        <p className="text-sm text-red-400">
          Too many questions ({total}). Max is {MAX_TOTAL_QUESTIONS}.
        </p>
      )}
      {total > 0 && total < 3 && (
        <p className="text-xs text-amber-400">
          Tip: at least 3 questions makes for a useful report.
        </p>
      )}
    </div>
  );
}