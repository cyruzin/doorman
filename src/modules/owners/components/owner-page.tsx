"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/modules/permissions/hooks/use-permissions";
import { SearchInput } from "@/components/search-input/search-input";
import { extractApiErrorMessage } from "@/lib/api-error";
import { useToast } from "@/components/toast/toast-provider";
import { useConfirm } from "@/components/confirm/confirm-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Pagination } from "@/components/pagination/pagination";
import { ownerDeactivationWarning } from "../deactivation-warning";
import { useCreateOwner, useDeleteOwner, useOwners, useUnlinkOwnerUnits, useUpdateOwner } from "../hooks/use-owners";
import type { Owner, OwnerInput, OwnerStatusFilter } from "../types";
import { OwnerForm } from "./owner-form";
import { OwnerTable } from "./owner-table";
import { UnlinkUnitsModal } from "./unlink-units-modal";
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
  const unlinkUnits = useUnlinkOwnerUnits();
  const [unlinking, setUnlinking] = useState<Owner | null>(null);

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
    } catch (err) {
      showToast(extractApiErrorMessage(err, "Erro ao criar proprietário"), "error");
    }
  };

  const handleUpdate = async (data: OwnerInput) => {
    if (!editing) return;
    try {
      await updateOwner.mutateAsync({ id: editing.id, data });
      showToast("Proprietário atualizado com sucesso", "success");
      closeEditing();
    } catch (err) {
      showToast(extractApiErrorMessage(err, "Erro ao atualizar proprietário"), "error");
    }
  };

  const handleToggleActive = async (owner: Owner) => {
    const activating = !owner.active;
    const warning = activating ? undefined : await ownerDeactivationWarning(owner);
    requestConfirm(
      async (password) => {
        try {
          await updateOwner.mutateAsync({ id: owner.id, data: { active: activating, password } });
          showToast(activating ? "Proprietário reativado" : "Proprietário desativado", "success");
        } catch (err) {
          showToast(extractApiErrorMessage(err, "Erro ao atualizar status do proprietário"), "error");
        }
      },
      activating
        ? { title: "Reativar proprietário", description: `Marcar ${owner.name} como ativo novamente?`, confirmLabel: "Reativar" }
        : {
            requirePassword: true,
            title: "Desativar proprietário",
            description: `${owner.name} deixará de aparecer nos apartamentos, no mezanino e nos agendamentos. O registro é mantido e continua visível na busca por inativos.`,
            warning,
            confirmLabel: "Desativar",
          },
    );
  };

  const handleUnlink = async (units: string[], password: string) => {
    if (!unlinking) return;
    try {
      const { deactivated } = await unlinkUnits.mutateAsync({ id: unlinking.id, data: { units, password } });
      showToast(
        deactivated ? "Proprietário desvinculado e desativado" : `Apartamento(s) desvinculado(s): ${units.join(", ")}`,
        "success",
      );
      setUnlinking(null);
    } catch (err) {
      // Rethrown so the modal keeps the selection and shows why it failed (wrong password, etc.).
      throw new Error(extractApiErrorMessage(err, "Erro ao desvincular apartamento(s)"));
    }
  };

  const handleDelete = (owner: Owner) => {
    requestConfirm(
      async () => {
        try {
          await deleteOwner.mutateAsync(owner.id);
          showToast("Proprietário excluído", "success");
        } catch (err) {
          showToast(extractApiErrorMessage(err, "Erro ao excluir proprietário"), "error");
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
                onUnlink={setUnlinking}
                onDelete={handleDelete}
              />
              <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
            </>
          )}
        </>
      )}

      {unlinking && (
        <UnlinkUnitsModal owner={unlinking} onClose={() => setUnlinking(null)} onConfirm={handleUnlink} />
      )}
    </div>
  );
}
