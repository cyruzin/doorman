"use client";

import { useState } from "react";
import { getFloorFromUnit, getFloors, getUnitNumber, getUnitsPerFloor, MAX_UNITS_PER_FLOOR } from "@/lib/building";
import styles from "./apartment-grid.module.css";

interface ApartmentGridProps {
  selectedUnit: string | null;
  onSelect: (unit: string) => void;
  /** Units with an active owner or resident, for a "Livre"/"Em uso" hint (color + tooltip).
   * Omit — or leave undefined while still loading — to skip the hint entirely. */
  occupiedUnits?: string[];
}

export function ApartmentGrid({ selectedUnit, onSelect, occupiedUnits }: ApartmentGridProps) {
  const floors = getFloors();
  const positions = Array.from({ length: MAX_UNITS_PER_FLOOR }, (_, i) => i + 1);
  // Starts on the selected unit's floor so editing on mobile shows it selected, not floor 1.
  const [mobileFloor, setMobileFloor] = useState(() => (selectedUnit ? getFloorFromUnit(selectedUnit) : 1));
  const mobileUnits = Array.from({ length: getUnitsPerFloor(mobileFloor) }, (_, i) => getUnitNumber(mobileFloor, i + 1));
  const statusTooltip = (unit: string) => (occupiedUnits ? (occupiedUnits.includes(unit) ? "Em uso" : "Livre") : undefined);

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
                  const isSelected = unit === selectedUnit;
                  const className = isSelected
                    ? `${styles.cell} ${styles.cellSelected}`
                    : occupiedUnits
                      ? `${styles.cell} ${occupiedUnits.includes(unit) ? styles.cellOccupied : styles.cellFree}`
                      : styles.cell;
                  return (
                    <td key={floor} className={styles.cellWrapper} data-tooltip={statusTooltip(unit)}>
                      <button type="button" className={className} onClick={() => onSelect(unit)}>
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

      {/* Mobile: pick a floor, then tap one of its (at most 6) units — 19 columns never fit a phone legibly. */}
      <div className={`card ${styles.mobileOnly}`}>
        <div className={styles.mobilePanel}>
          <label className={styles.mobileLabel} htmlFor="mobile-floor">
            Andar
          </label>
          <select
            id="mobile-floor"
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
              const isSelected = unit === selectedUnit;
              const className = isSelected
                ? `${styles.mobileCell} ${styles.cellSelected}`
                : occupiedUnits
                  ? `${styles.mobileCell} ${occupiedUnits.includes(unit) ? styles.cellOccupied : styles.cellFree}`
                  : styles.mobileCell;
              return (
                <button
                  key={unit}
                  type="button"
                  className={className}
                  data-tooltip={statusTooltip(unit)}
                  onClick={() => onSelect(unit)}
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
