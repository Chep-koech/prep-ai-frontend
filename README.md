# Prep.ai Frontend

Prep.ai is a live interview practice platform. It runs a mock interview with **Q**, an AI interviewer powered by Claude, then scores the candidate's answers with concrete strengths and improvements.

## Tech Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS 4
- Anthropic Claude (`@anthropic-ai/sdk`) for question generation and feedback

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your Anthropic API key. Copy the example file and fill it in:
   ```bash
   cp .env.local.example .env.local
   ```
   Then set `ANTHROPIC_API_KEY` in `.env.local`. Get a key at https://console.anthropic.com.

3. Run the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Project Structure

```
app/
  page.tsx                 landing page
  practice/page.tsx        interview flow (role pick -> 5 Qs -> report)
  api/interview/route.ts   POST endpoint that talks to Claude
  components/              swappable UI pieces (Button, TextAnswer, ...)
  globals.css              theme tokens (change here to re-theme)
  layout.tsx               root layout + metadata
lib/
  ai.ts                    Anthropic client + prompt-cached calls
  prompts.ts               system & user prompts
  types.ts                 shared types and role list
```

## Customizing

- **Change the AI provider:** swap `lib/ai.ts`. The rest of the app calls `/api/interview` and doesn't care what's behind it.
- **Change the user input:** `app/components/TextAnswer.tsx` is the only file you need to replace to add voice input (e.g. via the Web Speech API). Same props, same parent.
- **Change the look:** edit theme tokens in `app/globals.css`, or restyle individual components in `app/components/`.
- **Add a role:** add an entry to `ROLES` in `lib/types.ts`. It shows up automatically in the role picker.
- **Change the question count:** update `TOTAL_QUESTIONS` in `lib/types.ts`.

## Scripts

- `npm run dev` — dev server on http://localhost:3000
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint
