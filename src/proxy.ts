import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSessionExpiredByShift } from "@/lib/shift";

export const proxy = auth((req) => {
  // Sessão aberta antes da última troca de turno (6h/18h) conta como
  // deslogada — logout automático na troca, verificado a cada request.
  const isAuthed = !!req.auth && !isSessionExpiredByShift(req.auth.loginAt);
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
  // Arquivos de imagem ficam de fora: o logo e os ícones do app precisam carregar
  // na tela de login (sem sessão), e redirecioná-los devolve HTML no lugar do PNG.
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif)$).*)"],
};
