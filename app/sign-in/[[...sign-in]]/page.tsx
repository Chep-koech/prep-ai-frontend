import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-6 py-12">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
        <p className="text-gray-400">Sign in to start your interview with Q.</p>
      </div>
      <SignIn />
    </main>
  );
}
