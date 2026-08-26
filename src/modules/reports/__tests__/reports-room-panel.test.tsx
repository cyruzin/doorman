import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/toast/toast-provider";
import type { ReportEntry, ReportListResult } from "../types";

const mutateAsyncGenerate = vi.fn();
const useReportEntriesMock = vi.fn();

let listData: ReportListResult | undefined = { items: [], total: 0, page: 1, pageSize: 20 };
let isLoading = false;

vi.mock("@/hooks/use-debounced-value", () => ({
  useDebouncedValue: (value: unknown) => value,
}));

vi.mock("../hooks/use-reports", () => ({
  useReportEntries: (params: unknown) => useReportEntriesMock(params),
  useGenerateReportPdf: () => ({ mutateAsync: mutateAsyncGenerate, isPending: false }),
}));

import { ReportsRoomPanel } from "../components/reports-room-panel";

function entry(overrides: Partial<ReportEntry> = {}): ReportEntry {
  return {
    id: "e1",
    room: "PARTY_HALL",
    unit: "101",
    requesterName: "Resident Person",
    eventAt: "2026-08-10T20:00:00.000Z",
    allowMultipleSameDay: false,
    notes: null,
    finishedAt: "2026-08-10T23:00:00.000Z",
    finishedByUsername: "jonas",
    cancelledAt: null,
    cancelledByUsername: null,
    ...overrides,
  };
}

function renderPanel() {
  return render(
    <ToastProvider>
      <ReportsRoomPanel room="PARTY_HALL" />
    </ToastProvider>,
  );
}

describe("ReportsRoomPanel", () => {
  beforeEach(() => {
    mutateAsyncGenerate.mockReset();
    mutateAsyncGenerate.mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));
    listData = { items: [], total: 0, page: 1, pageSize: 20 };
    isLoading = false;
    useReportEntriesMock.mockReset();
    useReportEntriesMock.mockImplementation(() => ({ data: listData, isLoading }));

    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  it("shows the empty state with no entries", () => {
    renderPanel();
    expect(screen.getByText(/nenhum registro encontrado/i)).toBeInTheDocument();
  });

  it("shows a loading state while the list is fetching", () => {
    isLoading = true;
    listData = undefined;
    useReportEntriesMock.mockImplementation(() => ({ data: listData, isLoading }));
    renderPanel();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("lists entries with Apartamento, Status, Solicitante, Data do evento and Operador in that order", () => {
    listData = {
      items: [
        entry(),
        entry({
          id: "e2",
          unit: "202",
          finishedAt: null,
          finishedByUsername: null,
          cancelledAt: "2026-08-05T10:00:00.000Z",
          cancelledByUsername: "lindinaldo",
        }),
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    };
    useReportEntriesMock.mockImplementation(() => ({ data: listData, isLoading }));
    renderPanel();

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Apartamento", "Status", "Solicitante", "Data do evento", "Operador"]);

    expect(screen.getByRole("cell", { name: "Utilizado" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Cancelado" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "202" })).toBeInTheDocument();
    expect(screen.getByText("jonas")).toBeInTheDocument();
    expect(screen.getByText("lindinaldo")).toBeInTheDocument();
  });

  it("shows a dash when no operator is recorded", () => {
    listData = { items: [entry({ finishedByUsername: null })], total: 1, page: 1, pageSize: 20 };
    useReportEntriesMock.mockImplementation(() => ({ data: listData, isLoading }));
    renderPanel();

    expect(screen.getByRole("cell", { name: "—" })).toBeInTheDocument();
  });

  it("defaults to Todos checked and the other two unchecked", () => {
    renderPanel();

    expect(screen.getByRole("checkbox", { name: "Todos" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Utilizado" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Cancelado" })).not.toBeChecked();
  });

  it("toggles each status checkbox independently", async () => {
    renderPanel();
    useReportEntriesMock.mockClear();

    await userEvent.click(screen.getByRole("checkbox", { name: "Todos" }));
    await waitFor(() => {
      expect(useReportEntriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ all: false, finished: false, cancelled: false }),
      );
    });

    await userEvent.click(screen.getByRole("checkbox", { name: "Utilizado" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Cancelado" }));
    await waitFor(() => {
      expect(useReportEntriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ all: false, finished: true, cancelled: true }),
      );
    });
  });

  it("disables Gerar relatório until both dates are filled in", async () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /gerar relatório/i })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Data inicial"), "2026-08-01");
    expect(screen.getByRole("button", { name: /gerar relatório/i })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Data final"), "2026-08-10");
    expect(screen.getByRole("button", { name: /gerar relatório/i })).toBeEnabled();
  });

  it("allows picking a future end date — a future-dated event may already be cancelled", async () => {
    renderPanel();
    expect(screen.getByLabelText("Data final")).not.toHaveAttribute("max");

    await userEvent.type(screen.getByLabelText("Data final"), "2099-01-01");
    expect(screen.getByLabelText("Data final")).toHaveValue("2099-01-01");
  });

  it("passes the debounced apto search through to the preview query", async () => {
    renderPanel();
    await userEvent.type(screen.getByLabelText("Pesquisa"), "10");

    await waitFor(() => {
      expect(useReportEntriesMock).toHaveBeenCalledWith(expect.objectContaining({ q: "10" }));
    });
  });

  it("resets all filters when Resetar filtros is clicked", async () => {
    renderPanel();

    await userEvent.type(screen.getByLabelText("Data inicial"), "2026-08-01");
    await userEvent.type(screen.getByLabelText("Data final"), "2026-08-10");
    await userEvent.click(screen.getByRole("checkbox", { name: "Cancelado" }));
    await userEvent.type(screen.getByLabelText("Pesquisa"), "101");

    await userEvent.click(screen.getByRole("button", { name: "Resetar filtros" }));

    expect(screen.getByLabelText("Data inicial")).toHaveValue("");
    expect(screen.getByLabelText("Data final")).toHaveValue("");
    expect(screen.getByLabelText("Pesquisa")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "Todos" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Cancelado" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: /gerar relatório/i })).toBeDisabled();
  });

  it("generates and downloads the PDF after filling both dates", async () => {
    renderPanel();

    await userEvent.type(screen.getByLabelText("Data inicial"), "2026-08-01");
    await userEvent.type(screen.getByLabelText("Data final"), "2026-08-10");
    await userEvent.click(screen.getByRole("button", { name: /gerar relatório/i }));

    await waitFor(() => {
      expect(mutateAsyncGenerate).toHaveBeenCalledWith({
        room: "PARTY_HALL",
        all: true,
        finished: false,
        cancelled: false,
        startDate: "2026-08-01",
        endDate: "2026-08-10",
        q: undefined,
      });
    });
    expect(await screen.findByText(/relatório gerado com sucesso/i)).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("shows an error toast when PDF generation fails", async () => {
    mutateAsyncGenerate.mockRejectedValueOnce(new Error("fail"));
    renderPanel();

    await userEvent.type(screen.getByLabelText("Data inicial"), "2026-08-01");
    await userEvent.type(screen.getByLabelText("Data final"), "2026-08-10");
    await userEvent.click(screen.getByRole("button", { name: /gerar relatório/i }));

    expect(await screen.findByText(/erro ao gerar relatório/i)).toBeInTheDocument();
  });
});
