import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/toast/toast-provider";
import { ConfirmProvider } from "@/components/confirm/confirm-provider";
import type { Person } from "@/lib/person-client";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "1", name: "admin", role: "ADMIN" } } }),
}));

vi.mock("../person-form", () => ({
  PersonForm: ({ defaultValues }: { defaultValues?: Person }) => (
    <div data-testid="person-form">{defaultValues ? `editing:${defaultValues.name}` : "creating"}</div>
  ),
}));

import { PersonModulePage } from "../person-module-page";

const person: Person = {
  id: "p1",
  name: "Maria Silva",
  cpf: null,
  email: null,
  unit: "101",
  active: true,
  phones: [],
  vehicles: [],
  createdAt: "",
  updatedAt: "",
};

function Wrapper({ isCreating, onCreatingChange }: { isCreating: boolean; onCreatingChange: (value: boolean) => void }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <PersonModulePage
          resource="tenants"
          entityLabel="Inquilino"
          useItems={() => ({ data: { items: [person], total: 1, page: 1, pageSize: 20 }, isLoading: false }) as never}
          useCreate={() => ({ mutateAsync: vi.fn() }) as never}
          useUpdate={() => ({ mutateAsync: vi.fn() }) as never}
          useDelete={() => ({ mutateAsync: vi.fn() }) as never}
          useDetail={() => ({ data: undefined }) as never}
          isCreating={isCreating}
          onCreatingChange={onCreatingChange}
          initialEditId={null}
        />
      </ConfirmProvider>
    </ToastProvider>
  );
}

describe("PersonModulePage", () => {
  it("closes the edit form once the parent flips isCreating to true (Novo X was clicked)", async () => {
    const onCreatingChange = vi.fn();
    const { rerender } = render(<Wrapper isCreating={false} onCreatingChange={onCreatingChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByTestId("person-form")).toHaveTextContent("editing:Maria Silva");

    rerender(<Wrapper isCreating={true} onCreatingChange={onCreatingChange} />);

    expect(screen.getAllByTestId("person-form")).toHaveLength(1);
    expect(screen.getByTestId("person-form")).toHaveTextContent("creating");
  });

  it("asks the parent to close the create form when Editar is clicked", async () => {
    const onCreatingChange = vi.fn();
    render(<Wrapper isCreating={true} onCreatingChange={onCreatingChange} />);

    expect(screen.getByTestId("person-form")).toHaveTextContent("creating");

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(onCreatingChange).toHaveBeenCalledWith(false);
  });
});
