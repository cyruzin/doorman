"use client";

import { useEffect, useId } from "react";
import styles from "./modal.module.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  /** alertdialog for a confirmation that interrupts the user, dialog for a form. */
  role?: "dialog" | "alertdialog";
  children: React.ReactNode;
}

// Every modal in the app closes the same three ways: the X, the backdrop and Esc.
export function Modal({ title, onClose, role = "dialog", children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal card" role={role} aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id={titleId}>{title}</h2>
          <button type="button" className={`icon-btn ${styles.close}`} onClick={onClose} aria-label="Fechar">
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
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
