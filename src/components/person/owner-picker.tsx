"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useOwners } from "@/modules/owners/hooks/use-owners";
import styles from "./owner-picker.module.css";

const SEARCH_PAGE_SIZE = 10;
const MIN_QUERY_LENGTH = 2;

function ownerLabel(owner: { name: string; unit: string }): string {
  return `${owner.name} (apto ${owner.unit})`;
}

interface OwnerPickerProps {
  id: string;
  value: string;
  defaultLabel?: string;
  onChange: (ownerId: string) => void;
}

// Search-as-you-type instead of preloading every owner — a plain <select>
// with hundreds of options gets slow (and unusable) as the building's owner
// list grows.
export function OwnerPicker({ id, value, defaultLabel, onChange }: OwnerPickerProps) {
  const [query, setQuery] = useState(defaultLabel ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const shouldSearch = isOpen && debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const { data, isFetching } = useOwners({
    q: debouncedQuery,
    pageSize: SEARCH_PAGE_SIZE,
    status: "active",
    enabled: shouldSearch,
  });
  const results = shouldSearch ? (data?.items ?? []) : [];

  const select = (ownerId: string, label: string) => {
    onChange(ownerId);
    setQuery(label);
    setIsOpen(false);
  };

  return (
    <div className={styles.picker}>
      <input
        id={id}
        type="text"
        className="input"
        placeholder="Buscar proprietário por nome..."
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          if (value) onChange("");
        }}
        onBlur={() => setIsOpen(false)}
      />
      {isOpen && (
        <ul className={styles.results}>
          {value && (
            <li>
              <button type="button" className={styles.option} onMouseDown={(e) => e.preventDefault()} onClick={() => select("", "")}>
                Nenhum
              </button>
            </li>
          )}
          {isFetching && <li className={styles.hint}>Buscando...</li>}
          {!isFetching &&
            shouldSearch &&
            results.map((owner) => (
              <li key={owner.id}>
                <button
                  type="button"
                  className={styles.option}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(owner.id, ownerLabel(owner))}
                >
                  {ownerLabel(owner)}
                </button>
              </li>
            ))}
          {!isFetching && shouldSearch && results.length === 0 && (
            <li className={styles.hint}>Nenhum proprietário encontrado</li>
          )}
          {!shouldSearch && query.trim().length > 0 && (
            <li className={styles.hint}>Digite ao menos {MIN_QUERY_LENGTH} letras</li>
          )}
        </ul>
      )}
    </div>
  );
}
