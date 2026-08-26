"use client";

import { useState } from "react";
import { usePermissions } from "@/modules/permissions/hooks/use-permissions";
import { PermissionsPanel } from "@/modules/permissions/components/permissions-panel";
import { SearchInput } from "@/components/search-input/search-input";
import { useToast } from "@/components/toast/toast-provider";
import { useConfirm } from "@/components/confirm/confirm-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Pagination } from "@/components/pagination/pagination";
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from "../hooks/use-users";
import type { AppUser, UserFormValues } from "../types";
import { UserForm } from "./user-form";
import { UserTable } from "./user-table";
import styles from "./users-page.module.css";

const PAGE_SIZE = 20;

type Tab = "users" | "permissions";

export function UsersPage() {
  const { can } = usePermissions();
  const { showToast } = useToast();
  const requestConfirm = useConfirm();

  const canRead = can("users", "read");
  const canCreate = can("users", "create");
  const canUpdate = can("users", "update");
  const canDelete = can("users", "delete");

  const [tab, setTab] = useState<Tab>("users");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading } = useUsers({
    enabled: canRead,
    q: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const users = data?.items ?? [];
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [editing, setEditing] = useState<AppUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!canRead) {
    return (
      <div className="page">
        <p className="text-muted">Você não tem permissão para acessar os usuários.</p>
      </div>
    );
  }

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCreate = async (data: UserFormValues) => {
    if (!data.password) {
      showToast("Senha é obrigatória para novos usuários", "error");
      return;
    }
    try {
      await createUser.mutateAsync({ name: data.name, username: data.username, password: data.password, role: data.role });
      showToast("Usuário criado com sucesso", "success");
      setIsCreating(false);
    } catch {
      showToast("Erro ao criar usuário", "error");
    }
  };

  const handleUpdate = async (data: UserFormValues) => {
    if (!editing) return;
    try {
      const payload = data.password
        ? data
        : { name: data.name, username: data.username, role: data.role };
      await updateUser.mutateAsync({ id: editing.id, data: payload });
      showToast("Usuário atualizado com sucesso", "success");
      setEditing(null);
    } catch {
      showToast("Erro ao atualizar usuário", "error");
    }
  };

  const handleDelete = (user: AppUser) => {
    if (user.isSuperAdmin) return;
    requestConfirm(
      async () => {
        try {
          await deleteUser.mutateAsync(user.id);
          showToast("Usuário removido", "success");
        } catch {
          showToast("Erro ao remover usuário", "error");
        }
      },
      {
        title: "Excluir usuário",
        description: `Remover o usuário ${user.name}? Essa ação não pode ser desfeita.`,
      },
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className={styles.title}>Usuários</h1>
        {tab === "users" && canCreate && !isCreating && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreating(true)}
            aria-label="Novo usuário"
          >
            <span className="btn-label-full">Novo usuário</span>
            <span className="btn-label-icon" aria-hidden="true">
              +
            </span>
          </button>
        )}
      </div>

      {canUpdate && (
        <div className={`segmented ${styles.tabs}`} role="tablist" aria-label="Seção de usuários">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "users"}
            className={tab === "users" ? "segmented-option active" : "segmented-option"}
            onClick={() => setTab("users")}
          >
            Usuários
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "permissions"}
            className={tab === "permissions" ? "segmented-option active" : "segmented-option"}
            onClick={() => setTab("permissions")}
          >
            Permissões
          </button>
        </div>
      )}

      {tab === "permissions" ? (
        <PermissionsPanel />
      ) : (
        <>
          {isCreating && (
            <div className={`card ${styles.formCard}`}>
              <UserForm onSubmit={handleCreate} onCancel={() => setIsCreating(false)} submitLabel="Criar" />
            </div>
          )}

          {editing && (
            <div className={`card ${styles.formCard}`}>
              <UserForm defaultValues={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} submitLabel="Salvar" />
            </div>
          )}

          <SearchInput
            className="search-bar"
            placeholder="Buscar usuário..."
            value={search}
            onChange={handleSearchChange}
            aria-label="Buscar usuário"
          />

          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <>
              <UserTable items={users} canUpdate={canUpdate} canDelete={canDelete} onEdit={setEditing} onDelete={handleDelete} />
              <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
            </>
          )}
        </>
      )}
    </div>
  );
}
