"use client";

import type { AppUser } from "../types";
import styles from "./user-table.module.css";

interface UserTableProps {
  items: AppUser[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
}

export function UserTable({ items, canUpdate, canDelete, onEdit, onDelete }: UserTableProps) {
  if (items.length === 0) {
    return <p className="text-muted">Nenhum usuário cadastrado.</p>;
  }

  return (
    <div className="table-wrapper card">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Usuário</th>
            <th>Perfil</th>
            {(canUpdate || canDelete) && <th aria-label="Ações" />}
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.username}</td>
              <td>
                <span className="badge badge-info">{user.role === "ADMIN" ? "Administrador" : "Porteiro"}</span>
                {user.isSuperAdmin && <span className={`badge badge-success ${styles.superAdminBadge}`}>Super admin</span>}
              </td>
              {(canUpdate || canDelete) && (
                <td>
                  <div className={styles.actions}>
                    {canUpdate && (
                      <button type="button" className="btn btn-secondary" onClick={() => onEdit(user)}>
                        Editar
                      </button>
                    )}
                    {canDelete && !user.isSuperAdmin && (
                      <button type="button" className="btn btn-danger" onClick={() => onDelete(user)}>
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
