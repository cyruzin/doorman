"use client";

import { useTheme } from "@/hooks/use-theme";
import styles from "./preferences-page.module.css";

export function PreferencesPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="page">
      <h1 className={styles.title}>Preferências</h1>

      <div className={`card ${styles.section}`}>
        <div>
          <h2 className={styles.sectionTitle}>Aparência</h2>
          <p className="text-muted">Escolha entre o tema claro ou escuro.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={toggle}>
          {theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
        </button>
      </div>
    </div>
  );
}
