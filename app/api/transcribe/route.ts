/**
 * © 2026 Chep-koech (https://github.com/Chep-koech).
 * Part of Prep.ai. All rights reserved.
 *
 * This source is published for portfolio viewing purposes only. No
 * permission is granted to copy, modify, redistribute, or use any
 * portion of this code in your own project without explicit written
 * permission from the author.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
// whisper-large-v3-turbo: fastest model on Groq (~8x real-time), strong accuracy.
const MODEL = "whisper-large-v3-turbo";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY is not set. Get a free key at console.groq.com and add it to .env.local.",
      },
      { status: 500 },
    );
  }

  let inForm: FormData;
  try {
    inForm = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an 'audio' field." },
      { status: 400 },
    );
  }

  const audio = inForm.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'audio' field in form data." },
      { status: 400 },
    );
  }
  if (audio.size === 0) {
    return NextResponse.json(
      { error: "Empty audio recording." },
      { status: 400 },
    );
  }
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Recording too long (Whisper accepts up to 25MB)." },
      { status: 413 },
    );
  }

  const outForm = new FormData();
  outForm.append("file", audio, audio.name || "audio.webm");
  outForm.append("model", MODEL);
  outForm.append("language", "en");
  outForm.append("response_format", "json");
  outForm.append("temperature", "0");

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outForm,
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("Groq transcribe error:", res.status, detail.slice(0, 500));
      return NextResponse.json(
        {
          error: `Transcription failed (Groq ${res.status}). ${detail.slice(0, 200)}`,
        },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { text?: string };
    return NextResponse.json({ text: (data.text ?? "").trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Transcribe route error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}