"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import QuestionCard from "../components/QuestionCard";
import TextAnswer from "../components/TextAnswer";
import Timer from "../components/Timer";
import InterviewSetup from "../components/InterviewSetup";
import FeedbackPanel from "../components/FeedbackPanel";
import Button from "../components/Button";
import VoiceToggle from "../components/VoiceToggle";

// CodeMirror is heavy (~150KB); only load it when a coding question actually shows up.
const CodeAnswer = dynamic(() => import("../components/CodeAnswer"), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-700 rounded-xl p-6 bg-gray-900 text-gray-400 text-sm">
      Loading code editor...
    </div>
  ),
});
import HistoryPanel from "../components/HistoryPanel";
import FeedbackForm from "../components/FeedbackForm";
import { UserButton } from "@clerk/nextjs";
import {
  buildTopicQueue,
  CodeSubmission,
  CodingLanguage,
  configLabel,
  FeedbackResponse,
  guessLanguageFromTopic,
  InterviewConfig,
  QA,
  TopicAssignment,
} from "@/lib/types";
import { useSpeech } from "@/lib/speech";
import { saveHistoryEntry } from "@/lib/history";

type Stage =
  | "setup"
  | "interviewing"
  | "loading-feedback"
  | "report"
  | "history";

const TOTAL_TIME = 30 * 60;
const VOICE_KEY = "prepai.voiceMode";
const VOICE_NAME_KEY = "prepai.voiceName";
const SESSION_KEY = "prepai.session.v1";

type SavedSession = {
  stage: Stage;
  config: InterviewConfig | null;
  history: QA[];
  currentQuestion: string;
  currentTopic: string | null;
  questionNumber: number;
  draftAnswer: string;
  answerMode: "text" | "code";
  codeLanguage: CodingLanguage;
  codeSource: string;
  codeNotes: string;
  setupCode: string;
  feedback: FeedbackResponse | null;
  savedAt: number;
};

export default function PracticePage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [history, setHistory] = useState<QA[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [answerMode, setAnswerMode] = useState<"text" | "code">("text");
  const [codeLanguage, setCodeLanguage] = useState<CodingLanguage>("python");
  const [codeSource, setCodeSource] = useState("");
  const [codeNotes, setCodeNotes] = useState("");
  const [setupCode, setSetupCode] = useState<string>("");
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const [lastSpokenQuestion, setLastSpokenQuestion] = useState<string>("");
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const hydratedRef = useRef(false);

  const speech = useSpeech({ preferredVoiceName: voiceName });

  // Topic queue derived from config (if topics are set)
  const topicQueue = useMemo(
    () => (config?.topics ? buildTopicQueue(config.topics) : []),
    [config],
  );

  useEffect(() => {
    const saved = localStorage.getItem(VOICE_KEY);
    if (saved === "1") setVoiceMode(true);
    const savedVoice = localStorage.getItem(VOICE_NAME_KEY);
    if (savedVoice) setVoiceName(savedVoice);

    // Restore previous interview session if there was one in progress
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw) as SavedSession;
        // If the saved session was on the report screen, drop it — the report
        // is terminal; we don't want it blocking a fresh "Start interview" click.
        if (s.stage === "report") {
          localStorage.removeItem(SESSION_KEY);
          hydratedRef.current = true;
          return;
        }
        // Treat a saved "loading-feedback" as still interviewing (incomplete)
        const stageToRestore: Stage =
          s.stage === "loading-feedback" ? "interviewing" : s.stage;
        if (stageToRestore !== "setup" && s.config) {
          setStage(stageToRestore);
          setConfig(s.config);
          setHistory(s.history ?? []);
          setCurrentQuestion(s.currentQuestion ?? "");
          setCurrentTopic(s.currentTopic ?? null);
          setQuestionNumber(s.questionNumber ?? 0);
          setDraftAnswer(s.draftAnswer ?? "");
          setAnswerMode(s.answerMode ?? "text");
          setCodeLanguage(s.codeLanguage ?? "python");
          setCodeSource(s.codeSource ?? "");
          setCodeNotes(s.codeNotes ?? "");
          setSetupCode(s.setupCode ?? "");
          setFeedback(s.feedback ?? null);
          setTimerRunning(stageToRestore === "interviewing");
          setRestoredAt(s.savedAt ?? Date.now());
        }
      }
    } catch (e) {
      console.warn("Failed to restore session:", e);
      localStorage.removeItem(SESSION_KEY);
    }
    hydratedRef.current = true;
  }, []);

  // Persist on every state change once hydrated. setup stage clears storage.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (stage === "setup") {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    const session: SavedSession = {
      stage,
      config,
      history,
      currentQuestion,
      currentTopic,
      questionNumber,
      draftAnswer,
      answerMode,
      codeLanguage,
      codeSource,
      codeNotes,
      setupCode,
      feedback,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn("Failed to save session:", e);
    }
  }, [
    stage,
    config,
    history,
    currentQuestion,
    currentTopic,
    questionNumber,
    draftAnswer,
    answerMode,
    codeLanguage,
    codeSource,
    codeNotes,
    setupCode,
    feedback,
  ]);

  useEffect(() => {
    localStorage.setItem(VOICE_KEY, voiceMode ? "1" : "0");
    if (!voiceMode) speech.stopSpeaking();
  }, [voiceMode, speech]);

  useEffect(() => {
    if (voiceName) localStorage.setItem(VOICE_NAME_KEY, voiceName);
    else localStorage.removeItem(VOICE_NAME_KEY);
  }, [voiceName]);

  useEffect(() => {
    if (
      voiceMode &&
      stage === "interviewing" &&
      currentQuestion &&
      currentQuestion !== lastSpokenQuestion &&
      !loadingQuestion
    ) {
      speech.speak(currentQuestion);
      setLastSpokenQuestion(currentQuestion);
    }
  }, [
    voiceMode,
    stage,
    currentQuestion,
    lastSpokenQuestion,
    loadingQuestion,
    speech,
  ]);

  const fetchNextQuestion = useCallback(
    async (
      cfg: InterviewConfig,
      nextHistory: QA[],
      queue: TopicAssignment[],
    ) => {
      setLoadingQuestion(true);
      setError(null);
      const assignment = queue[nextHistory.length];
      const topicForThisQuestion = assignment?.name ?? null;
      try {
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "next",
            config: cfg,
            history: nextHistory,
            currentTopic: topicForThisQuestion ?? undefined,
            style: assignment?.style,
            difficulty: assignment?.difficulty,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }
        const data = await res.json();
        setCurrentQuestion(data.question);
        setQuestionNumber(data.questionNumber);
        setCurrentTopic(topicForThisQuestion);
        setDraftAnswer("");
        setCodeSource("");
        setCodeNotes("");
        setSetupCode(typeof data.setupCode === "string" ? data.setupCode : "");
        const expectsCode: boolean = !!data.expectsCode;
        const lang: CodingLanguage | null =
          data.codingLanguage ?? guessLanguageFromTopic(topicForThisQuestion);
        if (expectsCode && lang) {
          setAnswerMode("code");
          setCodeLanguage(lang);
        } else if (expectsCode) {
          setAnswerMode("code");
        } else {
          setAnswerMode("text");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load question");
      } finally {
        setLoadingQuestion(false);
      }
    },
    [],
  );

  const fetchFeedback = useCallback(
    async (cfg: InterviewConfig, finalHistory: QA[]) => {
      setStage("loading-feedback");
      setError(null);
      speech.stopSpeaking();
      try {
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "feedback",
            config: cfg,
            history: finalHistory,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }
        const data: FeedbackResponse = await res.json();
        // Merge code/topic from original history into each per-question report.
        const enriched: FeedbackResponse = {
          ...data,
          perQuestion: data.perQuestion.map((pq, i) => ({
            ...pq,
            code: finalHistory[i]?.code,
            topic: pq.topic || finalHistory[i]?.topic,
          })),
        };
        setFeedback(enriched);
        setStage("report");
        // Persist the completed interview to history.
        try {
          saveHistoryEntry(cfg, finalHistory, enriched, configLabel(cfg));
        } catch (e) {
          console.warn("Failed to save history:", e);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load feedback");
        setStage("interviewing");
      }
    },
    [speech],
  );

  const handleStart = useCallback(
    async (cfg: InterviewConfig) => {
      setConfig(cfg);
      setHistory([]);
      setStage("interviewing");
      setTimerRunning(true);
      setLastSpokenQuestion("");
      setFeedback(null);
      const queue = cfg.topics ? buildTopicQueue(cfg.topics) : [];
      await fetchNextQuestion(cfg, [], queue);
    },
    [fetchNextQuestion],
  );

  const handlePracticeAgain = useCallback(
    async (cfg: InterviewConfig) => {
      // Re-run an interview with the same config (same role/JD/topics/settings).
      setRestoredAt(null);
      await handleStart(cfg);
    },
    [handleStart],
  );

  const buildQa = useCallback(
    (override?: { code?: CodeSubmission; notes?: string }): QA => {
      if (override?.code) {
        return {
          question: currentQuestion,
          answer: (override.notes ?? "").trim(),
          topic: currentTopic ?? undefined,
          code: override.code,
        };
      }
      return {
        question: currentQuestion,
        answer: draftAnswer.trim(),
        topic: currentTopic ?? undefined,
      };
    },
    [currentQuestion, currentTopic, draftAnswer],
  );

  const submitWith = useCallback(
    async (qa: QA) => {
      if (!config) return;
      setSubmittingAnswer(true);
      speech.stopSpeaking();
      const newHistory: QA[] = [...history, qa];
      setHistory(newHistory);

      if (newHistory.length >= config.totalQuestions) {
        setTimerRunning(false);
        setSubmittingAnswer(false);
        await fetchFeedback(config, newHistory);
        return;
      }
      await fetchNextQuestion(config, newHistory, topicQueue);
      setSubmittingAnswer(false);
    },
    [config, history, fetchNextQuestion, fetchFeedback, speech, topicQueue],
  );

  const handleSubmitText = useCallback(async () => {
    await submitWith(buildQa());
  }, [submitWith, buildQa]);

  const handleSubmitCode = useCallback(
    async (code: CodeSubmission, notes: string) => {
      await submitWith(buildQa({ code, notes }));
    },
    [submitWith, buildQa],
  );

  const handleEndEarly = useCallback(async () => {
    if (!config) return;
    setTimerRunning(false);
    speech.stopSpeaking();

    let finalHistory = history;
    if (currentQuestion) {
      if (answerMode === "code" && codeSource.trim()) {
        finalHistory = [
          ...history,
          buildQa({
            code: { language: codeLanguage, source: codeSource },
            notes: codeNotes,
          }),
        ];
      } else if (draftAnswer.trim()) {
        finalHistory = [...history, buildQa()];
      }
    }
    if (finalHistory.length === 0) {
      setStage("setup");
      setConfig(null);
      return;
    }
    await fetchFeedback(config, finalHistory);
  }, [
    config,
    history,
    currentQuestion,
    answerMode,
    codeSource,
    codeLanguage,
    codeNotes,
    draftAnswer,
    buildQa,
    fetchFeedback,
    speech,
  ]);

  const handleTimerExpire = useCallback(() => {
    if (stage === "interviewing") {
      void handleEndEarly();
    }
  }, [stage, handleEndEarly]);

  const handleRestart = useCallback(() => {
    setStage("setup");
    setConfig(null);
    setHistory([]);
    setCurrentQuestion("");
    setCurrentTopic(null);
    setQuestionNumber(0);
    setDraftAnswer("");
    setCodeSource("");
    setCodeNotes("");
    setSetupCode("");
    setAnswerMode("text");
    setFeedback(null);
    setError(null);
    setTimerRunning(false);
    setLastSpokenQuestion("");
    setRestoredAt(null);
    speech.stopSpeaking();
  }, [speech]);

  useEffect(() => {
    if (stage !== "interviewing") setTimerRunning(false);
  }, [stage]);

  const replayQuestion = () => {
    if (currentQuestion) speech.speak(currentQuestion);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Prep.ai Interview</h1>
            {config && (
              <p className="text-sm text-gray-400 mt-1">
                {configLabel(config)} · with Q
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setFeedbackOpen(true)}
              className="text-sm text-gray-400 hover:text-gray-200 underline"
            >
              Send feedback
            </button>
            <VoiceToggle
              enabled={voiceMode}
              onChange={setVoiceMode}
              speaking={speech.speaking}
              onStopSpeaking={speech.stopSpeaking}
              voices={speech.voices}
              selectedVoiceName={voiceName}
              onSelectVoice={(name) => setVoiceName(name || null)}
              onPreviewVoice={() =>
                speech.speak(
                  "Hi, I'm Q. This is how I'll sound during your interview.",
                )
              }
            />
            {stage === "interviewing" && (
              <Timer
                totalSeconds={TOTAL_TIME}
                running={timerRunning}
                onExpire={handleTimerExpire}
              />
            )}
            <UserButton />
          </div>
        </header>

        {error && (
          <div className="mb-6 border border-red-700 bg-red-950/40 text-red-200 p-4 rounded-xl">
            <p className="font-semibold mb-1">Something went wrong</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {restoredAt && stage !== "setup" && (
          <div className="mb-6 border border-blue-700 bg-blue-950/40 text-blue-200 px-4 py-3 rounded-xl flex justify-between items-center text-sm">
            <span>
              Resumed your previous interview — saved{" "}
              {Math.round((Date.now() - restoredAt) / 60000)} min ago.
            </span>
            <button
              onClick={() => {
                if (
                  confirm(
                    "Discard the saved interview and start a new one? This can't be undone.",
                  )
                ) {
                  setRestoredAt(null);
                  handleRestart();
                }
              }}
              className="text-xs underline hover:text-blue-100"
            >
              Start fresh instead
            </button>
          </div>
        )}

        {stage === "setup" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setStage("history")}
                className="text-sm text-blue-400 hover:text-blue-300 underline"
              >
                View past interviews ▸
              </button>
            </div>
            <InterviewSetup onStart={handleStart} />
          </div>
        )}

        {stage === "history" && (
          <HistoryPanel
            onClose={() => setStage("setup")}
            onPracticeAgain={(cfg) => {
              void handlePracticeAgain(cfg);
            }}
          />
        )}

        {stage === "interviewing" && config && (
          <div className="space-y-6">
            <QuestionCard
              questionNumber={questionNumber || 1}
              totalQuestions={config.totalQuestions}
              question={currentQuestion}
              loading={loadingQuestion}
              topic={currentTopic ?? undefined}
            />

            {voiceMode && currentQuestion && !loadingQuestion && (
              <div className="flex justify-end">
                <button
                  onClick={replayQuestion}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Hear question again
                </button>
              </div>
            )}

            {answerMode === "code" ? (
              <CodeAnswer
                language={codeLanguage}
                onLanguageChange={setCodeLanguage}
                source={codeSource}
                onSourceChange={setCodeSource}
                notes={codeNotes}
                onNotesChange={setCodeNotes}
                setupCode={setupCode}
                onSubmit={handleSubmitCode}
                onSwitchToText={() => setAnswerMode("text")}
                disabled={loadingQuestion || submittingAnswer}
                submitting={submittingAnswer}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button
                    onClick={() => setAnswerMode("code")}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Switch to code editor
                  </button>
                </div>
                <TextAnswer
                  value={draftAnswer}
                  onChange={setDraftAnswer}
                  onSubmit={handleSubmitText}
                  disabled={loadingQuestion || submittingAnswer}
                  submitting={submittingAnswer}
                  voiceEnabled={voiceMode}
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="danger" onClick={handleEndEarly}>
                End interview early
              </Button>
            </div>
          </div>
        )}

        {stage === "loading-feedback" && (
          <div className="border border-gray-700 rounded-xl p-10 bg-gray-900 text-center">
            <p className="text-lg mb-2">Q is grading your interview...</p>
            <p className="text-sm text-gray-400">
              This usually takes about 15-30 seconds.
            </p>
            <div className="mt-6 inline-block animate-pulse h-2 w-32 bg-blue-500 rounded-full" />
          </div>
        )}

        {stage === "report" && feedback && (
          <div className="space-y-6">
            <FeedbackPanel
              feedback={feedback}
              onRestart={handleRestart}
              onBackHome={() => localStorage.removeItem(SESSION_KEY)}
              onPracticeAgain={
                config ? () => void handlePracticeAgain(config) : undefined
              }
            />
            <FeedbackForm
              inline
              context={{
                source: "report",
                interviewLabel: config ? configLabel(config) : undefined,
                overallScore: feedback.overallScore,
              }}
              onClose={() => {
                /* inline form has its own close behavior */
              }}
            />
          </div>
        )}

        {feedbackOpen && (
          <FeedbackForm
            context={{
              source: stage === "report" ? "report" : "header",
              interviewLabel: config ? configLabel(config) : undefined,
              overallScore: feedback?.overallScore,
            }}
            onClose={() => setFeedbackOpen(false)}
          />
        )}
      </div>
    </main>
  );
}
