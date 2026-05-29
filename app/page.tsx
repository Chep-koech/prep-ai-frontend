import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-gray-950 text-white px-6 pt-8 pb-16">
      {/* Top-right auth strip */}
      <div className="w-full max-w-5xl flex justify-end items-center gap-3 mb-12">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="text-sm bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 px-3 py-1.5 rounded">
              Sign up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/practice"
            className="text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded"
          >
            Go to practice
          </Link>
          <UserButton />
        </Show>
      </div>

      <div className="max-w-2xl text-center space-y-6">
        <p className="text-sm uppercase tracking-widest text-blue-400">
          Meet Q · your AI interviewer
        </p>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight">
          Practice the job interview.{" "}
          <span className="text-blue-400">Get real feedback.</span>
        </h1>

        <p className="text-lg text-gray-300">
          Pick a role. Answer 5 tailored questions. Get a scored report on what
          you did well and what to work on — in under 10 minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Show when="signed-in">
            <Link
              href="/practice"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition inline-block"
            >
              Start an interview
            </Link>
          </Show>
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition">
                Sign up to start
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-xl transition border border-gray-700">
                I already have an account
              </button>
            </SignInButton>
          </Show>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12 text-left">
          <Feature title="Role-specific" body="Software, data, PM, design, marketing, or behavioral." />
          <Feature title="Timed sessions" body="30-minute window per interview, just like the real thing." />
          <Feature title="Scored feedback" body="Per-question scoring with concrete strengths and gaps." />
        </div>
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-gray-800 rounded-xl p-4 bg-gray-900/40">
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-sm text-gray-400">{body}</p>
    </div>
  );
}
