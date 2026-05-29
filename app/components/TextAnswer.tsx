"use client";

import { useEffect, useRef } from "react";
import Button from "./Button";
import { useSpeech } from "@/lib/speech";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitting?: boolean;
  voiceEnabled?: boolean;
};

function formatRecordingTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TextAnswer({
  value,
  onChange,
  onSubmit,
  disabled,
  submitting,
  voiceEnabled = false,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const speech = useSpeech({
    onFinalChunk: (chunk) => {
      const current = valueRef.current;
      const sep = current && !current.endsWith(" ") ? " " : "";
      onChange(current + sep + chunk);
    },
  });

  useEffect(() => {
    if (!voiceEnabled && speech.listening) {
      speech.stopListening();
    }
  }, [voiceEnabled, speech]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const toggleMic = () => {
    if (speech.listening) speech.stopListening();
    else void speech.startListening();
  };

  const showMic = voiceEnabled && speech.supported;
  const micBusy = disabled || speech.transcribing;

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={
            speech.listening
              ? "Recording... click the mic again when you're done."
              : speech.transcribing
                ? "Transcribing your answer..."
                : "Type your answer or click the mic to speak (Ctrl/Cmd+Enter to submit)"
          }
          rows={8}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              if (!disabled && value.trim()) onSubmit();
            }
          }}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 pr-14 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 resize-y"
        />
        {showMic && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={micBusy}
            aria-label={speech.listening ? "Stop recording" : "Start recording"}
            className={`absolute top-3 right-3 h-10 w-10 rounded-full flex items-center justify-center transition border ${
              speech.listening
                ? "bg-red-600 border-red-500 animate-pulse"
                : speech.transcribing
                  ? "bg-blue-700 border-blue-500"
                  : "bg-gray-800 border-gray-600 hover:bg-gray-700"
            } disabled:opacity-40`}
          >
            {speech.transcribing ? <Spinner /> : <MicIcon />}
          </button>
        )}
      </div>

      {speech.error && (
        <p className="text-sm text-red-400 px-1">{speech.error}</p>
      )}
      {voiceEnabled && !speech.supported && (
        <p className="text-sm text-amber-400 px-1">
          Audio recording isn&apos;t supported in this browser. Try a recent Chrome, Edge, or Firefox.
        </p>
      )}

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">
          {value.trim().length} characters
          {showMic && (
            <span className="ml-3">
              {speech.listening
                ? `● Recording ${formatRecordingTime(speech.recordingMs)}`
                : speech.transcribing
                  ? "Transcribing..."
                  : "Mic ready"}
            </span>
          )}
        </p>
        <Button
          onClick={onSubmit}
          disabled={
            disabled || !value.trim() || submitting || speech.transcribing
          }
        >
          {submitting ? "Submitting..." : "Submit answer"}
        </Button>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-white"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-white"
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
  );
}
