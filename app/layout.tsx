import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prep.ai — Practice job interviews with AI",
  description:
    "Live interview practice with Q, your AI interviewer. Timed sessions, role-specific questions, and instant feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white`}
      >
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#2563eb",
              colorBackground: "#ffffff",
              colorText: "#111827",
              colorTextSecondary: "#4b5563",
              colorInputBackground: "#ffffff",
              colorInputText: "#111827",
              colorDanger: "#dc2626",
              colorSuccess: "#16a34a",
              colorNeutral: "#6b7280",
              borderRadius: "0.5rem",
              fontFamily: "var(--font-geist-sans)",
            },
            elements: {
              card: "shadow-xl border border-gray-200 bg-white",
              formFieldInput:
                "border border-gray-300 placeholder:text-gray-400 text-gray-900",
              formFieldLabel: "text-gray-700",
              formButtonPrimary:
                "bg-blue-600 hover:bg-blue-700 normal-case font-semibold text-white",
              socialButtonsBlockButton:
                "border border-gray-300 hover:bg-gray-50 text-gray-700",
              footerActionText: "text-gray-600",
              footerActionLink: "text-blue-600 hover:text-blue-700",
              headerTitle: "text-gray-900",
              headerSubtitle: "text-gray-600",
              dividerLine: "bg-gray-200",
              dividerText: "text-gray-500",
            },
          }}
        >
          {children}
          {/* Watermark — every page, fixed bottom-left, never interactive */}
          <div
            aria-hidden="true"
            className="fixed bottom-3 left-4 text-gray-500/80 select-none pointer-events-none text-lg font-serif tracking-tight z-10"
          >
            Q<sup className="text-[0.6em] ml-px">c</sup>
          </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
