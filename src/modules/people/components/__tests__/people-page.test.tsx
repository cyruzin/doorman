import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let ownersTotal = 0;

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "1", name: "admin", role: "ADMIN" } } }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/modules/owners/components/owner-page", () => ({
  OwnerPage: () => <div data-testid="owner-page" />,
}));

vi.mock("@/modules/residents/components/resident-page", () => ({
  ResidentPage: () => <div data-testid="resident-page" />,
}));

vi.mock("@/modules/owners/hooks/use-owners", () => ({
  useOwners: () => ({ data: { items: [], total: ownersTotal, page: 1, pageSize: 1 } }),
}));

import { PeoplePage } from "../people-page";

describe("PeoplePage", () => {
  it("defaults to the Proprietários tab, since owners take priority over residents", () => {
    ownersTotal = 0;
    render(<PeoplePage />);

    expect(screen.getByRole("tab", { name: /proprietários/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /novo proprietário/i })).toBeInTheDocument();
    expect(screen.getByTestId("owner-page")).toBeInTheDocument();
  });

  it("disables Novo morador and warns when there are no owners yet", async () => {
    ownersTotal = 0;
    render(<PeoplePage />);

    await userEvent.click(screen.getByRole("tab", { name: /moradores/i }));

    expect(screen.getByRole("button", { name: /novo morador/i })).toBeDisabled();
    expect(screen.getByText(/cadastre um proprietário antes de cadastrar um morador/i)).toBeInTheDocument();
    expect(screen.getByTestId("resident-page")).toBeInTheDocument();
  });

  it("enables Novo morador once an owner exists", async () => {
    ownersTotal = 1;
    render(<PeoplePage />);

    await userEvent.click(screen.getByRole("tab", { name: /moradores/i }));

    expect(screen.getByRole("button", { name: /novo morador/i })).toBeEnabled();
    expect(screen.queryByText(/cadastre um proprietário/i)).not.toBeInTheDocument();
  });

  it("does not block creating an owner even with no owners registered yet", async () => {
    ownersTotal = 0;
    render(<PeoplePage />);

    await userEvent.click(screen.getByRole("tab", { name: /proprietários/i }));

    expect(screen.getByRole("button", { name: /novo proprietário/i })).toBeEnabled();
    expect(screen.queryByText(/cadastre um proprietário/i)).not.toBeInTheDocument();
  });
});
