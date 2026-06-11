import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define which routes are protected (everything except static files)
const isProtectedRoute = createRouteMatcher([
  '/',
  '/rounds(.*)',
  '/friends(.*)',
  '/api(.*)',
]);

const isPublicRoute = createRouteMatcher(['/share(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};