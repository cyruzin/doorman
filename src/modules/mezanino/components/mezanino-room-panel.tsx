"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { getAllUnits, getFloors, getUnitNumber, getUnitsPerFloor } from "@/lib/building";
import { useToast } from "@/components/toast/toast-provider";
import { useConfirm } from "@/components/confirm/confirm-provider";
import { Pagination } from "@/components/pagination/pagination";
import { useUnitOccupancy } from "@/modules/apartments/hooks/use-unit-occupancy";
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
  const [floor, setFloor] = useState(1);
  const [unit, setUnit] = useState("");

  const { data, isLoading } = useMezaninoEntries({ room, page, pageSize: PAGE_SIZE });
  const { data: occupancy } = useUnitOccupancy(unit || null);
  const createEntry = useCreateMezaninoEntry();
  const confirmExit = useConfirmMezaninoExit();
  const deleteEntry = useDeleteMezaninoEntry();

  const floors = getFloors();
  const allUnits = getAllUnits();
  const floorUnits = Array.from({ length: getUnitsPerFloor(floor) }, (_, i) => getUnitNumber(floor, i + 1));

  const residentName = !occupancy
    ? ""
    : occupancy.tenants.length > 0
      ? occupancy.tenants.map((t) => t.name).join(", ")
      : occupancy.owners.length > 0
        ? occupancy.owners.map((o) => o.name).join(", ")
        : "Apartamento sem morador cadastrado";
  const hasResident = !!occupancy && (occupancy.tenants.length > 0 || occupancy.owners.length > 0);

  const clearSelection = () => setUnit("");

  const handleConfirmEntry = () => {
    requestConfirm(
      async () => {
        try {
          await createEntry.mutateAsync({ room, unit });
          showToast("Entrada registrada com sucesso", "success");
          clearSelection();
        } catch {
          showToast("Erro ao registrar entrada", "error");
        }
      },
      {
        title: "Confirmar entrada",
        description: `Registrar entrada de ${residentName} (apto ${unit}) em ${ROOM_LABELS[room]}?`,
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
        <select
          className={`input ${styles.desktopOnly}`}
          aria-label="Apartamento"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        >
          <option value="">Selecione o apartamento</option>
          {floors.map((f) => (
            <optgroup key={f} label={`${f}º andar`}>
              {allUnits
                .filter((u) => u.floor === f)
                .map((u) => (
                  <option key={u.unit} value={u.unit}>
                    {u.unit}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>

        <div className={styles.mobileOnly}>
          <select
            className="input"
            aria-label="Andar"
            value={floor}
            onChange={(e) => {
              setFloor(Number(e.target.value));
              clearSelection();
            }}
          >
            {floors.map((f) => (
              <option key={f} value={f}>
                {f}º andar
              </option>
            ))}
          </select>
          <select className="input" aria-label="Apartamento" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">Selecione o apartamento</option>
            {floorUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {unit && (
          <div className={styles.selectionRow}>
            <span className={styles.residentName}>{residentName}</span>
            <div className={styles.selectionActions}>
              <button type="button" className="btn btn-secondary" onClick={clearSelection}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" disabled={!hasResident} onClick={handleConfirmEntry}>
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
