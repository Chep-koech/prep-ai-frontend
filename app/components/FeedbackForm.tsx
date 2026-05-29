"use client";

import { useState } from "react";
import Button from "./Button";
import { FeedbackContext, submitFeedback } from "@/lib/feedback";

type Props = {
  context: FeedbackContext;
  onClose: () => void;
  onSubmitted?: () => void;
  inline?: boolean;
};

export default function FeedbackForm({
  context,
  onClose,
  onSubmitted,
  inline,
}: Props) {
  const [rating, setRating] = useState<number>(0);
  const [whatWorked, setWhatWorked] = useState("");
  const [whatToImprove, setWhatToImprove] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = rating >= 1 && rating <= 5 && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await submitFeedback({
      rating,
      whatWorked,
      whatToImprove,
      contactEmail: contactEmail || undefined,
      context,
    });
    setSubmitting(false);
    if (result.ok) {
      setSubmitted(true);
      onSubmitted?.();
    } else {
      // It was still saved locally; let the user know it didn't reach the server.
      setError(
        `Saved locally, but couldn't reach the server: ${result.error}`,
      );
      setSubmitted(true);
      onSubmitted?.();
    }
  };

  const body = submitted ? (
    <div className="text-center py-4">
      <p className="text-lg font-semibold mb-2">Thanks for the feedback! 🙏</p>
      <p className="text-sm text-gray-400">
        Every bit of input makes this better.
      </p>
      {error && (
        <p className="text-xs text-amber-400 mt-3">{error}</p>
      )}
      {!inline && (
        <div className="mt-5">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">
          {context.source === "report"
            ? "How was this interview?"
            : "Send feedback"}
        </h2>
        <p className="text-sm text-gray-400">
          {context.source === "report"
            ? "Quick thoughts on the questions, voice, or scoring help a lot."
            : "Bug, feature idea, or just thoughts — everything is read."}
        </p>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Overall rating
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
              className={`text-3xl transition ${
                rating >= n
                  ? "text-yellow-400"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              ★
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-3 self-center text-sm text-gray-400">
              {["awful", "poor", "ok", "good", "great"][rating - 1]}
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">
          What worked well? <span className="text-gray-500">(optional)</span>
        </label>
        <textarea
          value={whatWorked}
          onChange={(e) => setWhatWorked(e.target.value)}
          rows={3}
          placeholder="e.g. The SQL question with sample data was super useful..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 resize-y"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">
          What should be better? <span className="text-gray-500">(optional)</span>
        </label>
        <textarea
          value={whatToImprove}
          onChange={(e) => setWhatToImprove(e.target.value)}
          rows={3}
          placeholder="e.g. The mic cut me off mid-sentence... questions felt repetitive... voice sounded robotic..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 resize-y"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Email <span className="text-gray-500">(optional, if you want a reply)</span>
        </label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 justify-end">
        {!inline && (
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "Sending..." : "Send feedback"}
        </Button>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="border border-gray-700 rounded-xl p-6 bg-gray-900">
        {body}
      </div>
    );
  }

  // Modal overlay
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg border border-gray-700 rounded-xl p-6 bg-gray-950 shadow-2xl">
        {body}
      </div>
    </div>
  );
}
