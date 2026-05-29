import { NextRequest, NextResponse } from "next/server";
import { MAX_JD_LENGTH } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

type ExtractResponse = {
  text: string;
  truncated: boolean;
  filename: string;
  method: "text" | "pdf" | "docx";
};

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a 'file' field" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field in form data" },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop()! : "";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let text = "";
    let method: ExtractResponse["method"] = "text";

    if (ext === "pdf" || file.type === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        text = result.text;
      } finally {
        await parser.destroy();
      }
      method = "pdf";
    } else if (
      ext === "docx" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
      method = "docx";
    } else if (ext === "doc") {
      return NextResponse.json(
        {
          error:
            "Legacy .doc files aren't supported. Save as .docx, .pdf, or .txt and try again.",
        },
        { status: 415 },
      );
    } else {
      // Try as text. UTF-8 first; if it looks binary, reject.
      text = buffer.toString("utf8");
      if (looksBinary(text)) {
        return NextResponse.json(
          {
            error: `Couldn't read "${file.name}" as text. Supported: .pdf, .docx, .txt, .md (and most plain-text formats). Copy and paste the content if the file type isn't supported.`,
          },
          { status: 415 },
        );
      }
      method = "text";
    }

    text = normalizeWhitespace(text);
    const truncated = text.length > MAX_JD_LENGTH;
    if (truncated) text = text.slice(0, MAX_JD_LENGTH);

    if (!text.trim()) {
      return NextResponse.json(
        {
          error:
            "No readable text found in that file. If it's a scanned PDF, the text needs OCR first — paste the description manually instead.",
        },
        { status: 422 },
      );
    }

    const response: ExtractResponse = {
      text,
      truncated,
      filename: file.name,
      method,
    };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Extract API error:", err);
    return NextResponse.json(
      { error: `Failed to extract text: ${message}` },
      { status: 500 },
    );
  }
}

function looksBinary(s: string): boolean {
  // Heuristic: high ratio of control characters (excluding common whitespace) = binary
  const sample = s.slice(0, 4000);
  let suspect = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code === 0) return true;
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) suspect++;
  }
  return suspect / Math.max(sample.length, 1) > 0.05;
}

function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
