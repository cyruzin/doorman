"use client";

import { useState } from "react";
import { useToast } from "@/components/toast/toast-provider";
import { ACTIONS, RESOURCES, type Action, type PermissionsMatrix, type Resource } from "@/lib/permissions";
import { usePermissionsMatrix, useUpdatePermissionsMatrix } from "../hooks/use-permissions";
import styles from "./permissions-panel.module.css";

const RESOURCE_LABELS: Record<Resource, string> = {
  residents: "Moradores",
  owners: "Proprietários",
  users: "Usuários",
  backups: "Backups",
  mezanino: "Mezanino",
  scheduling: "Agendamentos",
  reports: "Relatórios",
  notices: "Recados",
};

const ACTION_LABELS: Record<Action, string> = {
  create: "Criar",
  read: "Ver",
  update: "Editar",
  delete: "Excluir",
};

const ROLES = ["ADMIN", "DOORMAN"] as const;
const ROLE_LABELS: Record<(typeof ROLES)[number], string> = { ADMIN: "Administrador", DOORMAN: "Porteiro" };

function toggle(
  matrix: PermissionsMatrix,
  role: (typeof ROLES)[number],
  resource: Resource,
  action: Action,
): PermissionsMatrix {
  const current = matrix[role]?.[resource] ?? [];
  const next = current.includes(action) ? current.filter((a) => a !== action) : [...current, action];
  return { ...matrix, [role]: { ...matrix[role], [resource]: next } };
}

export function PermissionsPanel() {
  const { data, isLoading, isError } = usePermissionsMatrix();
  const updateMatrix = useUpdatePermissionsMatrix();
  const { showToast } = useToast();
  // Initialized from `data` too: when the matrix is already cached (e.g. the
  // nav bar fetched it first), this mounts with `data` present on the very
  // first render, so the sync effect below never fires — without this,
  // `draft` would stay null and the panel would be stuck on "Carregando...".
  const [draft, setDraft] = useState<PermissionsMatrix | null>(data ?? null);
  // Sync local edits from the fetched matrix once it (re)loads — done during
  // render (React's recommended pattern for this) rather than in an effect,
  // so it doesn't cost an extra commit.
  const [syncedFrom, setSyncedFrom] = useState(data);
  if (data && data !== syncedFrom) {
    setSyncedFrom(data);
    setDraft(data);
  }

  if (isError) return <p className="text-muted">Erro ao carregar permissões.</p>;
  if (isLoading || !draft) return <p>Carregando...</p>;

  const handleSave = async () => {
    try {
      await updateMatrix.mutateAsync(draft);
      showToast("Permissões atualizadas com sucesso", "success");
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Erro ao atualizar permissões";
      showToast(message, "error");
    }
  };

  return (
    <div className={styles.panel}>
      {ROLES.map((role) => (
        <div key={role} className="table-wrapper card">
          <h2 className={styles.roleTitle}>{ROLE_LABELS[role]}</h2>
          <table>
            <thead>
              <tr>
                <th>Recurso</th>
                {ACTIONS.map((action) => (
                  <th key={action}>{ACTION_LABELS[action]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((resource) => (
                <tr key={resource}>
                  <td>{RESOURCE_LABELS[resource]}</td>
                  {ACTIONS.map((action) => (
                    <td key={action}>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          className={styles.toggleInput}
                          checked={draft[role]?.[resource]?.includes(action) ?? false}
                          onChange={() => setDraft((prev) => (prev ? toggle(prev, role, resource, action) : prev))}
                          aria-label={`${ROLE_LABELS[role]} - ${RESOURCE_LABELS[resource]} - ${ACTION_LABELS[action]}`}
                        />
                        <span className={styles.toggleTrack}>
                          <span className={styles.toggleThumb} />
                        </span>
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={updateMatrix.isPending}>
          {updateMatrix.isPending ? "Salvando..." : "Salvar permissões"}
        </button>
      </div>
    </div>
  );
}
