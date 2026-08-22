"use client";

import { useState } from "react";
import { getFloors, getUnitNumber, getUnitsPerFloor, MAX_UNITS_PER_FLOOR } from "@/lib/building";
import styles from "./apartment-grid.module.css";

interface ApartmentGridProps {
  selectedUnit: string | null;
  onSelect: (unit: string) => void;
}

export function ApartmentGrid({ selectedUnit, onSelect }: ApartmentGridProps) {
  const floors = getFloors();
  const positions = Array.from({ length: MAX_UNITS_PER_FLOOR }, (_, i) => i + 1);
  const [mobileFloor, setMobileFloor] = useState(1);
  const mobileUnits = Array.from({ length: getUnitsPerFloor(mobileFloor) }, (_, i) => getUnitNumber(mobileFloor, i + 1));

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
                  return (
                    <td key={floor} className={styles.cellWrapper}>
                      <button
                        type="button"
                        className={isSelected ? `${styles.cell} ${styles.cellSelected}` : styles.cell}
                        onClick={() => onSelect(unit)}
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
              return (
                <button
                  key={unit}
                  type="button"
                  className={isSelected ? `${styles.mobileCell} ${styles.cellSelected}` : styles.mobileCell}
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
