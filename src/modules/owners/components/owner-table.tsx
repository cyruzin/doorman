"use client";

import type { Owner } from "../types";
import { maskCpf, maskPhone } from "@/lib/helpers/masks";
import styles from "./owner-table.module.css";

interface OwnerTableProps {
  items: Owner[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (owner: Owner) => void;
  onToggleActive: (owner: Owner) => void;
  onDelete: (owner: Owner) => void;
}

export function OwnerTable({ items, canUpdate, canDelete, onEdit, onToggleActive, onDelete }: OwnerTableProps) {
  if (items.length === 0) {
    return <p className="text-muted">Nenhum registro encontrado.</p>;
  }

  return (
    <div className="table-wrapper card">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Apartamento(s)</th>
            <th>CPF</th>
            <th>Status</th>
            <th>Telefone</th>
            <th>Veículo</th>
            {(canUpdate || canDelete) && <th aria-label="Ações" />}
          </tr>
        </thead>
        <tbody>
          {items.map((owner) => (
            <tr key={owner.id}>
              <td>{owner.name}</td>
              <td>{owner.units.join(", ")}</td>
              <td>{owner.cpf ? maskCpf(owner.cpf) : "—"}</td>
              <td>
                <span className={`badge ${owner.active ? "badge-success" : "badge-danger"}`}>
                  {owner.active ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td>
                {owner.phones.length === 0 ? (
                  "—"
                ) : (
                  <span className={styles.phoneItem}>
                    {maskPhone(owner.phones[0].number)}
                    {owner.phones[0].isWhatsapp && (
                      <span className={`badge badge-success ${styles.whatsappBadge}`}>WhatsApp</span>
                    )}
                  </span>
                )}
              </td>
              <td>
                {owner.vehicles.length === 0
                  ? "—"
                  : [owner.vehicles[0].model, owner.vehicles[0].plate].filter(Boolean).join(" — ")}
              </td>
              {(canUpdate || canDelete) && (
                <td>
                  <div className={styles.actions}>
                    {canUpdate && (
                      <button type="button" className="btn btn-secondary" onClick={() => onEdit(owner)}>
                        Editar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className={owner.active ? "btn btn-danger" : "btn btn-secondary"}
                        onClick={() => onToggleActive(owner)}
                      >
                        {owner.active ? "Desativar" : "Reativar"}
                      </button>
                    )}
                    {/* Hard delete only makes sense once the record is already inactive — an active
                        owner must be deactivated first, same rule as the users screen's super admin guard. */}
                    {canDelete && !owner.active && (
                      <button type="button" className="btn btn-danger" onClick={() => onDelete(owner)}>
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
