"use client";

import { useTheme } from "@/hooks/use-theme";

export function ThemeToggleButton({ className = "icon-btn" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <button type="button" className={className} onClick={toggle} aria-label={label} data-tooltip={label}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
