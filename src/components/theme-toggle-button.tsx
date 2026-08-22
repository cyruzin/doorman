"use client";

import { useTheme } from "@/hooks/use-theme";

export function ThemeToggleButton({ className = "icon-btn" }: { className?: string }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
