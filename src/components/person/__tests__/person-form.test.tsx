import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UnitOccupancy } from "@/modules/apartments/types";

let unitOccupancy: UnitOccupancy | undefined;

vi.mock("@/modules/apartments/hooks/use-unit-occupancy", () => ({
  useUnitOccupancy: (unit: string | null) => ({ data: unit ? unitOccupancy : undefined }),
}));

vi.mock("@/modules/owners/hooks/use-owners", () => ({
  useOwners: () => ({ data: { items: [], total: 0, page: 1, pageSize: 10 }, isFetching: false }),
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
    await userEvent.type(screen.getByLabelText(/^apartamento$/i), "101");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("supports adding more than one phone", async () => {
    const onSubmit = vi.fn();
    render(<PersonForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText(/^nome$/i), "Maria Silva");
    await userEvent.type(screen.getByLabelText(/^apartamento$/i), "101");

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
    await userEvent.type(screen.getByLabelText(/^apartamento$/i), "101");
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

    await userEvent.type(screen.getByLabelText(/^apartamento$/i), "101");

    expect(await screen.findByText(/não há proprietário cadastrado para o apartamento 101/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^salvar$/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("allows saving a tenant once the unit has a registered owner", async () => {
    unitOccupancy = { owners: [{ id: "o1", name: "Owner Person", phones: [] }], tenants: [] };
    const onSubmit = vi.fn();
    render(<PersonForm onSubmit={onSubmit} onCancel={() => {}} showOwnerField />);

    await userEvent.type(screen.getByLabelText(/^nome$/i), "Maria Silva");
    await userEvent.type(screen.getByLabelText(/^apartamento$/i), "101");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^salvar$/i })).toBeEnabled();
    });
    expect(screen.queryByText(/não há proprietário cadastrado/i)).not.toBeInTheDocument();
  });
});
