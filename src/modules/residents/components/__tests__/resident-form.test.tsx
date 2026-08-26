import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmProvider } from "@/components/confirm/confirm-provider";
import { ResidentForm } from "../resident-form";
import type { Resident } from "../../types";
import type { UnitOccupancy } from "@/modules/apartments/types";

// Either the same occupancy for any unit, or a per-unit lookup for tests where
// different apartments need different owners/residents.
let occupancyData: UnitOccupancy | ((unit: string) => UnitOccupancy) = {
  owner: { id: "o1", name: "Owner Person", phones: [] },
  residents: [],
};

vi.mock("@/modules/apartments/hooks/use-unit-occupancy", () => ({
  useUnitOccupancy: (unit: string | null) => {
    if (!unit) return { data: undefined };
    return { data: typeof occupancyData === "function" ? occupancyData(unit) : occupancyData };
  },
}));

let occupiedUnits: string[] | undefined;

vi.mock("@/modules/apartments/hooks/use-occupied-units", () => ({
  useOccupiedUnits: () => ({ data: occupiedUnits }),
}));

function renderForm(onSubmit = vi.fn(), defaultValues?: Resident) {
  render(
    <ConfirmProvider>
      <ResidentForm onSubmit={onSubmit} onCancel={vi.fn()} defaultValues={defaultValues} />
    </ConfirmProvider>,
  );
  return onSubmit;
}

// The grid renders both a desktop table and a mobile floor-first picker at
// once (CSS hides one via a media query JSDOM doesn't evaluate) — the first
// match is always the desktop button.
function unitButton(unit: string) {
  return screen.getAllByRole("button", { name: unit })[0];
}

describe("ResidentForm", () => {
  beforeEach(() => {
    occupancyData = { owner: { id: "o1", name: "Owner Person", phones: [] }, residents: [] };
    occupiedUnits = undefined;
  });

  it("shows plain name/cpf/email fields and no É proprietário switch before a unit is selected", () => {
    renderForm();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "É proprietário" })).not.toBeInTheDocument();
  });

  it("auto-links the unit's own registered owner when É proprietário is toggled on, and enables submit", async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    await userEvent.click(unitButton("101"));
    await userEvent.click(await screen.findByRole("checkbox", { name: "É proprietário" }));

    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(screen.getByText("Owner Person")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ isOwner: true, ownerId: "o1", name: "Owner Person", unit: "101" }),
    );
  });

  it("shows editable name/cpf/email fields again, cleared, when the toggle is switched back off", async () => {
    renderForm();

    await userEvent.click(unitButton("101"));
    await userEvent.click(await screen.findByRole("checkbox", { name: "É proprietário" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "É proprietário" }));

    expect(screen.getByLabelText("Nome")).toHaveValue("");
  });

  it("shows an error and no É proprietário switch when the selected unit has no owner", async () => {
    occupancyData = { owner: null, residents: [] };
    renderForm();

    await userEvent.click(unitButton("101"));

    expect(await screen.findByText(/não há proprietário cadastrado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeDisabled();
    expect(screen.queryByRole("checkbox", { name: "É proprietário" })).not.toBeInTheDocument();
  });

  it("hides the É proprietário switch when the unit already has an owner-resident", async () => {
    occupancyData = {
      owner: { id: "o1", name: "Owner Person", phones: [] },
      residents: [{ id: "r1", name: "Lúcia", isOwner: true, phones: [] }],
    };
    renderForm();

    await userEvent.click(unitButton("101"));

    expect(await screen.findByText(/lúcia já está cadastrado\(a\) como proprietário/i)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "É proprietário" })).not.toBeInTheDocument();
  });

  it("still shows the switch when editing the resident who already is the owner", async () => {
    occupancyData = {
      owner: { id: "o1", name: "Owner Person", phones: [] },
      residents: [{ id: "r1", name: "Lúcia", isOwner: true, phones: [] }],
    };
    renderForm(vi.fn(), {
      id: "r1",
      name: "Lúcia",
      cpf: "111",
      email: null,
      unit: "101",
      active: true,
      isOwner: true,
      ownerId: "o1",
      owner: { id: "o1", name: "Owner Person" },
      phones: [],
      vehicles: [],
      createdAt: "",
      updatedAt: "",
    });

    expect(await screen.findByRole("checkbox", { name: "É proprietário" })).toBeInTheDocument();
    expect(screen.queryByText(/já está cadastrado\(a\) como proprietário/i)).not.toBeInTheDocument();
  });

  it("asks for confirmation before moving an existing resident to a different unit", async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit, {
      id: "r1",
      name: "Lúcia",
      cpf: "111",
      email: null,
      unit: "101",
      active: true,
      isOwner: false,
      ownerId: null,
      owner: null,
      phones: [],
      vehicles: [],
      createdAt: "",
      updatedAt: "",
    });

    await userEvent.click(unitButton("102"));
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/mover lúcia do apartamento 101 para o apartamento 102/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Mover" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ unit: "102" }));
  });

  it("saves without confirmation when the unit is unchanged", async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit, {
      id: "r1",
      name: "Lúcia",
      cpf: "111",
      email: null,
      unit: "101",
      active: true,
      isOwner: false,
      ownerId: null,
      owner: null,
      phones: [],
      vehicles: [],
      createdAt: "",
      updatedAt: "",
    });

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ unit: "101" }));
  });

  it("restores the É proprietário toggle after a detour to another unit and back to the resident's own", async () => {
    occupancyData = (unit) =>
      unit === "506"
        ? { owner: { id: "o1", name: "Cyro Dubeux", phones: [] }, residents: [] }
        : {
            owner: { id: "o2", name: "Maria Lúcia", phones: [] },
            residents: [{ id: "r2", name: "Maria Lúcia", isOwner: true, phones: [] }],
          };

    renderForm(vi.fn(), {
      id: "r1",
      name: "Cyro Dubeux",
      cpf: "111",
      email: null,
      unit: "506",
      active: true,
      isOwner: true,
      ownerId: "o1",
      owner: { id: "o1", name: "Cyro Dubeux" },
      phones: [],
      vehicles: [],
      createdAt: "",
      updatedAt: "",
    });

    expect(await screen.findByRole("checkbox", { name: "É proprietário" })).toBeChecked();

    await userEvent.click(unitButton("202"));
    await screen.findByText(/maria lúcia já está cadastrado\(a\) como proprietário/i);
    expect(screen.queryByRole("checkbox", { name: "É proprietário" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Cyro Dubeux");

    await userEvent.click(unitButton("506"));
    expect(await screen.findByRole("checkbox", { name: "É proprietário" })).toBeChecked();
  });

  it("hides (not just unchecks) the É proprietário switch when moving to a unit someone else already owns, even with no resident assigned there yet", async () => {
    occupancyData = (unit) =>
      unit === "506"
        ? { owner: { id: "o1", name: "Cyro Dubeux", phones: [] }, residents: [] }
        : { owner: { id: "o2", name: "Maria Lúcia", phones: [] }, residents: [] };

    renderForm(vi.fn(), {
      id: "r1",
      name: "Cyro Dubeux",
      cpf: "111",
      email: null,
      unit: "506",
      active: true,
      isOwner: true,
      ownerId: "o1",
      owner: { id: "o1", name: "Cyro Dubeux" },
      phones: [],
      vehicles: [],
      createdAt: "",
      updatedAt: "",
    });

    expect(await screen.findByRole("checkbox", { name: "É proprietário" })).toBeChecked();

    await userEvent.click(unitButton("205"));

    expect(await screen.findByText(/maria lúcia é o\(a\) proprietário\(a\) deste apartamento/i)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "É proprietário" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Cyro Dubeux");
  });

  it("hints Livre/Em uso per unit once occupancy data has loaded", () => {
    occupiedUnits = ["101"];
    renderForm();

    expect(unitButton("101").closest("td")).toHaveAttribute("data-tooltip", "Em uso");
    expect(unitButton("102").closest("td")).toHaveAttribute("data-tooltip", "Livre");
  });

  it("shows no occupancy hint while occupied units haven't loaded yet", () => {
    renderForm();

    expect(unitButton("101").closest("td")).not.toHaveAttribute("data-tooltip");
  });
});
