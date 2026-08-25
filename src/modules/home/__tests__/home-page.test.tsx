import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DashboardSummary } from "../types";
import type { Notice } from "@/modules/notices/types";

const useDashboardSummaryMock = vi.fn();
vi.mock("../hooks/use-dashboard-summary", () => ({
  useDashboardSummary: () => useDashboardSummaryMock(),
}));

import { HomePage } from "../components/home-page";

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    occupancy: { totalUnits: 110, occupiedUnits: 55, totalResidents: 60 },
    scheduling: {
      capacityByRoom: { PARTY_HALL: 10, CINEMA: 20, GRILL: 0 },
      upcoming: [],
    },
    notices: [],
    ...overrides,
  };
}

describe("HomePage", () => {
  it("shows a loading state while the summary is fetching", () => {
    useDashboardSummaryMock.mockReturnValue({ data: undefined, isLoading: true });
    render(<HomePage userName="Raimundo" />);
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("greets the user and shows the occupancy percentage", () => {
    useDashboardSummaryMock.mockReturnValue({ data: summary(), isLoading: false });
    render(<HomePage userName="Raimundo" />);

    expect(screen.getByText(/bem-vindo, raimundo/i)).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === "55 de 110 apartamentos ocupados")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("shows a capacity bar for every scheduling room, linking to its room in /scheduling", () => {
    useDashboardSummaryMock.mockReturnValue({ data: summary(), isLoading: false });
    render(<HomePage userName="Raimundo" />);

    expect(screen.getByText("Salão de festas")).toBeInTheDocument();
    expect(screen.getByText("Cinema")).toBeInTheDocument();
    expect(screen.getByText("Grill")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /salão de festas/i })).toHaveAttribute(
      "href",
      "/scheduling?room=PARTY_HALL",
    );
    expect(screen.getByRole("link", { name: /grill/i })).toHaveAttribute("href", "/scheduling?room=GRILL");
  });

  it("omits the scheduling widgets when the role can't read scheduling", () => {
    useDashboardSummaryMock.mockReturnValue({ data: summary({ scheduling: null }), isLoading: false });
    render(<HomePage userName="Raimundo" />);

    expect(screen.queryByText(/capacidade de agendamento/i)).not.toBeInTheDocument();
  });

  it("omits the upcoming events card when there are none", () => {
    useDashboardSummaryMock.mockReturnValue({ data: summary(), isLoading: false });
    render(<HomePage userName="Raimundo" />);

    expect(screen.queryByText(/próximos eventos/i)).not.toBeInTheDocument();
  });

  it("lists upcoming events when present", () => {
    useDashboardSummaryMock.mockReturnValue({
      data: summary({
        scheduling: {
          capacityByRoom: { PARTY_HALL: 10 },
          upcoming: [
            {
              id: "e1",
              room: "CINEMA",
              unit: "101",
              requesterName: "Maria Silva",
              eventAt: "2026-09-01T20:00:00.000Z",
              allowMultipleSameDay: false,
              notes: null,
              finishedAt: null,
              finishedByUsername: null,
              cancelledAt: null,
              cancelledByUsername: null,
            },
          ],
        },
      }),
      isLoading: false,
    });
    render(<HomePage userName="Raimundo" />);

    expect(screen.getByText(/próximos eventos/i)).toBeInTheDocument();
    expect(screen.getByText("Maria Silva — apto 101")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /maria silva/i })).toHaveAttribute("href", "/scheduling?room=CINEMA");
  });

  it("omits the notices card when there are none pinned to home", () => {
    useDashboardSummaryMock.mockReturnValue({ data: summary(), isLoading: false });
    render(<HomePage userName="Raimundo" />);

    expect(screen.queryByText(/^recados$/i)).not.toBeInTheDocument();
  });

  function pinnedNotice(overrides: Partial<Notice> = {}): Notice {
    return {
      id: "n1",
      message: "Encomenda do 304 na portaria",
      authorUsername: "raimundo",
      showOnHome: true,
      isAutomatic: false,
      createdAt: "2026-08-24T22:00:00.000Z",
      ...overrides,
    };
  }

  it("lists pinned notices above the graph cards, linking to /notices", () => {
    useDashboardSummaryMock.mockReturnValue({
      data: summary({ notices: [pinnedNotice(), pinnedNotice({ id: "n2", message: "Interfone travando" })] }),
      isLoading: false,
    });
    render(<HomePage userName="Raimundo" />);

    expect(screen.getByText(/^recados$/i)).toBeInTheDocument();
    expect(screen.getByText("Encomenda do 304 na portaria")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /encomenda do 304/i })).toHaveAttribute("href", "/notices");
    expect(screen.getByRole("link", { name: /visualizar mais recados/i })).toHaveAttribute("href", "/notices");
  });

  it("hides Visualizar mais recados when there's only a single pinned notice", () => {
    useDashboardSummaryMock.mockReturnValue({ data: summary({ notices: [pinnedNotice()] }), isLoading: false });
    render(<HomePage userName="Raimundo" />);

    expect(screen.getByText("Encomenda do 304 na portaria")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /visualizar mais recados/i })).not.toBeInTheDocument();
  });
});
