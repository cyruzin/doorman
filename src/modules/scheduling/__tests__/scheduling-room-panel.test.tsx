import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/toast/toast-provider";
import { ConfirmProvider } from "@/components/confirm/confirm-provider";
import type { SchedulingEntry, SchedulingListResult } from "../types";
import type { UnitOccupancy } from "@/modules/apartments/types";

const mutateAsyncCreate = vi.fn().mockResolvedValue({});
const mutateAsyncUpdate = vi.fn().mockResolvedValue({});
const mutateAsyncFinish = vi.fn().mockResolvedValue({});
const mutateAsyncDelete = vi.fn().mockResolvedValue({});

let entriesData: SchedulingListResult | undefined = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  capacityPercent: 100,
};
let occupancyData: UnitOccupancy = { owner: null, residents: [] };
let isLoading = false;
let role: "ADMIN" | "DOORMAN" = "ADMIN";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "1", name: "user", role } } }),
}));

vi.mock("../hooks/use-scheduling", () => ({
  useSchedulingEntries: () => ({ data: entriesData, isLoading }),
  useCreateSchedulingEntry: () => ({ mutateAsync: mutateAsyncCreate }),
  useUpdateSchedulingEntry: () => ({ mutateAsync: mutateAsyncUpdate }),
  useFinishSchedulingEntry: () => ({ mutateAsync: mutateAsyncFinish }),
  useDeleteSchedulingEntry: () => ({ mutateAsync: mutateAsyncDelete }),
}));

vi.mock("@/modules/apartments/hooks/use-unit-occupancy", () => ({
  useUnitOccupancy: (unit: string | null) => ({ data: unit ? occupancyData : undefined }),
}));

import { SchedulingRoomPanel } from "../components/scheduling-room-panel";

const FUTURE_ISO = "2099-06-15T20:00:00.000Z";
const PAST_ISO = "2000-01-10T14:00:00.000Z";

function entry(overrides: Partial<SchedulingEntry> = {}): SchedulingEntry {
  return {
    id: "e1",
    room: "PARTY_HALL",
    unit: "101",
    requesterName: "Resident Person",
    eventAt: FUTURE_ISO,
    allowMultipleSameDay: false,
    notes: null,
    finishedAt: null,
    finishedByUsername: null,
    cancelledAt: null,
    cancelledByUsername: null,
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
        <SchedulingRoomPanel room="PARTY_HALL" />
      </ConfirmProvider>
    </ToastProvider>,
  );
}

describe("SchedulingRoomPanel", () => {
  beforeEach(() => {
    mutateAsyncCreate.mockClear();
    mutateAsyncUpdate.mockClear();
    mutateAsyncFinish.mockClear();
    mutateAsyncDelete.mockClear();
    entriesData = { items: [], total: 0, page: 1, pageSize: 20, capacityPercent: 100 };
    occupancyData = { owner: null, residents: [] };
    isLoading = false;
    role = "ADMIN";
  });

  it("shows the room's capacity percentage for the current month", () => {
    entriesData = { items: [], total: 0, page: 1, pageSize: 20, capacityPercent: 42 };
    renderPanel();

    const monthName = new Date().toLocaleDateString("pt-BR", { month: "long" });
    expect(screen.getByText(`Capacidade de ${monthName}: 42%`)).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("does not show the schedule fields when the unit has no resident", async () => {
    renderPanel();
    await userEvent.click(unitButton("101"));

    expect(await screen.findByText(/sem morador cadastrado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Data do evento")).not.toBeInTheDocument();
  });

  it("does not show the schedule fields when the unit only has an owner, no resident", async () => {
    occupancyData = { owner: { id: "o1", name: "Owner Person", phones: [] }, residents: [] };
    renderPanel();
    await userEvent.click(unitButton("101"));

    expect(await screen.findByText(/sem morador cadastrado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Data do evento")).not.toBeInTheDocument();
  });

  it("disables Agendar until a resident, date and time are filled in", async () => {
    occupancyData = { owner: null, residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }] };
    renderPanel();

    await userEvent.click(unitButton("101"));
    expect(await screen.findByRole("button", { name: "Agendar" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Data do evento"), "2026-09-10");
    await userEvent.type(screen.getByLabelText("Hora do evento"), "20:00");
    expect(screen.getByRole("button", { name: "Agendar" })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("Morador"), "t1");
    expect(screen.getByRole("button", { name: "Agendar" })).toBeEnabled();
  });

  it("blocks scheduling a date/time in the past", async () => {
    occupancyData = { owner: null, residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }] };
    renderPanel();

    await userEvent.click(unitButton("101"));
    const dateInput = await screen.findByLabelText("Data do evento");
    expect(dateInput).toHaveAttribute("min");

    await userEvent.type(dateInput, "2020-01-01");
    await userEvent.type(screen.getByLabelText("Hora do evento"), "10:00");

    expect(screen.getByRole("button", { name: "Agendar" })).toBeDisabled();
    expect(screen.getByText(/o horário selecionado já passou/i)).toBeInTheDocument();
  });

  it("does not show the past-time warning before both fields are filled in", async () => {
    occupancyData = { owner: null, residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }] };
    renderPanel();

    await userEvent.click(unitButton("101"));
    await screen.findByLabelText("Data do evento");

    expect(screen.queryByText(/o horário selecionado já passou/i)).not.toBeInTheDocument();
  });

  it("clears the selection when Cancelar is clicked", async () => {
    occupancyData = { owner: null, residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }] };
    renderPanel();

    await userEvent.click(unitButton("101"));
    expect(await screen.findByText("Resident Person")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("Resident Person")).not.toBeInTheDocument();
  });

  it("schedules an event after confirming the modal", async () => {
    occupancyData = { owner: null, residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }] };
    renderPanel();

    await userEvent.click(unitButton("101"));
    await userEvent.selectOptions(await screen.findByLabelText("Morador"), "t1");
    await userEvent.type(screen.getByLabelText("Data do evento"), "2026-09-10");
    await userEvent.type(screen.getByLabelText("Hora do evento"), "20:00");
    await userEvent.click(screen.getByRole("button", { name: "Agendar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(mutateAsyncCreate).toHaveBeenCalledWith({
        room: "PARTY_HALL",
        unit: "101",
        residentId: "t1",
        eventAt: new Date("2026-09-10T20:00").toISOString(),
        allowMultipleSameDay: false,
        notes: undefined,
      });
    });
  });

  it("includes the note when the Observação checkbox is checked", async () => {
    occupancyData = { owner: null, residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }] };
    renderPanel();

    await userEvent.click(unitButton("101"));
    await userEvent.selectOptions(await screen.findByLabelText("Morador"), "t1");
    await userEvent.type(screen.getByLabelText("Data do evento"), "2026-09-10");
    await userEvent.type(screen.getByLabelText("Hora do evento"), "20:00");
    await userEvent.click(screen.getByRole("checkbox", { name: "Mais de um evento no mesmo dia" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Observação" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Observação" }), "Som até 22h");
    await userEvent.click(screen.getByRole("button", { name: "Agendar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(mutateAsyncCreate).toHaveBeenCalledWith(
        expect.objectContaining({ allowMultipleSameDay: true, notes: "Som até 22h" }),
      );
    });
  });

  it("shows an error toast when scheduling fails", async () => {
    occupancyData = { owner: null, residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }] };
    mutateAsyncCreate.mockRejectedValueOnce(new Error("fail"));
    renderPanel();

    await userEvent.click(unitButton("101"));
    await userEvent.selectOptions(await screen.findByLabelText("Morador"), "t1");
    await userEvent.type(screen.getByLabelText("Data do evento"), "2026-09-10");
    await userEvent.type(screen.getByLabelText("Hora do evento"), "20:00");
    await userEvent.click(screen.getByRole("button", { name: "Agendar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/erro ao agendar evento/i)).toBeInTheDocument();
  });

  it("shows the server's specific message when scheduling hits a same-day conflict", async () => {
    occupancyData = { owner: null, residents: [{ id: "t1", name: "Resident Person", isOwner: false, phones: [] }] };
    mutateAsyncCreate.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: { error: "Já existe um evento agendado nesse dia. Marque 'Mais de um evento no mesmo dia' para continuar." },
      },
    });
    renderPanel();

    await userEvent.click(unitButton("101"));
    await userEvent.selectOptions(await screen.findByLabelText("Morador"), "t1");
    await userEvent.type(screen.getByLabelText("Data do evento"), "2026-09-10");
    await userEvent.type(screen.getByLabelText("Hora do evento"), "20:00");
    await userEvent.click(screen.getByRole("button", { name: "Agendar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/já existe um evento agendado nesse dia/i)).toBeInTheDocument();
  });

  it("lists the event's date, time, unit and requester", () => {
    entriesData = {
      items: [entry({ eventAt: PAST_ISO }), entry({ id: "e2", eventAt: FUTURE_ISO, unit: "202" })],
      total: 2,
      page: 1,
      pageSize: 20,
      capacityPercent: 90,
    };
    renderPanel();

    // The apartment picker grid also has "101"/"202" cells, so scope to the
    // entries table (the last <table> on the page) to avoid ambiguity.
    const tables = screen.getAllByRole("table");
    const entriesTable = within(tables[tables.length - 1]);
    expect(screen.getAllByText("Resident Person")).toHaveLength(2);
    expect(entriesTable.getByRole("cell", { name: "101" })).toBeInTheDocument();
    expect(entriesTable.getByRole("cell", { name: "202" })).toBeInTheDocument();
  });

  it("shows Sim or Não for the multiple-events column based on allowMultipleSameDay", () => {
    entriesData = {
      items: [
        entry({ id: "e1", allowMultipleSameDay: true }),
        entry({ id: "e2", allowMultipleSameDay: false }),
      ],
      total: 2,
      page: 1,
      pageSize: 20,
      capacityPercent: 90,
    };
    renderPanel();

    expect(screen.getByText("Mais de um evento")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Sim" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Não" })).toBeInTheDocument();
  });

  it("switches to edit mode with the button labeled Alterar", async () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByText("Resident Person (apto 101)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alterar" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Apartamento")).not.toBeInTheDocument();
  });

  it("updates the event after confirming Alterar", async () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const dateInput = screen.getByLabelText("Data do evento");
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, "2026-10-01");
    await userEvent.click(screen.getByRole("button", { name: "Alterar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(mutateAsyncUpdate).toHaveBeenCalledWith({
        id: "e1",
        data: expect.objectContaining({ allowMultipleSameDay: false }),
      });
    });
  });

  it("shows an error toast when updating fails", async () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    mutateAsyncUpdate.mockRejectedValueOnce(new Error("fail"));
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getByRole("button", { name: "Alterar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/erro ao atualizar agendamento/i)).toBeInTheDocument();
  });

  it("shows the server's specific message when updating hits a same-day conflict", async () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    mutateAsyncUpdate.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: { error: "Já existe um evento agendado nesse dia. Marque 'Mais de um evento no mesmo dia' para continuar." },
      },
    });
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getByRole("button", { name: "Alterar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/já existe um evento agendado nesse dia/i)).toBeInTheDocument();
  });

  it("leaves edit mode when Cancelar is clicked while editing", async () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(unitButton("101")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Alterar" })).not.toBeInTheDocument();
  });

  it("finishes an event after confirming", async () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(mutateAsyncFinish).toHaveBeenCalledWith("e1");
    });
  });

  it("shows an error toast when finishing fails", async () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    mutateAsyncFinish.mockRejectedValueOnce(new Error("fail"));
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/erro ao finalizar evento/i)).toBeInTheDocument();
  });

  it("removes an event via Excluir after confirming", async () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(mutateAsyncDelete).toHaveBeenCalledWith("e1");
    });
  });

  it("shows an error toast when removing an event fails", async () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    mutateAsyncDelete.mockRejectedValueOnce(new Error("fail"));
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/erro ao remover agendamento/i)).toBeInTheDocument();
  });

  it("hides Editar and Finalizar once an event is finished", () => {
    entriesData = { items: [entry({ finishedAt: PAST_ISO })], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    renderPanel();

    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalizar" })).not.toBeInTheDocument();
  });

  it("hides Excluir from a doorman once the event is finished", () => {
    role = "DOORMAN";
    entriesData = { items: [entry({ finishedAt: PAST_ISO })], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    renderPanel();

    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });

  it("lets an admin delete a finished event", () => {
    role = "ADMIN";
    entriesData = { items: [entry({ finishedAt: PAST_ISO })], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    renderPanel();

    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("badges a finished event as Finalizado, so it explains the month's capacity percentage", () => {
    entriesData = { items: [entry({ finishedAt: PAST_ISO })], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    renderPanel();

    expect(screen.getByText("Finalizado")).toBeInTheDocument();
  });

  it("badges a still-open event as Pendente", () => {
    entriesData = { items: [entry()], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    renderPanel();

    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });

  it("does not flag a finished event as overdue even if its date has passed", () => {
    entriesData = {
      items: [entry({ eventAt: PAST_ISO, finishedAt: PAST_ISO })],
      total: 1,
      page: 1,
      pageSize: 20,
      capacityPercent: 90,
    };
    renderPanel();

    expect(screen.getByText("Resident Person").closest("tr")).not.toHaveAttribute("class");
  });

  it("flags a still-pending event as overdue once its date has passed", () => {
    entriesData = { items: [entry({ eventAt: PAST_ISO })], total: 1, page: 1, pageSize: 20, capacityPercent: 90 };
    renderPanel();

    expect(screen.getByText("Resident Person").closest("tr")).toHaveAttribute("class");
  });

  it("shows the empty state with no events scheduled", () => {
    renderPanel();
    expect(screen.getByText(/nenhum evento agendado/i)).toBeInTheDocument();
  });

  it("shows a loading state while the list is fetching", () => {
    isLoading = true;
    entriesData = undefined;
    renderPanel();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });
});
