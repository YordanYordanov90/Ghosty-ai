import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { getClerkAuthPaths } from "@/lib/clerk-auth-paths";

const { signInPath, signUpPath } = getClerkAuthPaths();

const isPublicRoute = createRouteMatcher([
  "/",
  `${signInPath}(.*)`,
  `${signUpPath}(.*)`,
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
