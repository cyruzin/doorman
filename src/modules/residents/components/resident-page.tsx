"use client";

import { useState } from "react";
import { usePermissions } from "@/modules/permissions/hooks/use-permissions";
import { useToast } from "@/components/toast/toast-provider";
import { useConfirm } from "@/components/confirm/confirm-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Pagination } from "@/components/pagination/pagination";
import { useCreateResident, useDeleteResident, useResidentDetail, useResidents, useUpdateResident } from "../hooks/use-residents";
import type { Resident, ResidentStatusFilter, ResidentWriteInput } from "../types";
import { ResidentForm } from "./resident-form";
import { ResidentTable } from "./resident-table";
import styles from "./resident-page.module.css";

const PAGE_SIZE = 20;

interface ResidentPageProps {
  /** The "novo morador" form's open state — owned by the parent so its create
   * button can live next to the tab switcher. */
  isCreating: boolean;
  onCreatingChange: (value: boolean) => void;
  /** Opens the edit form for this id on mount (e.g. deep-linked from the Apartments detail panel). */
  initialEditId: string | null;
}

export function ResidentPage({ isCreating, onCreatingChange, initialEditId }: ResidentPageProps) {
  const { can } = usePermissions();
  const { showToast } = useToast();
  const requestConfirm = useConfirm();

  const canRead = can("residents", "read");
  const canUpdate = can("residents", "update");
  const canDelete = can("residents", "delete");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ResidentStatusFilter>("active");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading } = useResidents({
    enabled: canRead,
    q: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
    status,
  });
  const residents = data?.items ?? [];
  const createResident = useCreateResident();
  const updateResident = useUpdateResident();
  const deleteResident = useDeleteResident();

  const [manualEditing, setManualEditing] = useState<Resident | null>(null);
  const [dismissedDeepLink, setDismissedDeepLink] = useState(false);
  const detailQuery = useResidentDetail(dismissedDeepLink ? null : initialEditId);
  const editing = isCreating ? null : (manualEditing ?? (dismissedDeepLink ? null : detailQuery.data ?? null));

  if (!canRead) {
    return <p className="text-muted">Você não tem permissão para acessar os moradores.</p>;
  }

  const closeEditing = () => {
    setManualEditing(null);
    setDismissedDeepLink(true);
  };

  const handleEdit = (resident: Resident) => {
    onCreatingChange(false);
    setManualEditing(resident);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: ResidentStatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  const handleCreate = async (data: ResidentWriteInput) => {
    try {
      await createResident.mutateAsync(data);
      showToast("Morador criado com sucesso", "success");
      onCreatingChange(false);
    } catch {
      showToast("Erro ao criar morador", "error");
    }
  };

  const handleUpdate = async (data: ResidentWriteInput) => {
    if (!editing) return;
    try {
      await updateResident.mutateAsync({ id: editing.id, data });
      showToast("Morador atualizado com sucesso", "success");
      closeEditing();
    } catch {
      showToast("Erro ao atualizar morador", "error");
    }
  };

  const handleToggleActive = (resident: Resident) => {
    const activating = !resident.active;
    requestConfirm(
      async () => {
        try {
          await updateResident.mutateAsync({ id: resident.id, data: { active: activating } });
          showToast(activating ? "Morador reativado" : "Morador desativado", "success");
        } catch {
          showToast("Erro ao atualizar status do morador", "error");
        }
      },
      activating
        ? { title: "Reativar morador", description: `Marcar ${resident.name} como ativo novamente?`, confirmLabel: "Reativar" }
        : {
            title: "Desativar morador",
            description: `${resident.name} deixará de aparecer na listagem ativa, mas o registro é mantido.`,
            confirmLabel: "Desativar",
          },
    );
  };

  const handleDelete = (resident: Resident) => {
    requestConfirm(
      async () => {
        try {
          await deleteResident.mutateAsync(resident.id);
          showToast("Morador excluído", "success");
        } catch {
          showToast("Erro ao excluir morador", "error");
        }
      },
      {
        title: "Excluir morador",
        description: `Remover ${resident.name} definitivamente? Essa ação não pode ser desfeita.`,
        confirmLabel: "Excluir",
      },
    );
  };

  return (
    <div className="page-section">
      {isCreating && (
        <div className={`card ${styles.formCard}`}>
          <ResidentForm onSubmit={handleCreate} onCancel={() => onCreatingChange(false)} submitLabel="Criar" />
        </div>
      )}

      {editing && (
        <div className={`card ${styles.formCard}`}>
          <ResidentForm defaultValues={editing} onSubmit={handleUpdate} onCancel={closeEditing} submitLabel="Salvar" />
        </div>
      )}

      <div className={styles.filters}>
        <input
          type="search"
          className="input search-bar"
          placeholder="Buscar morador por nome..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          aria-label="Buscar morador"
        />
        <select
          className="input"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as ResidentStatusFilter)}
          aria-label="Filtrar por status"
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      {isLoading ? (
        <p>Carregando...</p>
      ) : (
        <>
          <ResidentTable
            items={residents}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={handleEdit}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
