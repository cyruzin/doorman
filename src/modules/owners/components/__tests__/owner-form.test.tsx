import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OwnerForm } from "../owner-form";

let claimedUnits: Record<string, string> = {};
let occupiedUnits: string[] | undefined;

vi.mock("../../hooks/use-owners", () => ({
  useClaimedUnits: () => ({ data: claimedUnits }),
}));

vi.mock("@/modules/apartments/hooks/use-occupied-units", () => ({
  useOccupiedUnits: () => ({ data: occupiedUnits }),
}));

// The grid renders both a desktop table and a mobile floor-first picker at
// once (CSS hides one via a media query JSDOM doesn't evaluate) — the first
// match is always the desktop button.
function unitButton(unit: string) {
  return screen.getAllByRole("button", { name: unit })[0];
}

describe("OwnerForm", () => {
  beforeEach(() => {
    claimedUnits = {};
    occupiedUnits = undefined;
  });

  it("starts with no apartment selected", () => {
    render(<OwnerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Nenhum apartamento selecionado.")).toBeInTheDocument();
  });

  it("toggles a unit on and off by clicking it in the grid", async () => {
    render(<OwnerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.click(unitButton("101"));
    expect(screen.getByText("Apartamentos: 101")).toBeInTheDocument();
    expect(unitButton("101")).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(unitButton("101"));
    expect(screen.getByText("Nenhum apartamento selecionado.")).toBeInTheDocument();
  });

  it("submits the selected units sorted, unmasking the cpf", async () => {
    const onSubmit = vi.fn();
    render(<OwnerForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Nome"), "Maria");
    await userEvent.type(screen.getByLabelText("CPF"), "12345678900");
    await userEvent.click(unitButton("205"));
    await userEvent.click(unitButton("101"));

    await userEvent.click(screen.getByRole("button", { name: /criar|salvar/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Maria", cpf: "12345678900", units: ["205", "101"] }),
    );
  });

  it("blocks submission when no apartment is selected", async () => {
    const onSubmit = vi.fn();
    render(<OwnerForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Nome"), "Maria");
    await userEvent.type(screen.getByLabelText("CPF"), "12345678900");
    await userEvent.click(screen.getByRole("button", { name: /criar|salvar/i }));

    expect(await screen.findByText(/selecione ao menos um apartamento/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("pre-selects and shows the owner's existing units when editing", () => {
    render(
      <OwnerForm
        defaultValues={{
          id: "o1",
          name: "Maria",
          cpf: "12345678900",
          email: null,
          active: true,
          units: ["101", "302"],
          residents: [],
          phones: [],
          vehicles: [],
          createdAt: "",
          updatedAt: "",
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Apartamentos: 101, 302")).toBeInTheDocument();
    expect(unitButton("101")).toHaveAttribute("aria-pressed", "true");
    expect(unitButton("302")).toHaveAttribute("aria-pressed", "true");
  });

  it("blocks and names the owner in a tooltip for units already claimed by someone else", async () => {
    claimedUnits = { "205": "Maria Lúcia" };
    render(<OwnerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(unitButton("205").closest("td")).toHaveAttribute("data-tooltip", "Maria Lúcia é o proprietário");
    await userEvent.click(unitButton("205"));
    expect(screen.getByText("Nenhum apartamento selecionado.")).toBeInTheDocument();
  });

  it("hints Livre/Em uso on units not claimed by someone else, once occupancy data has loaded", () => {
    occupiedUnits = ["101"];
    render(<OwnerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(unitButton("101").closest("td")).toHaveAttribute("data-tooltip", "Em uso");
    expect(unitButton("102").closest("td")).toHaveAttribute("data-tooltip", "Livre");
  });

  it("keeps the claimed tooltip and styling untouched even once occupancy data has loaded", () => {
    claimedUnits = { "205": "Maria Lúcia" };
    occupiedUnits = ["205"];
    render(<OwnerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(unitButton("205").closest("td")).toHaveAttribute("data-tooltip", "Maria Lúcia é o proprietário");
  });
});
