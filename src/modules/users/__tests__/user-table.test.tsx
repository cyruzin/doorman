import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserTable } from "../components/user-table";
import type { AppUser } from "../types";

const superAdmin: AppUser = {
  id: "1",
  username: "admin",
  role: "ADMIN",
  isSuperAdmin: true,
  createdAt: "",
};

const regularAdmin: AppUser = {
  id: "2",
  username: "outro-admin",
  role: "ADMIN",
  isSuperAdmin: false,
  createdAt: "",
};

describe("UserTable", () => {
  it("hides the delete button for the super admin but shows it for others", () => {
    render(
      <UserTable
        items={[superAdmin, regularAdmin]}
        canUpdate={true}
        canDelete={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Super admin")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /excluir/i })).toHaveLength(1);
  });
});
