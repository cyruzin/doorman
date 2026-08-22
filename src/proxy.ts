import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const proxy = auth((req) => {
  const isAuthed = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  if (!isAuthed && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isAuthed && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  // API routes enforce their own session + permission checks (see api-guard.ts)
  // and must return JSON 401/403, not an HTML redirect — so they're excluded here.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
