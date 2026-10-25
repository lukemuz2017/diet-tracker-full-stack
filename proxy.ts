import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Runs before every page and API request. Anyone can see the welcome screen,
// the FAQ and the sign-in and sign-up pages; everything else needs a signed-in
// Clerk user, and a signed-out visitor is sent to sign in and then back.
// API routes answer a signed-out request with 401 instead of a redirect to
// the sign-in page (and check again themselves).
const isPublic = createRouteMatcher(["/", "/faq", "/sign-in(.*)", "/sign-up(.*)"]);
const isApi = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isApi(request)) {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Sign in first." }, { status: 401 });
  } else if (!isPublic(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
