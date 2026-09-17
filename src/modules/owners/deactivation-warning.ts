import {
  fetchFreedUnits,
  fetchOccupiedUnits,
  freedUnitsMessage,
  joinUnits,
  keptResidentsMessage,
} from "@/modules/apartments/freed-units";
import type { Owner } from "./types";

// Deactivating an owner is all-or-nothing: every unit they hold loses its owner and their
// resident record goes down with it. Spelled out before confirming, because the usual reason
// to deactivate (sold the apartment) often applies to only one of several units.
export async function ownerDeactivationWarning(owner: Owner): Promise<string | undefined> {
  const linkedResidents = owner.residents.filter((r) => r.active);
  const freedUnits = await fetchFreedUnits(linkedResidents.map((r) => r.id));
  const occupiedUnits = await fetchOccupiedUnits();
  // Units that lose the owner but keep somebody living there — a tenant stays put.
  const keptUnits = owner.units.filter((unit) => occupiedUnits.includes(unit) && !freedUnits.includes(unit));

  const parts = [
    owner.units.length === 1
      ? `O apartamento ${owner.units[0]} ficará sem proprietário.`
      : owner.units.length > 1
        ? `Os apartamentos ${joinUnits(owner.units)} ficarão sem proprietário.`
        : undefined,
    linkedResidents.length > 0 &&
      `O cadastro de morador de ${linkedResidents.map((r) => `${r.name} (apto ${r.unit})`).join(", ")} também será desativado.`,
    freedUnitsMessage(freedUnits),
    keptResidentsMessage(keptUnits),
    owner.units.length > 1 &&
      "Vendeu só um dos apartamentos? Use o botão Desvincular, desativar tira todos de uma vez.",
  ];
  return parts.filter(Boolean).join(" ") || undefined;
}
