#!/usr/bin/env bash
# Idempotently prepend a copyright header to source files we authored.
# Safe to re-run — skips files that already contain the marker.
set -e

cd "$(dirname "$0")/.."

MARKER="© 2026 Chep-koech"

HEADER_TS='/**
 * © 2026 Chep-koech (https://github.com/Chep-koech).
 * Part of Prep.ai. All rights reserved.
 *
 * This source is published for portfolio viewing purposes only. No
 * permission is granted to copy, modify, redistribute, or use any
 * portion of this code in your own project without explicit written
 * permission from the author.
 */'

HEADER_CSS='/*!
 * © 2026 Chep-koech (https://github.com/Chep-koech).
 * Part of Prep.ai. All rights reserved.
 */'

FILES=(
  lib/ai.ts
  lib/codeExec.ts
  lib/feedback.ts
  lib/history.ts
  lib/prompts.ts
  lib/speech.ts
  lib/types.ts
  proxy.ts
  app/page.tsx
  app/layout.tsx
  app/globals.css
  app/practice/page.tsx
  app/api/extract/route.ts
  app/api/feedback/route.ts
  app/api/interview/route.ts
  app/api/topics/route.ts
  app/api/transcribe/route.ts
  app/components/Button.tsx
  app/components/CodeAnswer.tsx
  app/components/FeedbackForm.tsx
  app/components/FeedbackPanel.tsx
  app/components/HistoryPanel.tsx
  app/components/InterviewSetup.tsx
  app/components/QuestionCard.tsx
  app/components/TextAnswer.tsx
  app/components/Timer.tsx
  app/components/TopicEditor.tsx
  app/components/VoiceToggle.tsx
  "app/sign-in/[[...sign-in]]/page.tsx"
  "app/sign-up/[[...sign-up]]/page.tsx"
)

added=0
skipped=0
missing=0

for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "MISSING: $f"
    missing=$((missing + 1))
    continue
  fi
  if grep -q "$MARKER" "$f"; then
    echo "skip (already has header): $f"
    skipped=$((skipped + 1))
    continue
  fi
  if [[ "$f" == *.css ]]; then
    header="$HEADER_CSS"
  else
    header="$HEADER_TS"
  fi
  # Prepend the header. Newline-separated. Comments before "use client"
  # are valid in Next.js / TypeScript.
  printf '%s\n%s' "$header" "$(cat "$f")" > "$f.__tmp" && mv "$f.__tmp" "$f"
  echo "added: $f"
  added=$((added + 1))
done

echo "---"
echo "Added: $added | Skipped: $skipped | Missing: $missing"
