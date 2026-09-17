import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const getUnitsFreedBy = vi.fn();
vi.mock("@/modules/apartments/hooks/use-units-freed-by", () => ({
  useUnitsFreedBy: (ids: string[]) => ({ data: getUnitsFreedBy(ids) }),
}));

const occupiedUnits = vi.fn();
vi.mock("@/modules/apartments/hooks/use-occupied-units", () => ({
  useOccupiedUnits: () => ({ data: occupiedUnits() }),
}));

import { UnlinkUnitsModal } from "../unlink-units-modal";
import type { Owner } from "../../types";

function owner(overrides: Partial<Owner> = {}): Owner {
  return {
    id: "o1",
    name: "Pedro",
    cpf: null,
    email: null,
    active: true,
    deactivatedBy: null,
    units: ["801", "802"],
    residents: [],
    phones: [],
    vehicles: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("UnlinkUnitsModal", () => {
  beforeEach(() => {
    getUnitsFreedBy.mockReset();
    getUnitsFreedBy.mockReturnValue([]);
    occupiedUnits.mockReset();
    occupiedUnits.mockReturnValue([]);
  });

  it("sends the selected units with the typed password", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<UnlinkUnitsModal owner={owner()} onClose={vi.fn()} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "802" }));
    await userEvent.type(screen.getByLabelText(/confirme sua senha/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /desvincular/i }));

    expect(onConfirm).toHaveBeenCalledWith(["802"], "secret");
  });

  it("keeps the confirm button disabled until a unit and a password are given", async () => {
    render(<UnlinkUnitsModal owner={owner()} onClose={vi.fn()} onConfirm={vi.fn()} />);
    const confirm = screen.getByRole("button", { name: /desvincular/i });

    expect(confirm).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "801" }));
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/confirme sua senha/i), "secret");
    expect(confirm).toBeEnabled();
  });

  it("warns that releasing every unit deactivates the owner and their resident record", async () => {
    getUnitsFreedBy.mockReturnValue(["801"]);
    render(
      <UnlinkUnitsModal
        owner={owner({ residents: [{ id: "r1", name: "Pedro", unit: "801", active: true }] })}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "801" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "802" }));

    expect(screen.getByText(/ficará sem nenhum apartamento e será desativado/i)).toBeInTheDocument();
    expect(screen.getByText(/cadastro de morador de Pedro \(apto 801\)/i)).toBeInTheDocument();
    expect(screen.getByText(/apartamento 801 ficará livre/i)).toBeInTheDocument();
  });

  it("warns when a released apartment keeps its tenants and is left without an owner", async () => {
    occupiedUnits.mockReturnValue(["802"]);
    render(<UnlinkUnitsModal owner={owner()} onClose={vi.fn()} onConfirm={vi.fn()} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "802" }));

    expect(screen.getByText(/802 continua com morador\(es\)/i)).toBeInTheDocument();
  });

  it("keeps the selection and shows why when the server refuses", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Senha incorreta"));
    render(<UnlinkUnitsModal owner={owner()} onClose={vi.fn()} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "802" }));
    await userEvent.type(screen.getByLabelText(/confirme sua senha/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /desvincular/i }));

    expect(await screen.findByText("Senha incorreta")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "802" })).toBeChecked();
  });
});
