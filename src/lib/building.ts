// Fixed layout: 19 floors, 6 units each, except the top floor (2 coberturas).
const TOTAL_FLOORS = 19;
const UNITS_PER_FLOOR = 6;
const TOP_FLOOR_UNITS = 2;

export interface BuildingUnit {
  floor: number;
  position: number;
  unit: string;
}

export function getFloors(): number[] {
  return Array.from({ length: TOTAL_FLOORS }, (_, i) => i + 1);
}

export function getUnitsPerFloor(floor: number): number {
  return floor === TOTAL_FLOORS ? TOP_FLOOR_UNITS : UNITS_PER_FLOOR;
}

export function getUnitNumber(floor: number, position: number): string {
  return `${floor}${String(position).padStart(2, "0")}`;
}

// Inverse of getUnitNumber — position is always the last 2 digits.
export function getFloorFromUnit(unit: string): number {
  return Number(unit.slice(0, -2));
}

// Apartment numbers are numeric strings of different lengths ("801", "1501"), so the
// default string sort gets them wrong — every list of units goes through here.
export function sortUnits(units: string[]): string[] {
  return [...units].sort((a, b) => Number(a) - Number(b));
}

export function getAllUnits(): BuildingUnit[] {
  const units: BuildingUnit[] = [];
  for (const floor of getFloors()) {
    for (let position = 1; position <= getUnitsPerFloor(floor); position++) {
      units.push({ floor, position, unit: getUnitNumber(floor, position) });
    }
  }
  return units;
}

export const MAX_UNITS_PER_FLOOR = UNITS_PER_FLOOR;
