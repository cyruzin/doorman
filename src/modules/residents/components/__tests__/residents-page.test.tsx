import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Person } from "@/lib/person-client";

let ownersItems: Person[] = [];

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "1", name: "admin", role: "ADMIN" } } }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/person/person-module-page", () => ({
  PersonModulePage: () => <div data-testid="module-page" />,
}));

vi.mock("@/modules/tenants/hooks/use-tenants", () => ({
  useTenants: () => ({ data: undefined, isLoading: false }),
  useCreateTenant: () => ({ mutateAsync: vi.fn() }),
  useUpdateTenant: () => ({ mutateAsync: vi.fn() }),
  useDeleteTenant: () => ({ mutateAsync: vi.fn() }),
  useTenantDetail: () => ({ data: undefined }),
}));

vi.mock("@/modules/owners/hooks/use-owners", () => ({
  useOwners: () => ({ data: { items: ownersItems, total: ownersItems.length, page: 1, pageSize: 100 } }),
  useCreateOwner: () => ({ mutateAsync: vi.fn() }),
  useUpdateOwner: () => ({ mutateAsync: vi.fn() }),
  useDeleteOwner: () => ({ mutateAsync: vi.fn() }),
  useOwnerDetail: () => ({ data: undefined }),
}));

import { ResidentsPage } from "../residents-page";

describe("ResidentsPage", () => {
  it("disables Novo inquilino and warns when there are no owners yet", () => {
    ownersItems = [];
    render(<ResidentsPage />);

    expect(screen.getByRole("button", { name: /novo inquilino/i })).toBeDisabled();
    expect(screen.getByText(/cadastre um proprietário antes de cadastrar um inquilino/i)).toBeInTheDocument();
  });

  it("enables Novo inquilino once an owner exists", () => {
    ownersItems = [{ id: "o1", name: "Owner", unit: "101" } as Person];
    render(<ResidentsPage />);

    expect(screen.getByRole("button", { name: /novo inquilino/i })).toBeEnabled();
    expect(screen.queryByText(/cadastre um proprietário/i)).not.toBeInTheDocument();
  });

  it("does not block creating an owner even with no owners registered yet", async () => {
    ownersItems = [];
    render(<ResidentsPage />);

    await userEvent.click(screen.getByRole("tab", { name: /proprietários/i }));

    expect(screen.getByRole("button", { name: /novo proprietário/i })).toBeEnabled();
    expect(screen.queryByText(/cadastre um proprietário/i)).not.toBeInTheDocument();
  });
});
