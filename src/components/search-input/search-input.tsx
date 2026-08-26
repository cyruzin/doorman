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

// Native `type="search"` clear button has a tiny, unreliable hit target — this replaces it.
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
