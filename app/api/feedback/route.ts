import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Feedback receiver. For now this just logs the payload server-side
 * (visible in Vercel function logs / `npm run dev` console). To wire it
 * to email/Slack/a database, plug into the marked spot below.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Empty payload" }, { status: 400 });
  }

  const fb = body as {
    rating?: unknown;
    whatWorked?: unknown;
    whatToImprove?: unknown;
    contactEmail?: unknown;
    context?: unknown;
  };

  const rating = Number(fb.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "rating must be a number between 1 and 5" },
      { status: 400 },
    );
  }

  // === Log it ===
  // In production on Vercel, this appears in Function Logs for /api/feedback.
  // Replace this with: an email send (Resend/SendGrid), a Slack webhook POST,
  // or a database insert (Supabase/Postgres/etc).
  console.log("[feedback received]", {
    rating,
    whatWorked: String(fb.whatWorked ?? "").slice(0, 5000),
    whatToImprove: String(fb.whatToImprove ?? "").slice(0, 5000),
    contactEmail: fb.contactEmail ? String(fb.contactEmail).slice(0, 200) : null,
    context: fb.context,
    at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
