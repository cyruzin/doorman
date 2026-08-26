"use client";

import type { Resident } from "../types";
import { maskCpf, maskPhone } from "@/lib/helpers/masks";
import styles from "./resident-table.module.css";

interface ResidentTableProps {
  items: Resident[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (resident: Resident) => void;
  onToggleActive: (resident: Resident) => void;
  onDelete: (resident: Resident) => void;
}

export function ResidentTable({ items, canUpdate, canDelete, onEdit, onToggleActive, onDelete }: ResidentTableProps) {
  if (items.length === 0) {
    return <p className="text-muted">Nenhum registro encontrado.</p>;
  }

  return (
    <div className="table-wrapper card">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Apartamento</th>
            <th>CPF</th>
            <th>Status</th>
            <th>Telefone</th>
            <th>Veículo</th>
            {(canUpdate || canDelete) && <th aria-label="Ações" />}
          </tr>
        </thead>
        <tbody>
          {items.map((resident) => (
            <tr key={resident.id}>
              <td>
                {resident.name}
                {resident.isOwner && <span className={`badge badge-info ${styles.ownerBadge}`}>Proprietário</span>}
              </td>
              <td>{resident.unit}</td>
              <td>{resident.cpf ? maskCpf(resident.cpf) : "—"}</td>
              <td>
                <span className={`badge ${resident.active ? "badge-success" : "badge-danger"}`}>
                  {resident.active ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td>
                {resident.phones.length === 0 ? (
                  "—"
                ) : (
                  <span className={styles.phoneItem}>
                    {maskPhone(resident.phones[0].number)}
                    {resident.phones[0].isWhatsapp && (
                      <span className={`badge badge-success ${styles.whatsappBadge}`}>WhatsApp</span>
                    )}
                  </span>
                )}
              </td>
              <td>
                {resident.vehicles.length === 0
                  ? "—"
                  : [resident.vehicles[0].model, resident.vehicles[0].plate].filter(Boolean).join(" — ")}
              </td>
              {(canUpdate || canDelete) && (
                <td>
                  <div className={styles.actions}>
                    {canUpdate && (
                      <button type="button" className="btn btn-secondary" onClick={() => onEdit(resident)}>
                        Editar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className={resident.active ? "btn btn-danger" : "btn btn-secondary"}
                        onClick={() => onToggleActive(resident)}
                      >
                        {resident.active ? "Desativar" : "Reativar"}
                      </button>
                    )}
                    {/* Hard delete only makes sense once the record is already inactive — an active
                        resident must be deactivated first, same rule as the users screen's super admin guard. */}
                    {canDelete && !resident.active && (
                      <button type="button" className="btn btn-danger" onClick={() => onDelete(resident)}>
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
