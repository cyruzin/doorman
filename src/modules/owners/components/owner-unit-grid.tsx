"use client";

import { useState } from "react";
import { getFloorFromUnit, getFloors, getUnitNumber, getUnitsPerFloor, MAX_UNITS_PER_FLOOR } from "@/lib/building";
import styles from "./owner-unit-grid.module.css";

interface OwnerUnitGridProps {
  selectedUnits: string[];
  onToggle: (unit: string) => void;
  /** Unit → owner name, for units already owned by someone else — shown greyed out,
   * unclickable, and named in a tooltip on hover/focus. Not `disabled` on the <button>
   * itself: some browsers (Firefox) suppress hover/focus on truly disabled controls.
   * The tooltip is a custom `data-tooltip` + CSS ::after (not the native `title`
   * attribute) — `title` has a ~1s hover delay, never appears on touch, and isn't
   * rendered by any screenshot/devtools capture, all of which matter for this app. */
  claimedUnits?: Record<string, string>;
  /** Units with an active owner or resident, for a "Livre"/"Em uso" hint (color + tooltip)
   * on units not already claimed by someone else. Omit — or leave undefined while still
   * loading — to skip the hint entirely. */
  occupiedUnits?: string[];
  /** Units this owner already holds and can't drop here — removing one is a destructive
   * change that belongs to "Desvincular" (password + warning), not to a plain edit. */
  lockedUnits?: string[];
}

// Multi-select twin of ApartmentGrid — an owner can hold several units.
export function OwnerUnitGrid({
  selectedUnits,
  onToggle,
  claimedUnits = {},
  occupiedUnits,
  lockedUnits = [],
}: OwnerUnitGridProps) {
  const floors = getFloors();
  const positions = Array.from({ length: MAX_UNITS_PER_FLOOR }, (_, i) => i + 1);
  // Starts on the lowest selected unit's floor so editing on mobile shows it selected, not floor 1.
  const [mobileFloor, setMobileFloor] = useState(() =>
    selectedUnits.length > 0 ? Math.min(...selectedUnits.map(getFloorFromUnit)) : 1,
  );
  const mobileUnits = Array.from({ length: getUnitsPerFloor(mobileFloor) }, (_, i) => getUnitNumber(mobileFloor, i + 1));
  const isSelected = (unit: string) => selectedUnits.includes(unit);
  const claimTooltip = (unit: string) => (claimedUnits[unit] ? `${claimedUnits[unit]} é o proprietário` : undefined);
  const isLocked = (unit: string) => lockedUnits.includes(unit);
  const cellClass = (unit: string, base: string) => {
    if (isLocked(unit)) return `${base} ${styles.cellLocked}`;
    if (isSelected(unit)) return `${base} ${styles.cellSelected}`;
    if (claimTooltip(unit)) return `${base} ${styles.cellClaimed}`;
    if (occupiedUnits) return `${base} ${occupiedUnits.includes(unit) ? styles.cellOccupied : styles.cellFree}`;
    return base;
  };
  const statusTooltip = (unit: string) =>
    claimTooltip(unit) ??
    (isLocked(unit)
      ? 'Use "Desvincular" para remover'
      : occupiedUnits
        ? occupiedUnits.includes(unit)
          ? "Em uso"
          : "Livre"
        : undefined);

  return (
    <>
      {/* Desktop/tablet: full 19-floor grid, hidden below the mobile breakpoint. */}
      <div className={`card ${styles.wrapper} ${styles.desktopOnly}`}>
        <table className={styles.grid}>
          <thead>
            <tr>
              {floors.map((floor) => (
                <th key={floor} className={styles.floorHeader}>
                  {floor}º
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position}>
                {floors.map((floor) => {
                  if (position > getUnitsPerFloor(floor)) {
                    return <td key={floor} className={styles.emptyCell} />;
                  }

                  const unit = getUnitNumber(floor, position);
                  const selected = isSelected(unit);
                  const claimed = claimTooltip(unit);
                  return (
                    <td key={floor} className={styles.cellWrapper} data-tooltip={statusTooltip(unit)}>
                      <button
                        type="button"
                        className={cellClass(unit, styles.cell)}
                        aria-pressed={selected}
                        aria-disabled={!!claimed || isLocked(unit)}
                        onClick={() => !claimed && !isLocked(unit) && onToggle(unit)}
                      >
                        {unit}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: pick a floor, then tap that floor's (at most 6) units. */}
      <div className={`card ${styles.mobileOnly}`}>
        <div className={styles.mobilePanel}>
          <label className={styles.mobileLabel} htmlFor="owner-unit-mobile-floor">
            Andar
          </label>
          <select
            id="owner-unit-mobile-floor"
            className="input"
            value={mobileFloor}
            onChange={(e) => setMobileFloor(Number(e.target.value))}
          >
            {floors.map((floor) => (
              <option key={floor} value={floor}>
                {floor}º andar
              </option>
            ))}
          </select>

          <div className={styles.mobileUnits}>
            {mobileUnits.map((unit) => {
              const selected = isSelected(unit);
              const claimed = claimTooltip(unit);
              return (
                <button
                  key={unit}
                  type="button"
                  className={cellClass(unit, styles.mobileCell)}
                  aria-pressed={selected}
                  aria-disabled={!!claimed || isLocked(unit)}
                  data-tooltip={statusTooltip(unit)}
                  onClick={() => !claimed && !isLocked(unit) && onToggle(unit)}
                >
                  {unit}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
