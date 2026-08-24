"use client";

import { useState } from "react";
import { useToast } from "@/components/toast/toast-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Pagination } from "@/components/pagination/pagination";
import { useGenerateReportPdf, useReportEntries } from "../hooks/use-reports";
import { ROOM_LABELS, type ReportEntry, type ReportRoom, type ReportStatusFilter } from "../types";
import styles from "./reports-room-panel.module.css";

const PAGE_SIZE = 20;

interface ReportsRoomPanelProps {
  room: ReportRoom;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function entryStatusLabel(entry: ReportEntry): string {
  return entry.cancelledAt ? "Cancelado" : "Utilizado";
}

function operatorName(entry: ReportEntry): string {
  return (entry.cancelledAt ? entry.cancelledByUsername : entry.finishedByUsername) ?? "—";
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Includes seconds so generating two reports back to back doesn't produce
// the same filename.
function toFileTimestamp(date: Date): string {
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map((n) => String(n).padStart(2, "0")).join("-");
  return `${toDateInputValue(date)}_${time}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const DEFAULT_STATUS_FILTER: ReportStatusFilter = { all: true, finished: false, cancelled: false };

export function ReportsRoomPanel({ room }: ReportsRoomPanelProps) {
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>(DEFAULT_STATUS_FILTER);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading } = useReportEntries({
    room,
    ...statusFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    q: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const generatePdf = useGenerateReportPdf();

  const entries = data?.items ?? [];
  const canGenerate = !!startDate && !!endDate;

  const toggleStatus = (key: keyof ReportStatusFilter) => {
    setStatusFilter((current) => ({ ...current, [key]: !current[key] }));
    setPage(1);
  };

  const resetFilters = () => {
    setStatusFilter(DEFAULT_STATUS_FILTER);
    setStartDate("");
    setEndDate("");
    setSearch("");
    setPage(1);
  };

  const handleGenerate = async () => {
    try {
      const blob = await generatePdf.mutateAsync({
        room,
        ...statusFilter,
        startDate,
        endDate,
        q: debouncedSearch || undefined,
      });
      downloadBlob(blob, `relatorio-${slugify(ROOM_LABELS[room])}-${toFileTimestamp(new Date())}.pdf`);
      showToast("Relatório gerado com sucesso", "success");
    } catch {
      showToast("Erro ao gerar relatório", "error");
    }
  };

  return (
    <div className={styles.panel}>
      <div className={`card ${styles.header}`}>
        <h2 className={styles.roomTitle}>{ROOM_LABELS[room]}</h2>
      </div>

      <div className={`card ${styles.filters}`}>
        <div className={styles.filterRow}>
          <div className="form-field">
            <label htmlFor="reportUnitSearch">Pesquisa</label>
            <input
              id="reportUnitSearch"
              type="search"
              className="input"
              placeholder="Pesquise por apto..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="reportStartDate">Data inicial</label>
            <input
              id="reportStartDate"
              type="date"
              className="input"
              max={endDate || undefined}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="reportEndDate">Data final</label>
            <input
              id="reportEndDate"
              type="date"
              className="input"
              min={startDate}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className={styles.statusGroup}>
          <span>Status</span>
          <div className={styles.statusOptions}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={statusFilter.all}
                onChange={() => toggleStatus("all")}
              />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleLabel}>Todos</span>
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={statusFilter.finished}
                onChange={() => toggleStatus("finished")}
              />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleLabel}>Utilizado</span>
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={statusFilter.cancelled}
                onChange={() => toggleStatus("cancelled")}
              />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleLabel}>Cancelado</span>
            </label>
          </div>
        </div>

        <div className={styles.filterActions}>
          <button type="button" className="btn btn-secondary" onClick={resetFilters}>
            Resetar filtros
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canGenerate || generatePdf.isPending}
            onClick={handleGenerate}
          >
            {generatePdf.isPending ? "Gerando..." : "Gerar relatório"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p>Carregando...</p>
      ) : entries.length === 0 ? (
        <p className="text-muted">Nenhum registro encontrado.</p>
      ) : (
        <>
          <div className={`table-wrapper card ${styles.tableWrapper}`}>
            <table>
              <thead>
                <tr>
                  <th>Apartamento</th>
                  <th>Status</th>
                  <th>Solicitante</th>
                  <th>Data do evento</th>
                  <th>Operador</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.unit}</td>
                    <td>
                      <span className={`badge ${entry.cancelledAt ? "badge-danger" : "badge-success"}`}>
                        {entryStatusLabel(entry)}
                      </span>
                    </td>
                    <td>{entry.requesterName}</td>
                    <td>{formatDateTime(entry.eventAt)}</td>
                    <td>{operatorName(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
