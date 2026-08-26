import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let sessionRole: string | null = "ADMIN";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: sessionRole ? { user: { id: "1", name: "admin", role: sessionRole } } : null }),
}));

vi.mock("@/modules/permissions/hooks/use-permissions", () => ({
  usePermissions: () => ({ can: () => sessionRole !== null }),
}));

vi.mock("../components/reports-room-panel", () => ({
  ReportsRoomPanel: ({ room }: { room: string }) => <div data-testid="panel">{room}</div>,
}));

import { ReportsPage } from "../components/reports-page";

describe("ReportsPage", () => {
  it("blocks access for a role without reports read permission", () => {
    sessionRole = null;
    render(<ReportsPage />);
    expect(screen.getByText(/não tem permissão/i)).toBeInTheDocument();
  });

  it("defaults to the party hall panel and switches to cinema on click", async () => {
    sessionRole = "ADMIN";
    render(<ReportsPage />);

    expect(screen.getByTestId("panel")).toHaveTextContent("PARTY_HALL");

    await userEvent.click(screen.getByRole("button", { name: /cinema/i }));
    expect(screen.getByTestId("panel")).toHaveTextContent("CINEMA");
  });

  it("shows all three schedulable rooms, including grill", () => {
    sessionRole = "ADMIN";
    render(<ReportsPage />);

    expect(screen.getByRole("button", { name: /salão de festas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cinema/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /grill/i })).toBeInTheDocument();
  });
});
