import { beforeEach, describe, expect, it, vi } from "vitest";

const getUnitsFreedBy = vi.fn();
const getOccupiedUnits = vi.fn();
vi.mock("@/modules/apartments/api", () => ({
  unitsApi: {
    getUnitsFreedBy: (...args: unknown[]) => getUnitsFreedBy(...args),
    getOccupiedUnits: () => getOccupiedUnits(),
  },
}));

import { ownerDeactivationWarning } from "../deactivation-warning";
import type { Owner } from "../types";

function owner(overrides: Partial<Owner>): Owner {
  return {
    id: "o1",
    name: "Pedro",
    cpf: null,
    email: null,
    active: true,
    deactivatedBy: null,
    units: [],
    residents: [],
    phones: [],
    vehicles: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("ownerDeactivationWarning", () => {
  beforeEach(() => {
    getUnitsFreedBy.mockReset();
    getUnitsFreedBy.mockResolvedValue([]);
    getOccupiedUnits.mockReset();
    getOccupiedUnits.mockResolvedValue([]);
  });

  it("names the single unit left without an owner", async () => {
    await expect(ownerDeactivationWarning(owner({ units: ["1501"] }))).resolves.toBe(
      "O apartamento 1501 ficará sem proprietário.",
    );
  });

  it("warns that deactivating takes every unit, and points to the edit route instead", async () => {
    const warning = await ownerDeactivationWarning(owner({ units: ["801", "802", "803"] }));

    expect(warning).toContain("Os apartamentos 801, 802 e 803 ficarão sem proprietário.");
    expect(warning).toContain("Use o botão Desvincular");
  });

  it("includes the linked resident record and the units it empties", async () => {
    getUnitsFreedBy.mockResolvedValue(["1501"]);
    const warning = await ownerDeactivationWarning(
      owner({
        units: ["1501"],
        residents: [
          { id: "r1", name: "José", unit: "1501", active: true },
          { id: "r2", name: "Antigo", unit: "1501", active: false },
        ],
      }),
    );

    expect(getUnitsFreedBy).toHaveBeenCalledWith(["r1"]);
    expect(warning).toContain("O cadastro de morador de José (apto 1501) também será desativado.");
    expect(warning).toContain("O apartamento 1501 ficará livre.");
  });

  it("flags an apartment that loses its owner but keeps the tenants living there", async () => {
    getOccupiedUnits.mockResolvedValue(["802"]);

    const warning = await ownerDeactivationWarning(owner({ units: ["802"] }));

    expect(warning).toContain("O apartamento 802 continua com morador(es)");
    expect(warning).toContain("cadastre o novo dono");
  });

  it("has nothing to warn about for an owner with no units", async () => {
    await expect(ownerDeactivationWarning(owner({}))).resolves.toBeUndefined();
  });
});
