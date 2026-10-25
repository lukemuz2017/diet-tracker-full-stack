import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Runs before every page and API request. Anyone can see the welcome screen,
// the FAQ and the sign-in and sign-up pages; everything else needs a signed-in
// Clerk user, and a signed-out visitor is sent to sign in and then back.
const isPublic = createRouteMatcher(["/", "/faq", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublic(request)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
