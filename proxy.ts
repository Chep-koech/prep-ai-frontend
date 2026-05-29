/**
 * © 2026 Chep-koech (https://github.com/Chep-koech).
 * Part of Prep.ai. All rights reserved.
 *
 * This source is published for portfolio viewing purposes only. No
 * permission is granted to copy, modify, redistribute, or use any
 * portion of this code in your own project without explicit written
 * permission from the author.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/practice(.*)",
  "/api/interview(.*)",
  "/api/topics(.*)",
  "/api/transcribe(.*)",
  "/api/extract(.*)",
  "/api/feedback(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API and TRPC routes, plus Clerk's auto-proxy
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};