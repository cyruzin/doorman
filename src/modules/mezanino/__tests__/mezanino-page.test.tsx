import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let sessionRole: string | null = "ADMIN";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: sessionRole ? { user: { id: "1", name: "admin", role: sessionRole } } : null }),
}));

vi.mock("../components/mezanino-room-panel", () => ({
  MezaninoRoomPanel: ({ room }: { room: string }) => <div data-testid="panel">{room}</div>,
}));

import { MezaninoPage } from "../components/mezanino-page";

describe("MezaninoPage", () => {
  it("blocks access for a role without mezanino read permission", () => {
    sessionRole = null;
    render(<MezaninoPage />);
    expect(screen.getByText(/não tem permissão/i)).toBeInTheDocument();
  });

  it("defaults to the game room panel and switches on click", async () => {
    sessionRole = "ADMIN";
    render(<MezaninoPage />);

    expect(screen.getByTestId("panel")).toHaveTextContent("GAME_ROOM");

    await userEvent.click(screen.getByRole("button", { name: /academia/i }));
    expect(screen.getByTestId("panel")).toHaveTextContent("GYM");

    await userEvent.click(screen.getByRole("button", { name: /espaço kids/i }));
    expect(screen.getByTestId("panel")).toHaveTextContent("KIDS_SPACE");
  });
});
