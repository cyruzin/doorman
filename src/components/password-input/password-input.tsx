"use client";

import { useState } from "react";
import styles from "./password-input.module.css";

function EyeIcon({ crossedOut }: { crossedOut: boolean }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossedOut && <path d="m4 4 16 16" />}
    </svg>
  );
}

// Password field with the show/hide eye — shared by the login screen and every
// re-authentication prompt (deactivate, unlink), so they all behave the same.
export function PasswordInput({ className = "", ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);

  return (
    <div className={styles.wrap}>
      <input {...props} type={shown ? "text" : "password"} className={`input ${styles.input} ${className}`} />
      <button
        type="button"
        className={`icon-btn ${styles.toggle}`}
        onClick={() => setShown((current) => !current)}
        aria-label={shown ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={shown}
      >
        <EyeIcon crossedOut={shown} />
      </button>
    </div>
  );
}
