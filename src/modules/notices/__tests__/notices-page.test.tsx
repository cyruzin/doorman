import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/toast/toast-provider";
import { ConfirmProvider } from "@/components/confirm/confirm-provider";
import type { Notice, NoticeListResult } from "../types";

const mutateAsyncCreate = vi.fn().mockResolvedValue({});
const mutateAsyncDelete = vi.fn().mockResolvedValue({});
const useNoticesMock = vi.fn();
let sessionRole = "DOORMAN";
let sessionUsername = "raimundo";
let listData: NoticeListResult = { items: [], total: 0, page: 1, pageSize: 20 };

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "1", name: sessionUsername, role: sessionRole } } }),
}));

vi.mock("../hooks/use-notices", () => ({
  useNotices: (params: unknown) => useNoticesMock(params),
  useCreateNotice: () => ({ mutateAsync: mutateAsyncCreate, isPending: false }),
  useDeleteNotice: () => ({ mutateAsync: mutateAsyncDelete }),
}));

import { NoticesPage } from "../components/notices-page";

function notice(overrides: Partial<Notice> = {}): Notice {
  return {
    id: "n1",
    message: "Encomenda do 304 na portaria",
    authorUsername: "raimundo",
    showOnHome: false,
    isAutomatic: false,
    createdAt: "2026-08-24T22:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <NoticesPage />
      </ConfirmProvider>
    </ToastProvider>,
  );
}

describe("NoticesPage", () => {
  beforeEach(() => {
    mutateAsyncCreate.mockClear();
    mutateAsyncDelete.mockClear();
    useNoticesMock.mockReset();
    sessionRole = "DOORMAN";
    sessionUsername = "raimundo";
    listData = { items: [], total: 0, page: 1, pageSize: 20 };
    useNoticesMock.mockImplementation(() => ({ data: listData, isLoading: false }));
  });

  it("creates a notice with showOnHome off by default", async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText("Novo recado"), "Interfone travando");
    await userEvent.click(screen.getByRole("button", { name: /enviar recado/i }));

    await waitFor(() => {
      expect(mutateAsyncCreate).toHaveBeenCalledWith({ message: "Interfone travando", showOnHome: false });
    });
  });

  it("creates a notice with showOnHome on when the toggle is checked", async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText("Novo recado"), "Aviso pro próximo plantão");
    await userEvent.click(screen.getByLabelText("Exibir no início"));
    await userEvent.click(screen.getByRole("button", { name: /enviar recado/i }));

    await waitFor(() => {
      expect(mutateAsyncCreate).toHaveBeenCalledWith({
        message: "Aviso pro próximo plantão",
        showOnHome: true,
      });
    });
  });

  it("lets a doorman delete their own manual notice", () => {
    listData = { items: [notice({ authorUsername: "raimundo" })], total: 1, page: 1, pageSize: 20 };
    renderPage();

    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("hides delete for a doorman on another porteiro's manual notice", () => {
    listData = { items: [notice({ authorUsername: "lindinaldo" })], total: 1, page: 1, pageSize: 20 };
    renderPage();

    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });

  it("lets an admin delete any manual notice, regardless of author", () => {
    sessionRole = "ADMIN";
    sessionUsername = "admin";
    listData = { items: [notice({ authorUsername: "lindinaldo" })], total: 1, page: 1, pageSize: 20 };
    renderPage();

    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("hides delete for an automatic notice, even for an admin", () => {
    sessionRole = "ADMIN";
    sessionUsername = "admin";
    listData = { items: [notice({ isAutomatic: true, authorUsername: "admin" })], total: 1, page: 1, pageSize: 20 };
    renderPage();

    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });

  it("labels the date range as a filter", () => {
    renderPage();
    expect(screen.getByText("Filtrar por período")).toBeInTheDocument();
  });

  it("labels the list section", () => {
    renderPage();
    expect(screen.getByText("Últimos recados")).toBeInTheDocument();
  });

  it("filters by a start and end date", async () => {
    renderPage();
    useNoticesMock.mockClear();

    await userEvent.type(screen.getByLabelText("Data inicial"), "2026-08-01");
    await userEvent.type(screen.getByLabelText("Data final"), "2026-08-10");

    await waitFor(() => {
      expect(useNoticesMock).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: "2026-08-01", endDate: "2026-08-10" }),
      );
    });
  });

  it("disables Resetar filtro until a date is picked, then clears both fields when clicked", async () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Resetar filtro" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Data inicial"), "2026-08-01");
    expect(screen.getByRole("button", { name: "Resetar filtro" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Resetar filtro" }));

    expect(screen.getByLabelText("Data inicial")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Resetar filtro" })).toBeDisabled();
  });

  it("removes a notice after confirming", async () => {
    listData = { items: [notice({ authorUsername: "raimundo" })], total: 1, page: 1, pageSize: 20 };
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(mutateAsyncDelete).toHaveBeenCalledWith("n1");
    });
  });
});
