"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { api } from "@/lib/axios";
import { isSessionExpiredByShift, nextShiftBoundary } from "@/lib/shift";

// Reforço contra timer atrasado (aba em segundo plano, PC hibernando) — o
// corte de verdade é garantido no servidor (src/proxy.ts) a cada request.
const RECHECK_INTERVAL_MS = 60_000;

/** Desloga automaticamente na troca de turno (6h/18h), registrando o evento no mural. */
export function useShiftAutoLogout(loginAt: number | undefined) {
  useEffect(() => {
    if (!loginAt) return;

    // Evita registrar/deslogar duas vezes caso o timer e o recheck de
    // segurança disparem antes do signOut() redirecionar a página.
    let triggered = false;

    const logoutIfExpired = async () => {
      if (triggered || !isSessionExpiredByShift(loginAt)) return;
      triggered = true;

      try {
        await api.post("/notices/shift-logout");
      } catch {
        // Registro no mural é best-effort — não pode travar o logout.
      }
      void signOut({ callbackUrl: "/login" });
    };

    const msUntilBoundary = nextShiftBoundary().getTime() - Date.now();
    const boundaryTimer = setTimeout(logoutIfExpired, Math.max(msUntilBoundary, 0));
    const recheckInterval = setInterval(logoutIfExpired, RECHECK_INTERVAL_MS);

    return () => {
      clearTimeout(boundaryTimer);
      clearInterval(recheckInterval);
    };
  }, [loginAt]);
}
