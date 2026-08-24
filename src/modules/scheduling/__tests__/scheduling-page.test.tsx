import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let sessionRole: string | null = "ADMIN";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: sessionRole ? { user: { id: "1", name: "admin", role: sessionRole } } : null }),
}));

vi.mock("../components/scheduling-room-panel", () => ({
  SchedulingRoomPanel: ({ room }: { room: string }) => <div data-testid="panel">{room}</div>,
}));

import { SchedulingPage } from "../components/scheduling-page";

describe("SchedulingPage", () => {
  it("blocks access for a role without scheduling read permission", () => {
    sessionRole = null;
    render(<SchedulingPage />);
    expect(screen.getByText(/não tem permissão/i)).toBeInTheDocument();
  });

  it("defaults to the party hall panel and switches on click", async () => {
    sessionRole = "ADMIN";
    render(<SchedulingPage />);

    expect(screen.getByTestId("panel")).toHaveTextContent("PARTY_HALL");

    await userEvent.click(screen.getByRole("button", { name: /cinema/i }));
    expect(screen.getByTestId("panel")).toHaveTextContent("CINEMA");

    await userEvent.click(screen.getByRole("button", { name: /grill/i }));
    expect(screen.getByTestId("panel")).toHaveTextContent("GRILL");
  });
});
