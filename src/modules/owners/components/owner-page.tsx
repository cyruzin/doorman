"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/modules/permissions/hooks/use-permissions";
import { SearchInput } from "@/components/search-input/search-input";
import { useToast } from "@/components/toast/toast-provider";
import { useConfirm } from "@/components/confirm/confirm-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Pagination } from "@/components/pagination/pagination";
import { useCreateOwner, useDeleteOwner, useOwners, useUpdateOwner } from "../hooks/use-owners";
import type { Owner, OwnerInput, OwnerStatusFilter } from "../types";
import { OwnerForm } from "./owner-form";
import { OwnerTable } from "./owner-table";
import styles from "./owner-page.module.css";

const PAGE_SIZE = 20;

interface OwnerPageProps {
  /** The "novo proprietário" form's open state — owned by the parent so its create
   * button can live next to the tab switcher. */
  isCreating: boolean;
  onCreatingChange: (value: boolean) => void;
  /** Seeds the search box (e.g. deep-linked from the Apartments detail panel). */
  initialSearch: string | null;
  /** Reports whether an edit form is open, so the parent header can reflect it. */
  onEditingChange?: (editing: boolean) => void;
}

export function OwnerPage({ isCreating, onCreatingChange, initialSearch, onEditingChange }: OwnerPageProps) {
  const { can } = usePermissions();
  const { showToast } = useToast();
  const requestConfirm = useConfirm();

  const canRead = can("owners", "read");
  const canUpdate = can("owners", "update");
  const canDelete = can("owners", "delete");

  const [search, setSearch] = useState(initialSearch ?? "");
  const [status, setStatus] = useState<OwnerStatusFilter>("active");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading } = useOwners({
    enabled: canRead,
    q: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
    status,
  });
  const owners = data?.items ?? [];
  const createOwner = useCreateOwner();
  const updateOwner = useUpdateOwner();
  const deleteOwner = useDeleteOwner();

  const [manualEditing, setManualEditing] = useState<Owner | null>(null);
  const editing = isCreating ? null : manualEditing;

  useEffect(() => {
    onEditingChange?.(!!editing);
  }, [editing, onEditingChange]);

  if (!canRead) {
    return <p className="text-muted">Você não tem permissão para acessar os proprietários.</p>;
  }

  const closeEditing = () => setManualEditing(null);

  const handleEdit = (owner: Owner) => {
    onCreatingChange(false);
    setManualEditing(owner);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: OwnerStatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  const handleCreate = async (data: OwnerInput) => {
    try {
      await createOwner.mutateAsync(data);
      showToast("Proprietário criado com sucesso", "success");
      onCreatingChange(false);
    } catch {
      showToast("Erro ao criar proprietário", "error");
    }
  };

  const handleUpdate = async (data: OwnerInput) => {
    if (!editing) return;
    try {
      await updateOwner.mutateAsync({ id: editing.id, data });
      showToast("Proprietário atualizado com sucesso", "success");
      closeEditing();
    } catch {
      showToast("Erro ao atualizar proprietário", "error");
    }
  };

  const handleToggleActive = (owner: Owner) => {
    const activating = !owner.active;
    requestConfirm(
      async () => {
        try {
          await updateOwner.mutateAsync({ id: owner.id, data: { active: activating } });
          showToast(activating ? "Proprietário reativado" : "Proprietário desativado", "success");
        } catch {
          showToast("Erro ao atualizar status do proprietário", "error");
        }
      },
      activating
        ? { title: "Reativar proprietário", description: `Marcar ${owner.name} como ativo novamente?`, confirmLabel: "Reativar" }
        : {
            title: "Desativar proprietário",
            description: `${owner.name} deixará de aparecer na listagem ativa, mas o registro é mantido.`,
            confirmLabel: "Desativar",
          },
    );
  };

  const handleDelete = (owner: Owner) => {
    requestConfirm(
      async () => {
        try {
          await deleteOwner.mutateAsync(owner.id);
          showToast("Proprietário excluído", "success");
        } catch (err) {
          const message =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Erro ao excluir proprietário";
          showToast(message, "error");
        }
      },
      {
        title: "Excluir proprietário",
        description: `Remover ${owner.name} definitivamente? Essa ação não pode ser desfeita.`,
        confirmLabel: "Excluir",
      },
    );
  };

  return (
    <div className="page-section">
      {isCreating && (
        <div className={`card ${styles.formCard}`}>
          <OwnerForm onSubmit={handleCreate} onCancel={() => onCreatingChange(false)} submitLabel="Criar" />
        </div>
      )}

      {editing && (
        <div className={`card ${styles.formCard}`}>
          <OwnerForm defaultValues={editing} onSubmit={handleUpdate} onCancel={closeEditing} submitLabel="Salvar" />
        </div>
      )}

      {!isCreating && !editing && (
        <>
          <div className={styles.filters}>
            <SearchInput
              className="search-bar"
              placeholder="Buscar proprietário por nome..."
              value={search}
              onChange={handleSearchChange}
              aria-label="Buscar proprietário"
            />
            <select
              className="input"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as OwnerStatusFilter)}
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
              <OwnerTable
                items={owners}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />
              <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
            </>
          )}
        </>
      )}
    </div>
  );
}
