"use client";

import { useEffect, useState } from "react";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(date: Date): string {
  const weekday = capitalize(date.toLocaleDateString("pt-BR", { weekday: "long" }));
  const month = date.toLocaleDateString("pt-BR", { month: "long" });
  return `${weekday}, ${date.getDate()} de ${month} de ${date.getFullYear()}`;
}

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function NavClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="nav-clock" suppressHydrationWarning>
      {formatDate(now)} <span className="nav-clock-time">- {formatTime(now)}</span>
    </span>
  );
}
