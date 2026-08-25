"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { can, type Resource } from "@/lib/permissions";
import { useToast } from "@/components/toast/toast-provider";
import { useConfirm } from "@/components/confirm/confirm-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Pagination } from "@/components/pagination/pagination";
import type { Person, PersonListParams, PersonListResult, PersonStatusFilter, PersonWriteInput } from "@/lib/person-client";
import { PersonForm } from "./person-form";
import { PersonTable } from "./person-table";
import styles from "./person-module-page.module.css";

const PAGE_SIZE = 20;

interface PersonModulePageProps {
  resource: Resource;
  entityLabel: string;
  useItems: (params: PersonListParams) => UseQueryResult<PersonListResult>;
  useCreate: () => UseMutationResult<Person, unknown, PersonWriteInput>;
  useUpdate: () => UseMutationResult<Person, unknown, { id: string; data: Partial<PersonWriteInput> }>;
  useDelete: () => UseMutationResult<void, unknown, string>;
  /** The "novo X" form's open state — owned by the parent so its create button can live next to the tab switcher. */
  isCreating: boolean;
  onCreatingChange: (value: boolean) => void;
  /** Renders the "Proprietário" picker in the form — pass only for the Tenant tab. */
  showOwnerField?: boolean;
  /** Shows the linked owner/tenants column in the table. */
  relationColumn?: "owner" | "tenants";
  /** Opens the edit form for this id on mount (e.g. deep-linked from the Apartments detail panel). */
  initialEditId: string | null;
  useDetail: (id: string | null) => UseQueryResult<Person>;
}

export function PersonModulePage({
  resource,
  entityLabel,
  useItems,
  useCreate,
  useUpdate,
  useDelete,
  isCreating,
  onCreatingChange,
  showOwnerField,
  relationColumn,
  initialEditId,
  useDetail,
}: PersonModulePageProps) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { showToast } = useToast();
  const requestConfirm = useConfirm();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PersonStatusFilter>("active");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading } = useItems({ q: debouncedSearch || undefined, page, pageSize: PAGE_SIZE, status });
  const items = data?.items ?? [];
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const deleteMutation = useDelete();

  // `editing` can come from clicking "Editar" in the table (manualEditing holds
  // the full row already in hand) or from a deep link like /residents?editId=...
  // (fetched on demand via useDetail). Deriving it avoids copying query data
  // into state with an effect — dismissedDeepLink stops it from reopening once closed.
  const [manualEditing, setManualEditing] = useState<Person | null>(null);
  const [dismissedDeepLink, setDismissedDeepLink] = useState(false);
  const detailQuery = useDetail(dismissedDeepLink ? null : initialEditId);
  // The "Novo X" and "Editar" forms are mutually exclusive — while the parent
  // has isCreating on, treat any pending edit as hidden rather than syncing
  // it with an effect (isCreating is the parent's state, not ours to clear).
  const editing = isCreating ? null : (manualEditing ?? (dismissedDeepLink ? null : detailQuery.data ?? null));

  const closeEditing = () => {
    setManualEditing(null);
    setDismissedDeepLink(true);
  };

  const handleEdit = (person: Person) => {
    onCreatingChange(false);
    setManualEditing(person);
  };

  const canUpdate = !!role && can(role, resource, "update");
  const canDelete = !!role && can(role, resource, "delete");

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: PersonStatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  const handleCreate = async (data: PersonWriteInput) => {
    try {
      await createMutation.mutateAsync(data);
      showToast(`${entityLabel} criado com sucesso`, "success");
      onCreatingChange(false);
    } catch {
      showToast(`Erro ao criar ${entityLabel.toLowerCase()}`, "error");
    }
  };

  const handleUpdate = async (data: PersonWriteInput) => {
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({ id: editing.id, data });
      showToast(`${entityLabel} atualizado com sucesso`, "success");
      closeEditing();
    } catch {
      showToast(`Erro ao atualizar ${entityLabel.toLowerCase()}`, "error");
    }
  };

  const handleToggleActive = (person: Person) => {
    const activating = !person.active;
    requestConfirm(
      async () => {
        try {
          await updateMutation.mutateAsync({ id: person.id, data: { active: activating } });
          showToast(activating ? `${entityLabel} reativado` : `${entityLabel} desativado`, "success");
        } catch {
          showToast(`Erro ao atualizar status de ${entityLabel.toLowerCase()}`, "error");
        }
      },
      activating
        ? { title: `Reativar ${entityLabel.toLowerCase()}`, description: `Marcar ${person.name} como ativo novamente?`, confirmLabel: "Reativar" }
        : {
            title: `Desativar ${entityLabel.toLowerCase()}`,
            description: `${person.name} deixará de aparecer na listagem ativa, mas o registro é mantido.`,
            confirmLabel: "Desativar",
          },
    );
  };

  const handleDelete = (person: Person) => {
    requestConfirm(
      async () => {
        try {
          await deleteMutation.mutateAsync(person.id);
          showToast(`${entityLabel} excluído`, "success");
        } catch {
          showToast(`Erro ao excluir ${entityLabel.toLowerCase()}`, "error");
        }
      },
      {
        title: `Excluir ${entityLabel.toLowerCase()}`,
        description: `Remover ${person.name} definitivamente? Essa ação não pode ser desfeita.`,
        confirmLabel: "Excluir",
      },
    );
  };

  return (
    <div className="page-section">
      {isCreating && (
        <div className={`card ${styles.formCard}`}>
          <PersonForm onSubmit={handleCreate} onCancel={() => onCreatingChange(false)} submitLabel="Criar" showOwnerField={showOwnerField} />
        </div>
      )}

      {editing && (
        <div className={`card ${styles.formCard}`}>
          <PersonForm
            defaultValues={editing}
            onSubmit={handleUpdate}
            onCancel={closeEditing}
            submitLabel="Salvar"
            showOwnerField={showOwnerField}
          />
        </div>
      )}

      <div className={styles.filters}>
        <input
          type="search"
          className="input search-bar"
          placeholder={`Buscar ${entityLabel.toLowerCase()} por nome...`}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          aria-label={`Buscar ${entityLabel.toLowerCase()}`}
        />
        <select
          className="input"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as PersonStatusFilter)}
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
          <PersonTable
            items={items}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={handleEdit}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
            relationColumn={relationColumn}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
