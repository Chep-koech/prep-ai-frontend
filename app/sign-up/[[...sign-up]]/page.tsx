/**
 * © 2026 Chep-koech (https://github.com/Chep-koech).
 * Part of Prep.ai. All rights reserved.
 *
 * This source is published for portfolio viewing purposes only. No
 * permission is granted to copy, modify, redistribute, or use any
 * portion of this code in your own project without explicit written
 * permission from the author.
 */
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-6 py-12">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">Create your account</h1>
        <p className="text-gray-400">
          Sign up to start practicing interviews with Q.
        </p>
      </div>
      <SignUp />
    </main>
  );
}