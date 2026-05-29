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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { oneDark } from "@codemirror/theme-one-dark";
import Button from "./Button";
import {
  canExecute,
  ExecResult,
  resetSqlDb,
  runCode,
  SqlTable,
} from "@/lib/codeExec";
import { CODING_LANGUAGES, CodeSubmission, CodingLanguage } from "@/lib/types";

type Props = {
  language: CodingLanguage;
  onLanguageChange: (lang: CodingLanguage) => void;
  source: string;
  onSourceChange: (s: string) => void;
  notes: string;
  onNotesChange: (s: string) => void;
  setupCode?: string;
  onSubmit: (submission: CodeSubmission, notes: string) => void;
  onSwitchToText: () => void;
  disabled?: boolean;
  submitting?: boolean;
};

function langExtension(lang: CodingLanguage) {
  switch (lang) {
    case "python":
      return [python()];
    case "sql":
      return [sql()];
    case "javascript":
    case "typescript":
      return [javascript({ typescript: lang === "typescript" })];
    case "java":
      return [java()];
    case "cpp":
      return [cpp()];
    case "rust":
      return [rust()];
    case "go":
      return [go()];
    default:
      return [];
  }
}

export function starterFor(lang: CodingLanguage): string {
  switch (lang) {
    case "python":
      return "# Write your Python here\n";
    case "javascript":
      return "// Write your JavaScript here\n// Use console.log(...) to print\n";
    case "typescript":
      return "// Write your TypeScript here\n";
    case "sql":
      return "-- Write your SQL here\n";
    case "java":
      return "// Write your Java here\npublic class Solution {\n  public static void main(String[] args) {\n    \n  }\n}\n";
    case "cpp":
      return "// Write your C++ here\n#include <iostream>\nint main() {\n  \n  return 0;\n}\n";
    case "go":
      return "// Write your Go here\npackage main\nimport \"fmt\"\nfunc main() {\n  \n}\n";
    case "rust":
      return "// Write your Rust here\nfn main() {\n  \n}\n";
    case "csharp":
      return "// Write your C# here\n";
    case "ruby":
      return "# Write your Ruby here\n";
    case "shell":
      return "# Write your shell commands here\n";
    default:
      return "";
  }
}

export default function CodeAnswer({
  language,
  onLanguageChange,
  source,
  onSourceChange,
  notes,
  onNotesChange,
  setupCode,
  onSubmit,
  onSwitchToText,
  disabled,
  submitting,
}: Props) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecResult | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(true);

  // Initialize source with starter when language changes and source is empty
  const initializedFor = useRef<CodingLanguage | null>(null);
  useEffect(() => {
    if (!source.trim() && initializedFor.current !== language) {
      onSourceChange(starterFor(language));
      initializedFor.current = language;
    }
  }, [language, source, onSourceChange]);

  // Reset run result when the question changes (setup code change is a good proxy).
  // Also tear down the persistent SQL DB so the next Run starts fresh.
  useEffect(() => {
    setResult(null);
    resetSqlDb();
  }, [setupCode]);

  const extensions = useMemo(() => langExtension(language), [language]);
  const setupExtensions = useMemo(() => langExtension(language), [language]);
  const executable = canExecute(language);
  const hasSetup = !!setupCode?.trim();

  // Treat starter-template or whitespace-only as "no answer".
  const trimmedSource = source.trim();
  const starterTrimmed = starterFor(language).trim();
  const looksUnchanged =
    !trimmedSource ||
    trimmedSource === starterTrimmed ||
    trimmedSource.length < 5;

  const handleRun = useCallback(async () => {
    setRunning(true);
    setProgress(null);
    setResult(null);
    try {
      const r = await runCode(language, source, setupCode, (msg) =>
        setProgress(msg),
      );
      setResult(r);
      setProgress(null);
    } finally {
      setRunning(false);
    }
  }, [language, source, setupCode]);

  const handleSubmit = () => {
    let outputText: string | undefined;
    if (result) {
      const tableText = (result.tables ?? [])
        .map((t) => renderTableAsText(t))
        .join("\n\n");
      outputText =
        [
          result.stdout,
          tableText,
          result.stderr ? `[stderr]\n${result.stderr}` : "",
        ]
          .filter(Boolean)
          .join("\n")
          .trim() || undefined;
    }
    const submission: CodeSubmission = {
      language,
      source,
      setupCode: setupCode || undefined,
      output: outputText,
    };
    onSubmit(submission, notes);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-300">Language:</label>
          <select
            value={language}
            onChange={(e) =>
              onLanguageChange(e.target.value as CodingLanguage)
            }
            disabled={disabled}
            className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            {CODING_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          {!executable && (
            <span
              className="text-xs text-gray-500"
              title="Run isn't available for this language in the browser. Q will still grade the code you submit."
            >
              (run not available)
            </span>
          )}
        </div>
        <button
          onClick={onSwitchToText}
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Switch to text answer
        </button>
      </div>

      {hasSetup && (
        <div className="border border-emerald-900/70 rounded-xl bg-emerald-950/20">
          <button
            onClick={() => setShowSetup((v) => !v)}
            className="w-full text-left px-3 py-2 flex items-center justify-between text-sm text-emerald-300 hover:text-emerald-200"
          >
            <span>
              📋 Sample data Q set up for you (runs automatically before your
              code)
            </span>
            <span className="text-xs">{showSetup ? "hide" : "show"}</span>
          </button>
          {showSetup && (
            <div className="border-t border-emerald-900/50">
              <CodeMirror
                value={setupCode ?? ""}
                height="auto"
                maxHeight="200px"
                theme={oneDark}
                extensions={setupExtensions}
                editable={false}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: false,
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="border border-gray-700 rounded-xl overflow-hidden">
        <CodeMirror
          value={source}
          height="320px"
          theme={oneDark}
          extensions={extensions}
          onChange={onSourceChange}
          editable={!disabled}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            bracketMatching: true,
            autocompletion: true,
            tabSize: 2,
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          onClick={handleRun}
          disabled={disabled || running || !executable}
        >
          {running ? "Running..." : executable ? "▶ Run code" : "Run unavailable"}
        </Button>
        {language === "sql" && hasSetup && (
          <button
            onClick={() => {
              resetSqlDb();
              setResult(null);
            }}
            disabled={disabled || running}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 disabled:opacity-50"
            title="Discard any changes you made to the database (DELETE, UPDATE, DROP, etc.) and restore the original sample tables on the next Run."
          >
            ↻ Reset DB
          </button>
        )}
        {progress && <span className="text-xs text-gray-400">{progress}</span>}
        {result && !running && (
          <span
            className={`text-xs ${result.ok ? "text-green-400" : "text-amber-400"}`}
          >
            {result.ok ? "✓ ran ok" : "× ran with errors"} in{" "}
            {Math.round(result.durationMs)}ms
          </span>
        )}
        {language === "sql" && hasSetup && (
          <span
            className="text-xs text-gray-500"
            title="The SQL DB stays alive between Run clicks so you can explore step by step. Use Reset DB to start over."
          >
            (DB persists between runs)
          </span>
        )}
      </div>

      {result && (result.stdout || result.stderr || result.tables?.length) && (
        <div className="border border-gray-700 rounded-xl bg-black/60">
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-800">
            Output
          </div>
          {result.tables && result.tables.length > 0 && (
            <div className="p-3 space-y-3 border-b border-gray-800">
              {result.tables.map((t, idx) => (
                <SqlTableView key={idx} table={t} />
              ))}
            </div>
          )}
          {(result.stdout || result.stderr) && (
            <pre className="p-3 text-sm font-mono whitespace-pre-wrap overflow-x-auto max-h-64">
              {result.stdout && (
                <span className="text-gray-200">{result.stdout}</span>
              )}
              {result.stderr && (
                <span className="text-red-400">
                  {result.stdout ? "\n" : ""}
                  {result.stderr}
                </span>
              )}
            </pre>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm text-gray-300">
          Notes <span className="text-gray-500">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={disabled}
          rows={3}
          placeholder="Explain your approach, complexity, trade-offs... Q will read this alongside the code."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 resize-y"
        />
      </div>

      <div className="flex justify-end items-center gap-3">
        {looksUnchanged && (
          <span className="text-xs text-amber-400">
            Write some code (or click &ldquo;Switch to text answer&rdquo; above)
          </span>
        )}
        <Button
          onClick={handleSubmit}
          disabled={disabled || submitting || looksUnchanged}
        >
          {submitting ? "Submitting..." : "Submit code"}
        </Button>
      </div>
    </div>
  );
}

function SqlTableView({ table }: { table: SqlTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-gray-700">
        <thead className="bg-gray-800">
          <tr>
            {table.columns.map((c, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left border-b border-gray-700 text-gray-200 font-semibold"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr
              key={r}
              className={r % 2 === 0 ? "bg-gray-900/40" : "bg-gray-900/10"}
            >
              {row.map((cell, c) => (
                <td
                  key={c}
                  className="px-3 py-2 border-b border-gray-800/50 text-gray-200 font-mono"
                >
                  {cell === null
                    ? <span className="text-gray-500">NULL</span>
                    : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.rows.length === 0 && (
        <p className="px-3 py-2 text-xs text-gray-500 italic">
          (0 rows returned)
        </p>
      )}
    </div>
  );
}

// For submission: turn a SQL result table into a text representation Q can read.
function renderTableAsText(t: SqlTable): string {
  const header = t.columns.join(" | ");
  const sep = t.columns.map(() => "---").join(" | ");
  const body = t.rows
    .map((row) =>
      row.map((c) => (c === null ? "NULL" : String(c))).join(" | "),
    )
    .join("\n");
  return `${header}\n${sep}\n${body}`;
}