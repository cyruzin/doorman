"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { can } from "@/lib/permissions";
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

export function UsersPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { showToast } = useToast();
  const requestConfirm = useConfirm();

  const canRead = !!role && can(role, "users", "read");
  const canCreate = !!role && can(role, "users", "create");
  const canUpdate = !!role && can(role, "users", "update");
  const canDelete = !!role && can(role, "users", "delete");

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
      await createUser.mutateAsync({ username: data.username, password: data.password, role: data.role });
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
        : { username: data.username, role: data.role };
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
        description: `Remover o usuário ${user.username}? Essa ação não pode ser desfeita.`,
      },
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className={styles.title}>Usuários</h1>
        {canCreate && !isCreating && (
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

      <input
        type="search"
        className="input search-bar"
        placeholder="Buscar usuário..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
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
    </div>
  );
}
