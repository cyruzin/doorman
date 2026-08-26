"use client";

import { useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/toast/toast-provider";
import { useConfirm } from "@/components/confirm/confirm-provider";
import { Pagination } from "@/components/pagination/pagination";
import { useUnitOccupancy } from "@/modules/apartments/hooks/use-unit-occupancy";
import { ApartmentGrid } from "@/modules/apartments/components/apartment-grid";
import {
  useCreateSchedulingEntry,
  useDeleteSchedulingEntry,
  useFinishSchedulingEntry,
  useSchedulingEntries,
  useUpdateSchedulingEntry,
} from "../hooks/use-scheduling";
import { ROOM_LABELS, type SchedulingEntry, type SchedulingRoom } from "../types";
import styles from "./scheduling-room-panel.module.css";

const PAGE_SIZE = 20;

interface SchedulingRoomPanelProps {
  room: SchedulingRoom;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function toIsoDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// Surfaces the API's specific { error: string } message instead of a generic fallback.
function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: unknown } | undefined;
    if (typeof data?.error === "string") return data.error;
  }
  return fallback;
}

export function SchedulingRoomPanel({ room }: SchedulingRoomPanelProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { showToast } = useToast();
  const requestConfirm = useConfirm();

  const [page, setPage] = useState(1);
  const [unit, setUnit] = useState("");
  const [residentId, setResidentId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [allowMultipleSameDay, setAllowMultipleSameDay] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingEntry, setEditingEntry] = useState<SchedulingEntry | null>(null);

  const { data, isLoading } = useSchedulingEntries({ room, page, pageSize: PAGE_SIZE });
  const { data: occupancy } = useUnitOccupancy(unit || null);
  const createEntry = useCreateSchedulingEntry();
  const updateEntry = useUpdateSchedulingEntry();
  const finishEntry = useFinishSchedulingEntry();
  const deleteEntry = useDeleteSchedulingEntry();

  // Only residents can book a room — owning the unit doesn't mean living in it.
  const residents = occupancy?.residents ?? [];
  const selectedResident = residents.find((r) => r.id === residentId) ?? null;

  const resetForm = () => {
    setEventDate("");
    setEventTime("");
    setAllowMultipleSameDay(false);
    setHasNotes(false);
    setNotes("");
  };

  const clearSelection = () => {
    setUnit("");
    setResidentId("");
    resetForm();
  };

  const selectUnit = (value: string) => {
    setUnit(value);
    setResidentId("");
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    resetForm();
  };

  const startEdit = (entry: SchedulingEntry) => {
    const eventAt = new Date(entry.eventAt);
    setUnit("");
    setResidentId("");
    setEditingEntry(entry);
    setEventDate(eventAt.toISOString().slice(0, 10));
    setEventTime(eventAt.toTimeString().slice(0, 5));
    setAllowMultipleSameDay(entry.allowMultipleSameDay);
    setHasNotes(!!entry.notes);
    setNotes(entry.notes ?? "");
  };

  const handleSchedule = () => {
    if (!selectedResident) return;
    requestConfirm(
      async () => {
        try {
          await createEntry.mutateAsync({
            room,
            unit,
            residentId,
            eventAt: toIsoDateTime(eventDate, eventTime),
            allowMultipleSameDay,
            notes: hasNotes ? notes : undefined,
          });
          showToast("Evento agendado com sucesso", "success");
          clearSelection();
        } catch (error) {
          showToast(extractApiErrorMessage(error, "Erro ao agendar evento"), "error");
        }
      },
      {
        title: "Confirmar agendamento",
        description: `Agendar ${ROOM_LABELS[room]} para ${selectedResident.name} (apto ${unit}) em ${eventDate.split("-").reverse().join("/")} às ${eventTime}?`,
      },
    );
  };

  const handleUpdate = () => {
    if (!editingEntry) return;
    const target = editingEntry;
    requestConfirm(
      async () => {
        try {
          await updateEntry.mutateAsync({
            id: target.id,
            data: {
              eventAt: toIsoDateTime(eventDate, eventTime),
              allowMultipleSameDay,
              notes: hasNotes ? notes : undefined,
            },
          });
          showToast("Agendamento atualizado com sucesso", "success");
          cancelEdit();
        } catch (error) {
          showToast(extractApiErrorMessage(error, "Erro ao atualizar agendamento"), "error");
        }
      },
      {
        title: "Alterar agendamento",
        description: `Atualizar o agendamento de ${target.requesterName} (apto ${target.unit})?`,
      },
    );
  };

  const handleFinish = (entry: SchedulingEntry) => {
    requestConfirm(
      async () => {
        try {
          await finishEntry.mutateAsync(entry.id);
          showToast("Evento finalizado", "success");
        } catch {
          showToast("Erro ao finalizar evento", "error");
        }
      },
      {
        title: "Finalizar evento",
        description: `Marcar o evento de ${entry.requesterName} (apto ${entry.unit}) como finalizado?`,
      },
    );
  };

  const handleDelete = (entry: SchedulingEntry) => {
    requestConfirm(
      async () => {
        try {
          await deleteEntry.mutateAsync(entry.id);
          showToast("Agendamento removido", "success");
        } catch {
          showToast("Erro ao remover agendamento", "error");
        }
      },
      {
        title: "Excluir agendamento",
        description: `Remover o agendamento de ${entry.requesterName} (apto ${entry.unit})? Essa ação não pode ser desfeita.`,
      },
    );
  };

  // Captured once per mount — good enough to flag/block past events.
  const [now] = useState(() => Date.now());
  const todayStr = toDateInputValue(new Date(now));
  const minTime = eventDate === todayStr ? toTimeInputValue(new Date(now)) : undefined;
  const hasDateAndTime = !!eventDate && !!eventTime;
  const isPastSelection = hasDateAndTime && new Date(toIsoDateTime(eventDate, eventTime)).getTime() <= now;

  const entries = data?.items ?? [];
  const capacityPercent = data?.capacityPercent ?? 0;
  const currentMonthName = new Date(now).toLocaleDateString("pt-BR", { month: "long" });
  const isEditing = !!editingEntry;
  const showFields = isEditing || (!!unit && residents.length > 0);

  return (
    <div className={styles.panel}>
      <div className={`card ${styles.header}`}>
        <h2 className={styles.roomTitle}>{ROOM_LABELS[room]}</h2>
        <span className="badge badge-info">{`Capacidade de ${currentMonthName}: ${capacityPercent}%`}</span>
      </div>

      <div className={`card ${styles.entryForm}`}>
        {!isEditing && (
          <>
            <p className={styles.gridLabel}>{`Selecione o apartamento que vai usar ${ROOM_LABELS[room]}`}</p>
            <ApartmentGrid selectedUnit={unit || null} onSelect={selectUnit} />
          </>
        )}

        {(isEditing || unit) && (
          <div className={styles.selectionRow}>
            {editingEntry ? (
              <span className={styles.residentName}>{`${editingEntry.requesterName} (apto ${editingEntry.unit})`}</span>
            ) : residents.length === 0 ? (
              <span className={styles.residentName}>Apartamento sem morador cadastrado</span>
            ) : (
              <select
                className="input"
                aria-label="Morador"
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
              >
                <option value="">Selecione o morador</option>
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {showFields && (
          <div className={styles.scheduleFields}>
            <div className={styles.dateTimeRow}>
              <label className={styles.fieldLabel}>
                Data
                <input
                  type="date"
                  className="input"
                  aria-label="Data do evento"
                  min={todayStr}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </label>
              <label className={styles.fieldLabel}>
                Hora
                <input
                  type="time"
                  className="input"
                  aria-label="Hora do evento"
                  min={minTime}
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </label>
            </div>

            {isPastSelection && (
              <span className="field-error">O horário selecionado já passou. Escolha uma data ou hora futura.</span>
            )}

            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={allowMultipleSameDay}
                onChange={(e) => setAllowMultipleSameDay(e.target.checked)}
              />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleLabel}>Mais de um evento no mesmo dia</span>
            </label>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={hasNotes}
                onChange={(e) => setHasNotes(e.target.checked)}
              />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleLabel}>Observação</span>
            </label>

            {hasNotes && (
              <textarea
                className="input"
                aria-label="Observação"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            )}

            <div className={styles.selectionActions}>
              <button type="button" className="btn btn-secondary" onClick={isEditing ? cancelEdit : clearSelection}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!hasDateAndTime || isPastSelection || (!isEditing && !selectedResident)}
                onClick={isEditing ? handleUpdate : handleSchedule}
              >
                {isEditing ? "Alterar" : "Agendar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <p>Carregando...</p>
      ) : entries.length === 0 ? (
        <p className="text-muted">Nenhum evento agendado.</p>
      ) : (
        <>
          <div className={`table-wrapper card ${styles.tableWrapper}`}>
            <table>
              <thead>
                <tr>
                  <th>Data do evento</th>
                  <th>Hora</th>
                  <th>Apartamento</th>
                  <th>Solicitante</th>
                  <th>Mais de um evento</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const finished = !!entry.finishedAt;
                  // Only flag as past if still pending — finished events aren't "overdue".
                  const isPast = !finished && new Date(entry.eventAt).getTime() < now;
                  return (
                    <tr key={entry.id} className={isPast ? styles.rowPast : undefined}>
                      <td>{new Date(entry.eventAt).toLocaleDateString("pt-BR")}</td>
                      <td>{formatTime(entry.eventAt)}</td>
                      <td>{entry.unit}</td>
                      <td>{entry.requesterName}</td>
                      <td>{entry.allowMultipleSameDay ? "Sim" : "Não"}</td>
                      <td>
                        {finished ? (
                          <span className="badge badge-success">Finalizado</span>
                        ) : (
                          <span className="badge badge-info">Pendente</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {!finished && (
                            <button type="button" className="btn btn-secondary" onClick={() => startEdit(entry)}>
                              Editar
                            </button>
                          )}
                          {(!finished || isAdmin) && (
                            <button type="button" className="btn btn-secondary" onClick={() => handleDelete(entry)}>
                              Excluir
                            </button>
                          )}
                          {!finished && (
                            <button type="button" className="btn btn-primary" onClick={() => handleFinish(entry)}>
                              Finalizar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
