"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { can } from "@/lib/permissions";
import { useToast } from "@/components/toast/toast-provider";
import { useConfirm } from "@/components/confirm/confirm-provider";
import { Pagination } from "@/components/pagination/pagination";
import { useCreateNotice, useDeleteNotice, useNotices } from "../hooks/use-notices";
import type { Notice } from "../types";
import styles from "./notices-page.module.css";

const PAGE_SIZE = 20;

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date.toLocaleDateString("pt-BR")} às ${time}`;
}

export function NoticesPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const currentUserName = session?.user?.name ?? "";
  const { showToast } = useToast();
  const requestConfirm = useConfirm();

  const canRead = !!role && can(role, "notices", "read");
  const canCreate = !!role && can(role, "notices", "create");
  const canDelete = !!role && can(role, "notices", "delete");

  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [showOnHome, setShowOnHome] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useNotices({
    page,
    pageSize: PAGE_SIZE,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const createNotice = useCreateNotice();
  const deleteNotice = useDeleteNotice();

  if (!canRead) {
    return (
      <div className="page">
        <p className="text-muted">Você não tem permissão para acessar os recados.</p>
      </div>
    );
  }

  const items = data?.items ?? [];

  // Nobody can remove a system-generated note; a doorman may only remove
  // their own manual ones, while an admin can remove any manual one.
  const canDeleteNotice = (notice: Notice) =>
    canDelete && !notice.isAutomatic && (role === "ADMIN" || notice.authorUsername === currentUserName);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    try {
      await createNotice.mutateAsync({ message, showOnHome });
      setMessage("");
      setShowOnHome(false);
      setPage(1);
      showToast("Recado registrado", "success");
    } catch {
      showToast("Erro ao registrar recado", "error");
    }
  };

  const handleDelete = (notice: Notice) => {
    requestConfirm(
      async () => {
        try {
          await deleteNotice.mutateAsync(notice.id);
          showToast("Recado removido", "success");
        } catch {
          showToast("Erro ao remover recado", "error");
        }
      },
      {
        title: "Excluir recado",
        description: "Remover este recado? Essa ação não pode ser desfeita.",
      },
    );
  };

  return (
    <div className="page">
      <h1 className={styles.title}>Recados</h1>
      <p className={styles.subtitle}>Livro de plantão. Deixe um recado para o próximo porteiro.</p>

      {canCreate && (
        <div className={`card ${styles.formCard}`}>
          <textarea
            className="input"
            aria-label="Novo recado"
            placeholder="Escreva um recado para o próximo plantão..."
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <label className={styles.toggle}>
            <input
              type="checkbox"
              className={styles.toggleInput}
              checked={showOnHome}
              onChange={(e) => setShowOnHome(e.target.checked)}
            />
            <span className={styles.toggleTrack}>
              <span className={styles.toggleThumb} />
            </span>
            <span className={styles.toggleLabel}>Exibir no início</span>
          </label>

          <div className={styles.formActions}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!message.trim() || createNotice.isPending}
              onClick={handleSubmit}
            >
              Enviar recado
            </button>
          </div>
        </div>
      )}

      <h2 className={styles.sectionTitle}>Filtrar por período</h2>
      <div className={`card ${styles.filterRow}`}>
        <div className="form-field">
          <label htmlFor="noticeStartDate">Data inicial</label>
          <input
            id="noticeStartDate"
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
          <label htmlFor="noticeEndDate">Data final</label>
          <input
            id="noticeEndDate"
            type="date"
            className="input"
            min={startDate || undefined}
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          disabled={!startDate && !endDate}
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setPage(1);
          }}
        >
          Resetar filtro
        </button>
      </div>

      <h2 className={styles.sectionTitle}>Últimos recados</h2>

      {isLoading ? (
        <p>Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-muted">Nenhum recado registrado.</p>
      ) : (
        <>
          <div className={styles.list}>
            {items.map((notice) => (
              <div key={notice.id} className={`card ${styles.notice}`}>
                <p className={styles.message}>{notice.message}</p>
                <div className={styles.noticeFooter}>
                  <span className={styles.meta}>
                    {notice.authorUsername} · {formatTimestamp(notice.createdAt)}
                  </span>
                  {canDeleteNotice(notice) && (
                    <button type="button" className="btn btn-secondary" onClick={() => handleDelete(notice)}>
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
