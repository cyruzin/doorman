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
  // API routes enforce their own checks (api-guard.ts) and return JSON, not a redirect.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
