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

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// STT side: MediaRecorder captures mic audio, posts blob to /api/transcribe,
// which proxies to Groq Whisper. Works in any browser regardless of network/firewall.
//
// TTS side: still uses the browser's SpeechSynthesis (local, free, works fine).
// Swap to a cloud TTS later by replacing the `speak` implementation.

export function isTtsSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

export function isSttSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof window.MediaRecorder !== "undefined"
  );
}

export function isSpeechSupported(): boolean {
  return isSttSupported() && isTtsSupported();
}

// Rank a voice for default selection. Higher = better.
// Prefers "natural"/"neural"/"online" voices, then known good Windows/Mac names,
// then any English female voice, and demotes the squeaky default Microsoft Zira.
function rankVoice(v: SpeechSynthesisVoice): number {
  if (!v.lang.toLowerCase().startsWith("en")) return -1;
  const name = v.name.toLowerCase();
  let score = 0;
  if (/natural|neural|online/.test(name)) score += 100;
  if (/aria|jenny|emma|libby|sonia|nova|ava/.test(name)) score += 50;
  if (/samantha|victoria|karen|moira|tessa/.test(name)) score += 40; // macOS
  if (/google/.test(name)) score += 30;
  if (/female/.test(name)) score += 10;
  if (/zira/.test(name)) score -= 20; // the squeaky Windows default
  if (/david|mark|guy/.test(name)) score -= 5; // male defaults — fine but de-prioritized
  if (v.lang === "en-US") score += 5;
  if (v.localService === false) score += 5; // cloud voices usually sound better
  return score;
}

export function listEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("en"))
    .sort((a, b) => rankVoice(b) - rankVoice(a));
}

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
      return m;
    }
  }
  return "";
}

type UseSpeechOptions = {
  onFinalChunk?: (text: string) => void;
  preferredVoiceName?: string | null;
};

export function useSpeech(options: UseSpeechOptions = {}) {
  const { onFinalChunk, preferredVoiceName } = options;
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFinalChunkRef = useRef(onFinalChunk);
  const preferredVoiceRef = useRef(preferredVoiceName);

  const supported = useSyncExternalStore(
    () => () => {},
    () => isSpeechSupported(),
    () => false,
  );

  useEffect(() => {
    onFinalChunkRef.current = onFinalChunk;
  }, [onFinalChunk]);

  useEffect(() => {
    preferredVoiceRef.current = preferredVoiceName;
  }, [preferredVoiceName]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const refresh = () => setVoices(listEnglishVoices());
    refresh();
    window.speechSynthesis.onvoiceschanged = refresh;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const teardownStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    if (!isSttSupported()) {
      setError("Audio recording isn't supported in this browser.");
      return;
    }
    if (mediaRecorderRef.current) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const err = e as DOMException;
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        setError(
          "Microphone permission was denied. Click the lock icon in the address bar and allow microphone access, then refresh.",
        );
      } else if (err.name === "NotFoundError") {
        setError(
          "No microphone detected. Plug one in or check Windows sound settings, then try again.",
        );
      } else {
        setError(`Could not access microphone: ${err.message || err.name}`);
      }
      return;
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (e) {
      teardownStream();
      stream.getTracks().forEach((t) => t.stop());
      setError(
        e instanceof Error
          ? `MediaRecorder error: ${e.message}`
          : "Could not start recording.",
      );
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onerror = (e) => {
      console.error("[speech] MediaRecorder error:", e);
      setError("Recording failed unexpectedly.");
    };

    recorder.onstop = async () => {
      const tracks = streamRef.current?.getTracks() ?? [];
      tracks.forEach((t) => t.stop());
      streamRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      mediaRecorderRef.current = null;
      setListening(false);
      setRecordingMs(0);

      const blob = new Blob(chunksRef.current, {
        type: mimeType || "audio/webm",
      });
      chunksRef.current = [];

      if (blob.size < 1000) {
        // Probably empty / too short
        setError("Recording was empty. Hold the mic and speak a bit longer.");
        return;
      }

      setTranscribing(true);
      try {
        const form = new FormData();
        const ext = mimeType.includes("mp4")
          ? "m4a"
          : mimeType.includes("ogg")
            ? "ogg"
            : "webm";
        form.append("audio", blob, `answer.${ext}`);
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? `Transcription failed (${res.status})`);
        }
        const text = (data.text ?? "").trim();
        if (text) {
          onFinalChunkRef.current?.(text + " ");
        } else {
          setError("Couldn't transcribe anything. Try speaking again.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transcription failed.");
      } finally {
        setTranscribing(false);
      }
    };

    streamRef.current = stream;
    mediaRecorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setRecordingMs(0);
    timerRef.current = setInterval(() => {
      setRecordingMs(Date.now() - startedAtRef.current);
    }, 200);
    recorder.start();
    setListening(true);
  }, [teardownStream]);

  const stopListening = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    } else {
      teardownStream();
      setListening(false);
      setRecordingMs(0);
    }
  }, [teardownStream]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    // Chrome SpeechSynthesis quirk: calling speak() immediately after cancel()
    // is silently no-op'd. Cancel, wait a tick, then queue the new utterance.
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1;

    const all = listEnglishVoices();
    const explicit =
      preferredVoiceRef.current
        ? all.find((v) => v.name === preferredVoiceRef.current)
        : null;
    const chosen = explicit ?? all[0];
    if (chosen) utter.voice = chosen;

    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);

    setTimeout(() => {
      // Chrome also sometimes gets stuck in a "paused" state after cancel.
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.speak(utter);
    }, 120);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      teardownStream();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [teardownStream]);

  return {
    supported,
    listening,
    transcribing,
    recordingMs,
    interim: "", // kept for API compat; whisper has no interim transcript
    speaking,
    error,
    voices,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}