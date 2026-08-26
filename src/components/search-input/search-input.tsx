"use client";

import styles from "./search-input.module.css";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  autoComplete?: string;
  "aria-label"?: string;
}

// A plain `type="search"` input's native clear button is unreliable to click
// (tiny hit target, inconsistent across browsers) — this renders our own
// always-clickable one instead.
export function SearchInput({ value, onChange, className, ...inputProps }: SearchInputProps) {
  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <input
        type="text"
        className={`input ${styles.input}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...inputProps}
      />
      {value && (
        <button type="button" className={styles.clear} onClick={() => onChange("")} aria-label="Limpar busca">
          ×
        </button>
      )}
    </div>
  );
}
