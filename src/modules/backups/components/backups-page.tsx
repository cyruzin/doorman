"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { can } from "@/lib/permissions";
import { useToast } from "@/components/toast/toast-provider";
import { useConfirm } from "@/components/confirm/confirm-provider";
import { useBackups, useCreateBackup, useDeleteBackup } from "../hooks/use-backups";
import type { BackupFilter } from "../types";
import styles from "./backups-page.module.css";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function BackupsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { showToast } = useToast();
  const requestConfirm = useConfirm();
  const [filter, setFilter] = useState<BackupFilter>({});

  const canRead = !!role && can(role, "backups", "read");
  const canCreate = !!role && can(role, "backups", "create");
  const canDelete = !!role && can(role, "backups", "delete");

  const { data: backups = [], isLoading } = useBackups(filter, { enabled: canRead });
  const createBackup = useCreateBackup();
  const deleteBackup = useDeleteBackup();

  if (!canRead) {
    return (
      <div className="page">
        <p className="text-muted">Você não tem permissão para acessar os backups.</p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const handleCreate = async () => {
    try {
      await createBackup.mutateAsync();
      setFilter({});
      showToast("Backup criado com sucesso", "success");
    } catch {
      showToast("Erro ao criar backup", "error");
    }
  };

  const handleDelete = (fileName: string) => {
    requestConfirm(
      async () => {
        try {
          await deleteBackup.mutateAsync(fileName);
          showToast("Backup removido", "success");
        } catch {
          showToast("Erro ao remover backup", "error");
        }
      },
      { title: "Excluir backup", description: `Remover o arquivo ${fileName}? Essa ação não pode ser desfeita.` },
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className={styles.title}>Backups</h1>
        {canCreate && (
          <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={createBackup.isPending}>
            {createBackup.isPending ? "Criando..." : "Criar backup"}
          </button>
        )}
      </div>

      <div className={`card ${styles.filters}`}>
        <div className="form-field">
          <label htmlFor="from">De</label>
          <input
            id="from"
            type="date"
            className="input"
            value={filter.from ?? ""}
            max={filter.to || today}
            onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value || undefined }))}
          />
        </div>
        <div className="form-field">
          <label htmlFor="to">Até</label>
          <input
            id="to"
            type="date"
            className="input"
            value={filter.to ?? ""}
            min={filter.from}
            max={today}
            onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value || undefined }))}
          />
        </div>
      </div>

      {isLoading ? (
        <p>Carregando...</p>
      ) : backups.length === 0 ? (
        <p className="text-muted">Nenhum backup encontrado.</p>
      ) : (
        <div className="table-wrapper card">
          <table>
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Criado em</th>
                <th>Tamanho</th>
                {canDelete && <th aria-label="Ações" />}
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.fileName}>
                  <td>{backup.fileName}</td>
                  <td>{new Date(backup.createdAt).toLocaleString("pt-BR")}</td>
                  <td>{formatSize(backup.sizeBytes)}</td>
                  {canDelete && (
                    <td>
                      <button type="button" className="btn btn-danger" onClick={() => handleDelete(backup.fileName)}>
                        Excluir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
