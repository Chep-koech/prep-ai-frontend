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
