"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./Button";
import TopicEditor from "./TopicEditor";
import {
  InterviewConfig,
  MAX_JD_LENGTH,
  MAX_TOTAL_QUESTIONS,
  ROLES,
  Role,
  SuggestTopicsResponse,
  Topic,
  totalFromTopics,
} from "@/lib/types";

type Props = {
  onStart: (config: InterviewConfig) => void;
};

type Tab = "role" | "jd";

export default function InterviewSetup({ onStart }: Props) {
  const [tab, setTab] = useState<Tab>("role");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);

  const suggestFor = useCallback(
    async (configForSuggest: Partial<InterviewConfig>) => {
      setSuggesting(true);
      setSuggestError(null);
      try {
        const res = await fetch("/api/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: configForSuggest }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed (${res.status})`);
        }
        const data: SuggestTopicsResponse = await res.json();
        setTopics(
          data.topics.map((t) => ({
            name: t.name,
            count: Math.max(1, Math.min(3, t.count)),
            style: t.style,
            difficulty: t.difficulty,
          })),
        );
        setSuggestionsLoaded(true);
      } catch (e) {
        setSuggestError(
          e instanceof Error ? e.message : "Couldn't get suggestions.",
        );
      } finally {
        setSuggesting(false);
      }
    },
    [],
  );

  const resetTopics = () => {
    setTopics([]);
    setSuggestionsLoaded(false);
    setSuggestError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Set up your interview</h2>
        <p className="text-gray-400">
          Pick a role for a generic interview, or paste a job description for
          a tailored one. Then choose how many questions per topic.
        </p>
      </div>

      <div className="flex border-b border-gray-800">
        <TabButton
          active={tab === "role"}
          onClick={() => {
            setTab("role");
            resetTopics();
          }}
        >
          Pick a role
        </TabButton>
        <TabButton
          active={tab === "jd"}
          onClick={() => {
            setTab("jd");
            resetTopics();
          }}
        >
          Use a job description
        </TabButton>
      </div>

      {tab === "role" && (
        <RoleTab
          topics={topics}
          setTopics={setTopics}
          suggesting={suggesting}
          suggestError={suggestError}
          suggestionsLoaded={suggestionsLoaded}
          onSuggest={(role) =>
            suggestFor({
              mode: "role",
              roleId: role.id,
              roleLabel: role.label,
            })
          }
          onStart={(role) =>
            onStart({
              mode: "role",
              roleId: role.id,
              roleLabel: role.label,
              totalQuestions: totalFromTopics(topics),
              topics,
            })
          }
        />
      )}

      {tab === "jd" && (
        <JdTab
          topics={topics}
          setTopics={setTopics}
          suggesting={suggesting}
          suggestError={suggestError}
          suggestionsLoaded={suggestionsLoaded}
          onSuggest={(companyName, jobDescription) =>
            suggestFor({ mode: "jd", companyName, jobDescription })
          }
          onStart={(companyName, jobDescription) =>
            onStart({
              mode: "jd",
              companyName,
              jobDescription,
              totalQuestions: totalFromTopics(topics),
              topics,
            })
          }
        />
      )}

      <div className="pt-2">
        <Button variant="ghost" onClick={() => (window.location.href = "/")}>
          Back home
        </Button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
        active
          ? "border-blue-500 text-white"
          : "border-transparent text-gray-400 hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

type TopicEditorProps = {
  topics: Topic[];
  setTopics: (t: Topic[]) => void;
  suggesting: boolean;
  suggestError: string | null;
  suggestionsLoaded: boolean;
};

function RoleTab(
  props: TopicEditorProps & {
    onSuggest: (role: Role) => void;
    onStart: (role: Role) => void;
  },
) {
  const [selected, setSelected] = useState<Role | null>(null);
  const topicsRef = useRef<HTMLDivElement | null>(null);
  const total = totalFromTopics(props.topics);
  const canStart =
    !!selected && total > 0 && total <= MAX_TOTAL_QUESTIONS;

  // When suggestion kicks off, scroll the topic editor into view so the spinner is visible.
  useEffect(() => {
    if (props.suggesting && topicsRef.current) {
      topicsRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [props.suggesting]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ROLES.map((role) => (
          <button
            key={role.id}
            onClick={() => {
              // Switching to a different role wipes old topics and re-suggests.
              // Same-role re-click only re-suggests if user hasn't started yet.
              if (selected?.id !== role.id) {
                setSelected(role);
                props.setTopics([]);
                props.onSuggest(role);
              } else if (props.topics.length === 0) {
                props.onSuggest(role);
              }
            }}
            className={`text-left border rounded-xl p-5 transition ${
              selected?.id === role.id
                ? "bg-blue-950/40 border-blue-500"
                : "bg-gray-900 border-gray-700 hover:bg-gray-800 hover:border-blue-500"
            }`}
          >
            <h3 className="text-lg font-semibold mb-1">{role.label}</h3>
            <p className="text-sm text-gray-400">{role.blurb}</p>
          </button>
        ))}
      </div>

      <div ref={topicsRef}>
        <TopicEditor
          topics={props.topics}
          onChange={props.setTopics}
          onSuggest={selected ? () => props.onSuggest(selected) : undefined}
          suggesting={props.suggesting}
          suggestError={props.suggestError}
          suggestionsLoaded={props.suggestionsLoaded}
        />
      </div>

      <CostHint total={total} />

      <Button
        onClick={() => selected && props.onStart(selected)}
        disabled={!canStart}
      >
        {total === 0
          ? "Add at least one topic to start"
          : `Start ${total}-question interview`}
      </Button>
    </div>
  );
}

function JdTab(
  props: TopicEditorProps & {
    onSuggest: (companyName: string, jobDescription: string) => void;
    onStart: (companyName: string, jobDescription: string) => void;
  },
) {
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileError(null);
    setFileInfo(null);
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File too large (max 10MB).");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }
      const data: {
        text: string;
        truncated: boolean;
        filename: string;
        method: string;
      } = await res.json();
      setJobDescription(data.text);
      const methodLabel =
        data.method === "pdf"
          ? "PDF"
          : data.method === "docx"
            ? "Word document"
            : "text";
      setFileInfo(
        `Loaded ${methodLabel} (${data.filename}, ${data.text.length.toLocaleString()} chars)${
          data.truncated ? ` — trimmed to ${MAX_JD_LENGTH.toLocaleString()} chars` : ""
        }.`,
      );
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Could not read file.");
    } finally {
      setUploading(false);
    }
  };

  const jdReady = jobDescription.trim().length >= 50;
  const overLimit = jobDescription.length > MAX_JD_LENGTH;
  const total = totalFromTopics(props.topics);
  const canStart = jdReady && !overLimit && total > 0 && total <= MAX_TOTAL_QUESTIONS;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm text-gray-300 font-medium">
          Company name <span className="text-gray-500">(optional)</span>
        </label>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Stripe, Shopify, your local employer..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm text-gray-300 font-medium">
            Job description
          </label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-blue-400 hover:text-blue-300 underline disabled:opacity-50"
            >
              {uploading ? "Reading file..." : "Upload file (PDF, DOCX, TXT...)"}
            </button>
            {jobDescription && (
              <button
                onClick={() => {
                  setJobDescription("");
                  setFileError(null);
                  setFileInfo(null);
                }}
                className="text-xs text-gray-500 hover:text-gray-300 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here — responsibilities, required skills, tools (SQL, Python, Databricks, Tableau, etc.), seniority. The more detail, the more tailored Q's questions will be."
          rows={12}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm resize-y"
        />
        <div className="flex justify-between text-xs">
          <span className={overLimit ? "text-red-400" : "text-gray-500"}>
            {jobDescription.length.toLocaleString()} /{" "}
            {MAX_JD_LENGTH.toLocaleString()} chars
          </span>
          {!jdReady && jobDescription.length > 0 && (
            <span className="text-amber-400">
              Add a bit more detail (at least 50 chars)
            </span>
          )}
        </div>
        {fileError && <p className="text-sm text-amber-400">{fileError}</p>}
        {fileInfo && !fileError && (
          <p className="text-sm text-green-400">{fileInfo}</p>
        )}
      </div>

      <TopicEditor
        topics={props.topics}
        onChange={props.setTopics}
        onSuggest={
          jdReady
            ? () => props.onSuggest(companyName.trim(), jobDescription.trim())
            : undefined
        }
        suggesting={props.suggesting}
        suggestError={props.suggestError}
        suggestionsLoaded={props.suggestionsLoaded}
      />

      <CostHint total={total} />

      <Button
        onClick={() => props.onStart(companyName.trim(), jobDescription.trim())}
        disabled={!canStart}
      >
        {!jdReady
          ? "Paste the JD first"
          : total === 0
            ? "Add at least one topic to start"
            : `Start ${total}-question tailored interview`}
      </Button>
    </div>
  );
}

function CostHint({ total }: { total: number }) {
  if (total === 0) return null;
  return (
    <p className="text-xs text-gray-500">
      About ${(total * 0.015 + 0.05).toFixed(2)} USD on Sonnet 4.6
      {total >= 15
        ? " · plan ~45-60 min"
        : total >= 10
          ? " · plan ~25-40 min"
          : " · plan ~10-20 min"}
    </p>
  );
}
