import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UnitOccupancy } from "@/modules/apartments/types";
import type { Person } from "@/lib/person-client";

let unitOccupancy: UnitOccupancy | undefined;

vi.mock("@/modules/apartments/hooks/use-unit-occupancy", () => ({
  useUnitOccupancy: (unit: string | null) => ({ data: unit ? unitOccupancy : undefined }),
}));

import { PersonForm } from "../person-form";

describe("PersonForm", () => {
  beforeEach(() => {
    unitOccupancy = undefined;
  });

  it("shows validation errors when required fields are empty", async () => {
    const onSubmit = vi.fn();
    render(<PersonForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits once the required fields are filled in", async () => {
    const onSubmit = vi.fn();
    render(<PersonForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText(/^nome$/i), "Maria Silva");
    await userEvent.selectOptions(screen.getAllByLabelText(/^apartamento$/i)[0], "101");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("supports adding more than one phone", async () => {
    const onSubmit = vi.fn();
    render(<PersonForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText(/^nome$/i), "Maria Silva");
    await userEvent.selectOptions(screen.getAllByLabelText(/^apartamento$/i)[0], "101");

    await userEvent.click(screen.getByRole("button", { name: /adicionar telefone/i }));
    await userEvent.click(screen.getByRole("button", { name: /adicionar telefone/i }));
    const phoneInputs = screen.getAllByLabelText(/^telefone$/i);
    expect(phoneInputs).toHaveLength(2);

    await userEvent.type(phoneInputs[0], "11999990000");
    await userEvent.type(phoneInputs[1], "11988887777");
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].phones).toEqual([
      { number: "11999990000", isWhatsapp: false },
      { number: "11988887777", isWhatsapp: false },
    ]);
  });

  it("masks CPF and phone while typing but submits plain digits", async () => {
    const onSubmit = vi.fn();
    render(<PersonForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText(/^nome$/i), "Maria Silva");
    await userEvent.selectOptions(screen.getAllByLabelText(/^apartamento$/i)[0], "101");
    await userEvent.type(screen.getByLabelText(/^cpf$/i), "12345678900");
    expect(screen.getByLabelText(/^cpf$/i)).toHaveValue("123.456.789-00");

    await userEvent.click(screen.getByRole("button", { name: /adicionar telefone/i }));
    const phoneInput = screen.getByLabelText(/^telefone$/i);
    await userEvent.type(phoneInput, "11999990000");
    expect(phoneInput).toHaveValue("(11) 99999-0000");

    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].cpf).toBe("12345678900");
    expect(onSubmit.mock.calls[0][0].phones).toEqual([{ number: "11999990000", isWhatsapp: false }]);
  });

  it("does not show the owner picker or the unit check for the Owner form", () => {
    render(<PersonForm onSubmit={vi.fn()} onCancel={() => {}} />);
    expect(screen.queryByLabelText(/proprietário/i)).not.toBeInTheDocument();
  });

  it("blocks saving a tenant for a unit with no owner registered", async () => {
    unitOccupancy = { owners: [], tenants: [] };
    const onSubmit = vi.fn();
    render(<PersonForm onSubmit={onSubmit} onCancel={() => {}} showOwnerField />);

    await userEvent.selectOptions(screen.getAllByLabelText(/^apartamento$/i)[0], "101");

    expect(await screen.findByText(/não há proprietário cadastrado para o apartamento 101/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^salvar$/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("allows saving a tenant once the unit has a registered owner", async () => {
    unitOccupancy = { owners: [{ id: "o1", name: "Owner Person", phones: [] }], tenants: [] };
    const onSubmit = vi.fn();
    render(<PersonForm onSubmit={onSubmit} onCancel={() => {}} showOwnerField />);

    await userEvent.type(screen.getByLabelText(/^nome$/i), "Maria Silva");
    await userEvent.selectOptions(screen.getAllByLabelText(/^apartamento$/i)[0], "101");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^salvar$/i })).toBeEnabled();
    });
    expect(screen.queryByText(/não há proprietário cadastrado/i)).not.toBeInTheDocument();
  });

  it("never renders a manual owner picker for the Tenant form, only the missing-owner warning", () => {
    unitOccupancy = { owners: [], tenants: [] };
    render(<PersonForm onSubmit={vi.fn()} onCancel={() => {}} showOwnerField />);
    expect(screen.queryByPlaceholderText(/buscar proprietário por nome/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^proprietário/i)).not.toBeInTheDocument();
  });

  it("renders Apartamento as a select limited to valid building units, not free text", () => {
    render(<PersonForm onSubmit={vi.fn()} onCancel={() => {}} />);
    const [unitSelect] = screen.getAllByLabelText(/^apartamento$/i);
    expect(unitSelect.tagName).toBe("SELECT");
    expect(within(unitSelect).getByRole("option", { name: "101" })).toBeInTheDocument();
    expect(within(unitSelect).getByRole("option", { name: "1901" })).toBeInTheDocument();
    expect(within(unitSelect).queryByRole("option", { name: "150" })).not.toBeInTheDocument();
    expect(within(unitSelect).queryByRole("option", { name: "1903" })).not.toBeInTheDocument();
  });

  it("pre-selects the mobile floor picker to match the unit being edited", () => {
    const defaultValues: Person = {
      id: "p1",
      name: "Maria Santos",
      cpf: null,
      email: null,
      unit: "506",
      active: true,
      phones: [],
      vehicles: [],
      createdAt: "",
      updatedAt: "",
    };
    render(<PersonForm defaultValues={defaultValues} onSubmit={vi.fn()} onCancel={() => {}} />);
    expect(screen.getByLabelText("Andar")).toHaveValue("5");
  });
});
