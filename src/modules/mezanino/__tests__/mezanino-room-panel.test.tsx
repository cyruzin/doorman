import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/toast/toast-provider";
import { ConfirmProvider } from "@/components/confirm/confirm-provider";
import type { MezaninoEntry, MezaninoListResult } from "../types";
import type { UnitOccupancy } from "@/modules/apartments/types";

const mutateAsyncCreate = vi.fn().mockResolvedValue({});
const mutateAsyncExit = vi.fn().mockResolvedValue({});
const mutateAsyncDelete = vi.fn().mockResolvedValue({});

let entriesData: MezaninoListResult | undefined = { items: [], total: 0, page: 1, pageSize: 20, occupied: false };
let occupancyData: UnitOccupancy = { owner: null, residents: [] };
let isLoading = false;
let role: "ADMIN" | "DOORMAN" = "ADMIN";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "1", name: "user", role } } }),
}));

vi.mock("../hooks/use-mezanino", () => ({
  useMezaninoEntries: () => ({ data: entriesData, isLoading }),
  useCreateMezaninoEntry: () => ({ mutateAsync: mutateAsyncCreate }),
  useConfirmMezaninoExit: () => ({ mutateAsync: mutateAsyncExit }),
  useDeleteMezaninoEntry: () => ({ mutateAsync: mutateAsyncDelete }),
}));

vi.mock("@/modules/apartments/hooks/use-unit-occupancy", () => ({
  useUnitOccupancy: (unit: string | null) => ({ data: unit ? occupancyData : undefined }),
}));

import { MezaninoRoomPanel } from "../components/mezanino-room-panel";

function entry(overrides: Partial<MezaninoEntry> = {}): MezaninoEntry {
  return {
    id: "e1",
    room: "GAME_ROOM",
    unit: "101",
    residentName: "Resident Person",
    entryAt: new Date().toISOString(),
    exitAt: null,
    ...overrides,
  };
}

// The grid renders both a desktop table and a mobile floor-first picker at
// once (CSS hides one via a media query JSDOM doesn't evaluate) — the first
// match is always the desktop button.
function unitButton(unit: string) {
  return screen.getAllByRole("button", { name: unit })[0];
}

function renderPanel() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <MezaninoRoomPanel room="GAME_ROOM" />
      </ConfirmProvider>
    </ToastProvider>,
  );
}

describe("MezaninoRoomPanel", () => {
  beforeEach(() => {
    mutateAsyncCreate.mockClear();
    mutateAsyncExit.mockClear();
    mutateAsyncDelete.mockClear();
    entriesData = { items: [], total: 0, page: 1, pageSize: 20, occupied: false };
    occupancyData = { owner: null, residents: [] };
    isLoading = false;
    role = "ADMIN";
  });

  it("shows Disponível when free and Em uso when occupied", () => {
    entriesData = { items: [], total: 0, page: 1, pageSize: 20, occupied: true };
    renderPanel();
    expect(screen.getByText("Em uso")).toBeInTheDocument();
  });

  it("only lists actual residents in the resident select, never the owner", async () => {
    occupancyData = {
      owner: { id: "o1", name: "Owner Person", phones: [] },
      residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }],
    };
    renderPanel();

    await userEvent.click(unitButton("101"));

    expect(await screen.findByText("Resident Person")).toBeInTheDocument();
    expect(screen.queryByText("Owner Person")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar entrada/i })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("Morador"), "t1");
    expect(screen.getByRole("button", { name: /confirmar entrada/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("clears the selection when Cancelar is clicked", async () => {
    occupancyData = { owner: null, residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }] };
    renderPanel();

    await userEvent.click(unitButton("101"));
    expect(await screen.findByText("Resident Person")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("Resident Person")).not.toBeInTheDocument();
  });

  it("disables confirming entry when the unit has no resident", async () => {
    renderPanel();
    await userEvent.click(unitButton("101"));

    expect(await screen.findByText(/sem morador cadastrado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar entrada/i })).toBeDisabled();
  });

  it("disables confirming entry when the unit only has an owner, no resident", async () => {
    occupancyData = { owner: { id: "o1", name: "Owner Person", phones: [] }, residents: [] };
    renderPanel();
    await userEvent.click(unitButton("101"));

    expect(await screen.findByText(/sem morador cadastrado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar entrada/i })).toBeDisabled();
  });

  it("registers an entry after picking a resident and confirming the modal", async () => {
    occupancyData = { owner: null, residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }] };
    renderPanel();

    await userEvent.click(unitButton("101"));
    await userEvent.selectOptions(screen.getByLabelText("Morador"), "t1");
    await userEvent.click(screen.getByRole("button", { name: /confirmar entrada/i }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(mutateAsyncCreate).toHaveBeenCalledWith({ room: "GAME_ROOM", unit: "101", residentId: "t1" });
    });
  });

  it("flags a pending row and lets the doorman confirm the exit", async () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, occupied: true };
    renderPanel();

    expect(screen.getByText("Pendente")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /confirmar saída/i }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(mutateAsyncExit).toHaveBeenCalledWith("e1");
    });
  });

  it("hides Confirmar saída and shows no pending badge once returned", () => {
    entriesData = { items: [entry({ exitAt: new Date().toISOString() })], total: 1, page: 1, pageSize: 20, occupied: false };
    renderPanel();

    expect(screen.queryByText("Pendente")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmar saída/i })).not.toBeInTheDocument();
  });

  it("removes a mistaken entry via Excluir after confirming", async () => {
    entriesData = { items: [entry({ exitAt: new Date().toISOString() })], total: 1, page: 1, pageSize: 20, occupied: false };
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(mutateAsyncDelete).toHaveBeenCalledWith("e1");
    });
  });

  it("lets a doorman delete a still-pending entry", () => {
    role = "DOORMAN";
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, occupied: true };
    renderPanel();

    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("hides Excluir from a doorman once the exit is confirmed", () => {
    role = "DOORMAN";
    entriesData = { items: [entry({ exitAt: new Date().toISOString() })], total: 1, page: 1, pageSize: 20, occupied: false };
    renderPanel();

    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });

  it("shows the empty state with no entries today", () => {
    renderPanel();
    expect(screen.getByText(/nenhum uso registrado hoje/i)).toBeInTheDocument();
  });

  it("shows a loading state while the list is fetching", () => {
    isLoading = true;
    entriesData = undefined;
    renderPanel();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("shows an error toast when registering an entry fails", async () => {
    occupancyData = { owner: null, residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }] };
    mutateAsyncCreate.mockRejectedValueOnce(new Error("fail"));
    renderPanel();

    await userEvent.click(unitButton("101"));
    await userEvent.selectOptions(screen.getByLabelText("Morador"), "t1");
    await userEvent.click(screen.getByRole("button", { name: /confirmar entrada/i }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/erro ao registrar entrada/i)).toBeInTheDocument();
  });

  it("shows an error toast when confirming an exit fails", async () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, occupied: true };
    mutateAsyncExit.mockRejectedValueOnce(new Error("fail"));
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /confirmar saída/i }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/erro ao registrar saída/i)).toBeInTheDocument();
  });

  it("shows an error toast when removing an entry fails", async () => {
    entriesData = { items: [entry({ exitAt: new Date().toISOString() })], total: 1, page: 1, pageSize: 20, occupied: false };
    mutateAsyncDelete.mockRejectedValueOnce(new Error("fail"));
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/erro ao remover entrada/i)).toBeInTheDocument();
  });
});
