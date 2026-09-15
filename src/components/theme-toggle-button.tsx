"use client";

import type { ComponentProps } from "react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggleButton({ className = "icon-btn", ...props }: ComponentProps<"button">) {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <button type="button" className={className} onClick={toggle} aria-label={label} data-tooltip={label} {...props}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
