"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/toast/toast-provider";
import { useConfirm } from "@/components/confirm/confirm-provider";
import { Pagination } from "@/components/pagination/pagination";
import { useUnitOccupancy } from "@/modules/apartments/hooks/use-unit-occupancy";
import { ApartmentGrid } from "@/modules/apartments/components/apartment-grid";
import {
  useConfirmMezaninoExit,
  useCreateMezaninoEntry,
  useDeleteMezaninoEntry,
  useMezaninoEntries,
} from "../hooks/use-mezanino";
import { ROOM_LABELS, type MezaninoEntry, type MezaninoRoom } from "../types";
import styles from "./mezanino-room-panel.module.css";

const PAGE_SIZE = 20;

interface MezaninoRoomPanelProps {
  room: MezaninoRoom;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function MezaninoRoomPanel({ room }: MezaninoRoomPanelProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { showToast } = useToast();
  const requestConfirm = useConfirm();

  const [page, setPage] = useState(1);
  const [unit, setUnit] = useState("");
  const [residentId, setResidentId] = useState("");

  const { data, isLoading } = useMezaninoEntries({ room, page, pageSize: PAGE_SIZE });
  const { data: occupancy } = useUnitOccupancy(unit || null);
  const createEntry = useCreateMezaninoEntry();
  const confirmExit = useConfirmMezaninoExit();
  const deleteEntry = useDeleteMezaninoEntry();

  // Only actual residents can check out a key — owning the unit doesn't
  // mean living in it.
  const residents = occupancy?.residents ?? [];
  const selectedResident = residents.find((r) => r.id === residentId) ?? null;

  const selectUnit = (value: string) => {
    setUnit(value);
    setResidentId("");
  };

  const clearSelection = () => {
    setUnit("");
    setResidentId("");
  };

  const handleConfirmEntry = () => {
    if (!selectedResident) return;
    requestConfirm(
      async () => {
        try {
          await createEntry.mutateAsync({ room, unit, residentId });
          showToast("Entrada registrada com sucesso", "success");
          clearSelection();
        } catch {
          showToast("Erro ao registrar entrada", "error");
        }
      },
      {
        title: "Confirmar entrada",
        description: `Registrar entrada de ${selectedResident.name} (apto ${unit}) em ${ROOM_LABELS[room]}?`,
      },
    );
  };

  const handleConfirmExit = (entry: MezaninoEntry) => {
    requestConfirm(
      async () => {
        try {
          await confirmExit.mutateAsync(entry.id);
          showToast("Saída registrada com sucesso", "success");
        } catch {
          showToast("Erro ao registrar saída", "error");
        }
      },
      {
        title: "Confirmar saída",
        description: `Registrar saída de ${entry.residentName} (apto ${entry.unit})?`,
      },
    );
  };

  const handleDelete = (entry: MezaninoEntry) => {
    requestConfirm(
      async () => {
        try {
          await deleteEntry.mutateAsync(entry.id);
          showToast("Entrada removida", "success");
        } catch {
          showToast("Erro ao remover entrada", "error");
        }
      },
      {
        title: "Excluir entrada",
        description: `Remover o registro de ${entry.residentName} (apto ${entry.unit})? Essa ação não pode ser desfeita.`,
      },
    );
  };

  const entries = data?.items ?? [];
  const occupied = data?.occupied ?? false;

  return (
    <div className={styles.panel}>
      <div className={`card ${styles.header}`}>
        <h2 className={styles.roomTitle}>{ROOM_LABELS[room]}</h2>
        <span className={occupied ? "badge badge-danger" : "badge badge-success"}>
          {occupied ? "Em uso" : "Disponível"}
        </span>
      </div>

      <div className={`card ${styles.entryForm}`}>
        <p className={styles.gridLabel}>{`Selecione o apartamento que vai usar ${ROOM_LABELS[room]}`}</p>
        <ApartmentGrid selectedUnit={unit || null} onSelect={selectUnit} />

        {unit && (
          <div className={styles.selectionRow}>
            {residents.length === 0 ? (
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
            <div className={styles.selectionActions}>
              <button type="button" className="btn btn-secondary" onClick={clearSelection}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedResident}
                onClick={handleConfirmEntry}
              >
                Confirmar entrada
              </button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <p>Carregando...</p>
      ) : entries.length === 0 ? (
        <p className="text-muted">Nenhum uso registrado hoje.</p>
      ) : (
        <>
          <div className={`table-wrapper card ${styles.tableWrapper}`}>
            <table>
              <thead>
                <tr>
                  <th>Apartamento</th>
                  <th>Morador</th>
                  <th>Data</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const pending = !entry.exitAt;
                  return (
                    <tr key={entry.id} className={pending ? styles.rowPending : styles.rowReturned}>
                      <td>{entry.unit}</td>
                      <td>{entry.residentName}</td>
                      <td>{new Date(entry.entryAt).toLocaleDateString("pt-BR")}</td>
                      <td>{formatTime(entry.entryAt)}</td>
                      <td>
                        {entry.exitAt ? (
                          formatTime(entry.exitAt)
                        ) : (
                          <span className="badge badge-danger">Pendente</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {(pending || isAdmin) && (
                            <button type="button" className="btn btn-secondary" onClick={() => handleDelete(entry)}>
                              Excluir
                            </button>
                          )}
                          {pending && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleConfirmExit(entry)}
                            >
                              Confirmar saída
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
