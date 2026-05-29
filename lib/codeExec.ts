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

import { CodingLanguage } from "./types";

export type SqlTable = {
  columns: string[];
  rows: unknown[][];
  name?: string;
};

export type ExecResult = {
  stdout: string;
  stderr: string;
  ok: boolean;
  durationMs: number;
  // Populated for SQL runs that returned rows.
  tables?: SqlTable[];
};

// Which languages we can actually execute in the browser.
export function canExecute(lang: CodingLanguage): boolean {
  return lang === "python" || lang === "javascript" || lang === "sql";
}

// ---------- JavaScript: native sandboxed eval ----------

async function runJavaScript(
  source: string,
  setup?: string,
): Promise<ExecResult> {
  const fullSource = setup?.trim() ? `${setup}\n${source}` : source;
  return runJsImpl(fullSource);
}

async function runJsImpl(source: string): Promise<ExecResult> {
  const t0 = performance.now();
  const logs: string[] = [];
  const errs: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  const origWarn = console.warn;
  console.log = (...args) => {
    logs.push(args.map(formatArg).join(" "));
    origLog.apply(console, args);
  };
  console.warn = (...args) => {
    logs.push(args.map(formatArg).join(" "));
    origWarn.apply(console, args);
  };
  console.error = (...args) => {
    errs.push(args.map(formatArg).join(" "));
    origErr.apply(console, args);
  };

  try {
    // Wrap as async so users can use top-level await.
    const fn = new Function(
      `return (async () => { ${source}\n })();`,
    ) as () => Promise<unknown>;
    const result = await fn();
    if (result !== undefined) {
      logs.push(`=> ${formatArg(result)}`);
    }
    return {
      stdout: logs.join("\n"),
      stderr: errs.join("\n"),
      ok: true,
      durationMs: performance.now() - t0,
    };
  } catch (e) {
    errs.push(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    return {
      stdout: logs.join("\n"),
      stderr: errs.join("\n"),
      ok: false,
      durationMs: performance.now() - t0,
    };
  } finally {
    console.log = origLog;
    console.error = origErr;
    console.warn = origWarn;
  }
}

function formatArg(v: unknown): string {
  if (typeof v === "string") return v;
  if (v instanceof Error) return v.message;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

// ---------- Python: Pyodide loaded from CDN on first use ----------

const PYODIDE_VERSION = "0.28.4";
type PyodideInterface = {
  runPythonAsync: (src: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
};

declare global {
  interface Window {
    loadPyodide?: (opts: {
      indexURL: string;
    }) => Promise<PyodideInterface>;
    __pyodide?: PyodideInterface | Promise<PyodideInterface>;
  }
}

async function loadScriptOnce(src: string): Promise<void> {
  if (document.querySelector(`script[data-src="${src}"]`)) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function getPyodide(
  onProgress?: (msg: string) => void,
): Promise<PyodideInterface> {
  if (typeof window === "undefined") throw new Error("SSR");
  if (window.__pyodide) {
    // could be the promise or the resolved instance; await handles both
    return await window.__pyodide;
  }
  onProgress?.("Loading Pyodide (one-time ~10MB download, cached after)...");
  const promise = (async () => {
    const base = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
    await loadScriptOnce(`${base}pyodide.js`);
    if (!window.loadPyodide) {
      throw new Error("Pyodide failed to load.");
    }
    const py = await window.loadPyodide({ indexURL: base });
    return py;
  })();
  window.__pyodide = promise;
  try {
    const py = await promise;
    window.__pyodide = py;
    onProgress?.("Pyodide ready.");
    return py;
  } catch (e) {
    delete window.__pyodide;
    throw e;
  }
}

async function runPython(
  source: string,
  setup: string | undefined,
  onProgress?: (msg: string) => void,
): Promise<ExecResult> {
  const t0 = performance.now();
  const stdout: string[] = [];
  const stderr: string[] = [];
  try {
    const py = await getPyodide(onProgress);
    py.setStdout({ batched: (s) => stdout.push(s) });
    py.setStderr({ batched: (s) => stderr.push(s) });
    if (setup?.trim()) {
      await py.runPythonAsync(setup);
    }
    const result = await py.runPythonAsync(source);
    if (result !== undefined && result !== null) {
      stdout.push(`=> ${String(result)}`);
    }
    return {
      stdout: stdout.join("\n"),
      stderr: stderr.join("\n"),
      ok: !stderr.length,
      durationMs: performance.now() - t0,
    };
  } catch (e) {
    stderr.push(e instanceof Error ? e.message : String(e));
    return {
      stdout: stdout.join("\n"),
      stderr: stderr.join("\n"),
      ok: false,
      durationMs: performance.now() - t0,
    };
  }
}

// ---------- SQL: sql.js (SQLite via WebAssembly) loaded from CDN ----------

const SQLJS_VERSION = "1.13.0";

type SqlValue = number | string | Uint8Array | null;
type SqlJsResult = { columns: string[]; values: SqlValue[][] };
type SqlJsDatabase = {
  exec: (sql: string) => SqlJsResult[];
  close: () => void;
};
type SqlJsModule = {
  Database: new () => SqlJsDatabase;
};

declare global {
  interface Window {
    initSqlJs?: (config: {
      locateFile: (file: string) => string;
    }) => Promise<SqlJsModule>;
    __sqljs?: SqlJsModule | Promise<SqlJsModule>;
  }
}

async function getSqlJs(
  onProgress?: (msg: string) => void,
): Promise<SqlJsModule> {
  if (typeof window === "undefined") throw new Error("SSR");
  if (window.__sqljs) return await window.__sqljs;
  onProgress?.("Loading SQLite engine (one-time download, cached after)...");
  const promise = (async () => {
    const base = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/`;
    await loadScriptOnce(`${base}sql-wasm.js`);
    if (!window.initSqlJs) throw new Error("sql.js failed to load.");
    const SQL = await window.initSqlJs({
      locateFile: (file: string) => `${base}${file}`,
    });
    return SQL;
  })();
  window.__sqljs = promise;
  try {
    const mod = await promise;
    window.__sqljs = mod;
    onProgress?.("SQLite ready.");
    return mod;
  } catch (e) {
    delete window.__sqljs;
    throw e;
  }
}

// The SQL DB persists across Run clicks for the same setup so the user can
// explore iteratively (peek with SELECT, then write the real query). When
// `setup` changes (a new question loads), we automatically rebuild it.
// resetSqlDb() lets the user force a clean rebuild mid-question.
let sqlDb: SqlJsDatabase | null = null;
let sqlDbSetupSnapshot: string | null = null;

export function resetSqlDb(): void {
  try {
    sqlDb?.close();
  } catch {
    /* ignore */
  }
  sqlDb = null;
  sqlDbSetupSnapshot = null;
}

async function runSql(
  source: string,
  setup: string | undefined,
  onProgress?: (msg: string) => void,
): Promise<ExecResult> {
  const t0 = performance.now();
  const stdout: string[] = [];
  const stderr: string[] = [];
  const setupKey = setup ?? "";
  try {
    const SQL = await getSqlJs(onProgress);
    // Build or reuse the DB.
    if (!sqlDb || sqlDbSetupSnapshot !== setupKey) {
      try {
        sqlDb?.close();
      } catch {
        /* ignore */
      }
      sqlDb = new SQL.Database();
      sqlDbSetupSnapshot = setupKey;
      if (setupKey.trim()) {
        try {
          sqlDb.exec(setupKey);
        } catch (e) {
          stderr.push(
            `Setup error: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }
    const results = sqlDb.exec(source);
    const tables: SqlTable[] = [];
    for (const r of results) {
      tables.push({
        columns: r.columns,
        rows: r.values.map((row) =>
          row.map((v) =>
            v instanceof Uint8Array ? `<blob ${v.length}B>` : v,
          ),
        ),
      });
    }
    if (!tables.length) {
      stdout.push("(query ran ok, no rows returned)");
    } else {
      stdout.push(
        tables
          .map((t) => `${t.rows.length} row(s), ${t.columns.length} column(s)`)
          .join("; "),
      );
    }
    return {
      stdout: stdout.join("\n"),
      stderr: stderr.join("\n"),
      ok: !stderr.length,
      durationMs: performance.now() - t0,
      tables,
    };
  } catch (e) {
    stderr.push(e instanceof Error ? e.message : String(e));
    return {
      stdout: stdout.join("\n"),
      stderr: stderr.join("\n"),
      ok: false,
      durationMs: performance.now() - t0,
    };
  }
}

// ---------- Public ----------

export async function runCode(
  language: CodingLanguage,
  source: string,
  setupCode?: string,
  onProgress?: (msg: string) => void,
): Promise<ExecResult> {
  if (!source.trim()) {
    return { stdout: "", stderr: "Nothing to run.", ok: false, durationMs: 0 };
  }
  switch (language) {
    case "javascript":
      return runJavaScript(source, setupCode);
    case "python":
      return runPython(source, setupCode, onProgress);
    case "sql":
      return runSql(source, setupCode, onProgress);
    default:
      return {
        stdout: "",
        stderr: `Run is not available for ${language} in the browser. Q will grade the code itself.`,
        ok: false,
        durationMs: 0,
      };
  }
}