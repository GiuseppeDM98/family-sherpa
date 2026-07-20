import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname === "/signin" ||
    pathname === "/signup" ||
    pathname === "/welcome" ||
    pathname.startsWith("/api/");

  if (!req.auth) {
    // A logged-out visitor who opens the bare instance URL gets the public
    // landing page served *at* "/" (a rewrite, so the URL stays clean) rather
    // than being bounced straight to the sign-in form.
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/welcome", req.nextUrl.origin));
    }
    if (!isPublic) {
      return NextResponse.redirect(new URL("/signin", req.nextUrl.origin));
    }
  }

  // A signed-in user has no use for the marketing page; send them to the app.
  if (req.auth && pathname === "/welcome") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  // Run on real page/route navigations only. Skip Next internals (`_next/image`)
  // and any path with a file extension (`.*\..*`) — i.e. everything under
  // `public/` (icons, the landing screenshots, favicon, manifest, sw.js) and
  // the built `_next/static` chunks. Those must never be auth-gated, or the
  // logged-out landing page can't even load its own images. API routes still
  // match (no extension) and self-authenticate via `isPublic` above.
  matcher: ["/((?!_next/image|.*\\..*).*)"],
};
