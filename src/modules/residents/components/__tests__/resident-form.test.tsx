import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResidentForm } from "../resident-form";
import type { UnitOccupancy } from "@/modules/apartments/types";
import type { OwnerListResult } from "@/modules/owners/types";

let occupancyData: UnitOccupancy | undefined = { owner: { id: "o1", name: "Owner Person", phones: [] }, residents: [] };
let ownerSearchResult: OwnerListResult = { items: [], total: 0, page: 1, pageSize: 5 };

vi.mock("@/modules/apartments/hooks/use-unit-occupancy", () => ({
  useUnitOccupancy: (unit: string | null) => ({ data: unit ? occupancyData : undefined }),
}));

vi.mock("@/modules/owners/hooks/use-owners", () => ({
  useOwners: () => ({ data: ownerSearchResult }),
}));

function renderForm(onSubmit = vi.fn()) {
  render(<ResidentForm onSubmit={onSubmit} onCancel={vi.fn()} />);
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
    ownerSearchResult = { items: [], total: 0, page: 1, pageSize: 5 };
  });

  it("shows plain name/cpf/email fields when É proprietário is off", () => {
    renderForm();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar proprietário por nome")).not.toBeInTheDocument();
  });

  it("swaps to an owner search when É proprietário is toggled on, and disables submit until one is picked", async () => {
    ownerSearchResult = {
      items: [{ id: "o1", name: "Owner Person", cpf: "111", email: "owner@x.com" } as never],
      total: 1,
      page: 1,
      pageSize: 5,
    };
    renderForm();

    await userEvent.click(screen.getByRole("checkbox", { name: "É proprietário" }));

    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Buscar proprietário por nome")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeDisabled();
  });

  it("shows no separate select — only the search input and its inline suggestions", async () => {
    ownerSearchResult = {
      items: [{ id: "o1", name: "Owner Person", cpf: "111", email: "owner@x.com" } as never],
      total: 1,
      page: 1,
      pageSize: 5,
    };
    renderForm();

    await userEvent.click(screen.getByRole("checkbox", { name: "É proprietário" }));
    await userEvent.type(screen.getByLabelText("Buscar proprietário por nome"), "Owner");

    expect(await screen.findByRole("option", { name: "Owner Person" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Proprietário")).not.toBeInTheDocument();
  });

  it("auto-fills name/cpf/email from the picked owner and enables submit", async () => {
    ownerSearchResult = {
      items: [{ id: "o1", name: "Owner Person", cpf: "11122233344", email: "owner@x.com" } as never],
      total: 1,
      page: 1,
      pageSize: 5,
    };
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    await userEvent.click(unitButton("101"));
    await userEvent.click(screen.getByRole("checkbox", { name: "É proprietário" }));
    await userEvent.type(screen.getByLabelText("Buscar proprietário por nome"), "Owner");
    await userEvent.click(await screen.findByRole("option", { name: "Owner Person" }));

    expect(screen.getByRole("button", { name: /salvar/i })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ isOwner: true, ownerId: "o1", name: "Owner Person", cpf: "11122233344" }),
    );
  });

  it("clears the owner link and re-opens suggestions when typing after a pick", async () => {
    ownerSearchResult = {
      items: [{ id: "o1", name: "Owner Person", cpf: "111", email: "owner@x.com" } as never],
      total: 1,
      page: 1,
      pageSize: 5,
    };
    renderForm();

    await userEvent.click(screen.getByRole("checkbox", { name: "É proprietário" }));
    await userEvent.type(screen.getByLabelText("Buscar proprietário por nome"), "Owner");
    await userEvent.click(await screen.findByRole("option", { name: "Owner Person" }));
    expect(screen.getByText("Selecionado")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Buscar proprietário por nome"), " Two");
    expect(screen.queryByText("Selecionado")).not.toBeInTheDocument();
  });

  it("shows editable name/cpf/email fields again when the toggle is switched back off", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("checkbox", { name: "É proprietário" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "É proprietário" }));

    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar proprietário por nome")).not.toBeInTheDocument();
  });

  it("shows an error and no schedule fields when the selected unit has no owner", async () => {
    occupancyData = { owner: null, residents: [] };
    renderForm();

    await userEvent.click(unitButton("101"));

    expect(await screen.findByText(/não há proprietário cadastrado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeDisabled();
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
    render(
      <ResidentForm
        defaultValues={{
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
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(await screen.findByRole("checkbox", { name: "É proprietário" })).toBeInTheDocument();
    expect(screen.queryByText(/já está cadastrado\(a\) como proprietário/i)).not.toBeInTheDocument();
  });
});
