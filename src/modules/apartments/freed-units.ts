import { sortUnits } from "@/lib/building";
import { unitsApi } from "./api";

export function joinUnits(units: string[]): string {
  const sorted = sortUnits(units);
  if (sorted.length < 2) return sorted.join("");
  return `${sorted.slice(0, -1).join(", ")} e ${sorted[sorted.length - 1]}`;
}

export function freedUnitsMessage(units: string[]): string | undefined {
  if (units.length === 0) return undefined;
  return units.length === 1
    ? `O apartamento ${units[0]} ficará livre.`
    : `Os apartamentos ${joinUnits(units)} ficarão livres.`;
}

// The other half of the picture: an apartment that loses its owner but keeps its tenants —
// perfectly valid (a sale with the tenant in place), as long as the porteiro knows a new
// owner has to be registered for it.
export function keptResidentsMessage(units: string[]): string | undefined {
  if (units.length === 0) return undefined;
  return units.length === 1
    ? `O apartamento ${units[0]} continua com morador(es) e ficará sem proprietário, cadastre o novo dono.`
    : `Os apartamentos ${joinUnits(units)} continuam com morador(es) e ficarão sem proprietário, cadastre os novos donos.`;
}

// Best-effort lookups for the deactivation/unlink modals: a failed request just drops that
// part of the warning, it must never block the action itself.
export async function fetchFreedUnits(residentIds: string[]): Promise<string[]> {
  if (residentIds.length === 0) return [];
  try {
    return await unitsApi.getUnitsFreedBy(residentIds);
  } catch {
    return [];
  }
}

export async function fetchOccupiedUnits(): Promise<string[]> {
  try {
    return await unitsApi.getOccupiedUnits();
  } catch {
    return [];
  }
}

export async function freedUnitsWarning(residentIds: string[]): Promise<string | undefined> {
  return freedUnitsMessage(await fetchFreedUnits(residentIds));
}
