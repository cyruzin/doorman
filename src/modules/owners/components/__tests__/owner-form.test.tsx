import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OwnerForm } from "../owner-form";

// The grid renders both a desktop table and a mobile floor-first picker at
// once (CSS hides one via a media query JSDOM doesn't evaluate) — the first
// match is always the desktop button.
function unitButton(unit: string) {
  return screen.getAllByRole("button", { name: unit })[0];
}

describe("OwnerForm", () => {
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
});
