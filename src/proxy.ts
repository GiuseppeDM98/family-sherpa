import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname === "/signin" ||
    pathname === "/signup" ||
    pathname.startsWith("/api/");

  if (!req.auth && !isPublic) {
    const signInUrl = new URL("/signin", req.nextUrl.origin);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  // Run on everything except static assets and Next internals; API routes
  // are matched too (so they hit the callback above) but excluded there via
  // `isPublic` — webhook/cron routes authenticate themselves.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js).*)"],
};
