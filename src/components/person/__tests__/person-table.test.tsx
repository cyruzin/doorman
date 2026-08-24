import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PersonTable } from "../person-table";
import type { Person } from "@/lib/person-client";

const person: Person = {
  id: "1",
  name: "Maria Silva",
  cpf: "12345678900",
  email: "",
  unit: "101",
  active: true,
  phones: [{ id: "p1", number: "11999990000", isWhatsapp: true }],
  vehicles: [],
  createdAt: "",
  updatedAt: "",
};

describe("PersonTable", () => {
  it("displays CPF and phone numbers masked, keeping the stored value untouched", () => {
    render(<PersonTable items={[person]} canUpdate={false} canDelete={false} onEdit={vi.fn()} onToggleActive={vi.fn()} />);

    expect(screen.getByText("123.456.789-00")).toBeInTheDocument();
    expect(screen.getByText("(11) 99999-0000")).toBeInTheDocument();
  });

  it("shows a dash when the person has no CPF on file", () => {
    render(
      <PersonTable
        items={[{ ...person, cpf: null }]}
        canUpdate={false}
        canDelete={false}
        onEdit={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );

    // Column order is Nome, Apartamento, CPF, Status, Telefones, Veículos...
    const cpfCell = screen.getAllByRole("cell")[2];
    expect(cpfCell).toHaveTextContent("—");
  });

  it("shows both the plate and the model for each vehicle", () => {
    render(
      <PersonTable
        items={[
          {
            ...person,
            vehicles: [
              { id: "v1", plate: "ABC1234", model: "Onix" },
              { id: "v2", plate: null, model: "Civic" },
            ],
          },
        ]}
        canUpdate={false}
        canDelete={false}
        onEdit={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );

    expect(screen.getByText("Onix — ABC1234, Civic")).toBeInTheDocument();
  });

  it("hides edit/status actions when the user lacks permission", () => {
    render(<PersonTable items={[person]} canUpdate={false} canDelete={false} onEdit={vi.fn()} onToggleActive={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /desativar/i })).not.toBeInTheDocument();
  });

  it("shows a WhatsApp badge and the row actions when allowed", () => {
    render(<PersonTable items={[person]} canUpdate={true} canDelete={true} onEdit={vi.fn()} onToggleActive={vi.fn()} />);

    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desativar/i })).toBeInTheDocument();
  });

  it("shows a Reativar button for an inactive person", () => {
    render(
      <PersonTable
        items={[{ ...person, active: false }]}
        canUpdate={true}
        canDelete={true}
        onEdit={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );

    expect(screen.getByText("Inativo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reativar/i })).toBeInTheDocument();
  });
});
