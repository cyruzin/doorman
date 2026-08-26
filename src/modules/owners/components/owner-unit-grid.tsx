"use client";

import { useState } from "react";
import { getFloors, getUnitNumber, getUnitsPerFloor, MAX_UNITS_PER_FLOOR } from "@/lib/building";
import styles from "./owner-unit-grid.module.css";

interface OwnerUnitGridProps {
  selectedUnits: string[];
  onToggle: (unit: string) => void;
}

// Multi-select twin of ApartmentGrid — an owner can hold several units at
// once, so this toggles membership in a list instead of picking exactly one.
export function OwnerUnitGrid({ selectedUnits, onToggle }: OwnerUnitGridProps) {
  const floors = getFloors();
  const positions = Array.from({ length: MAX_UNITS_PER_FLOOR }, (_, i) => i + 1);
  const [mobileFloor, setMobileFloor] = useState(1);
  const mobileUnits = Array.from({ length: getUnitsPerFloor(mobileFloor) }, (_, i) => getUnitNumber(mobileFloor, i + 1));
  const isSelected = (unit: string) => selectedUnits.includes(unit);

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
                  return (
                    <td key={floor} className={styles.cellWrapper}>
                      <button
                        type="button"
                        className={selected ? `${styles.cell} ${styles.cellSelected}` : styles.cell}
                        aria-pressed={selected}
                        onClick={() => onToggle(unit)}
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
              return (
                <button
                  key={unit}
                  type="button"
                  className={selected ? `${styles.mobileCell} ${styles.cellSelected}` : styles.mobileCell}
                  aria-pressed={selected}
                  onClick={() => onToggle(unit)}
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
