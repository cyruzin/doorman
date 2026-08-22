"use client";

import styles from "@/components/status-panel.module.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.wrapper}>
      <div className={`card ${styles.panel}`}>
        <h1 className={styles.title}>Algo deu errado</h1>
        <p className={styles.message}>{error.message || "Ocorreu um erro inesperado."}</p>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
