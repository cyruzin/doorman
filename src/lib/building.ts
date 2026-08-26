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
