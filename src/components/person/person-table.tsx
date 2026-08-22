"use client";

import type { Person } from "@/lib/person-client";
import styles from "./person-table.module.css";

interface PersonTableProps {
  items: Person[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (person: Person) => void;
  onToggleActive: (person: Person) => void;
  /** "owner" shows who each tenant rents from; "tenants" shows who's renting from each owner. */
  relationColumn?: "owner" | "tenants";
}

export function PersonTable({ items, canUpdate, canDelete, onEdit, onToggleActive, relationColumn }: PersonTableProps) {
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
            <th>Status</th>
            <th>Telefones</th>
            <th>Veículos</th>
            {relationColumn === "owner" && <th>Proprietário (locador)</th>}
            {relationColumn === "tenants" && <th>Inquilino(s) (locatário)</th>}
            {(canUpdate || canDelete) && <th aria-label="Ações" />}
          </tr>
        </thead>
        <tbody>
          {items.map((person) => (
            <tr key={person.id}>
              <td>{person.name}</td>
              <td>{person.unit}</td>
              <td>
                <span className={`badge ${person.active ? "badge-success" : "badge-danger"}`}>
                  {person.active ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td>
                {person.phones.length === 0
                  ? "—"
                  : person.phones.map((phone, index) => (
                      <span key={phone.id} className={styles.phoneItem}>
                        {phone.number}
                        {phone.isWhatsapp && (
                          <span className={`badge badge-success ${styles.whatsappBadge}`}>WhatsApp</span>
                        )}
                        {index < person.phones.length - 1 && ", "}
                      </span>
                    ))}
              </td>
              <td>{person.vehicles.length === 0 ? "—" : person.vehicles.map((v) => v.plate || v.model).join(", ")}</td>
              {relationColumn === "owner" && <td>{person.owner?.name ?? "—"}</td>}
              {relationColumn === "tenants" && (
                <td>{person.tenants && person.tenants.length > 0 ? person.tenants.map((t) => t.name).join(", ") : "—"}</td>
              )}
              {(canUpdate || canDelete) && (
                <td>
                  <div className={styles.actions}>
                    {canUpdate && (
                      <button type="button" className="btn btn-secondary" onClick={() => onEdit(person)}>
                        Editar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className={person.active ? "btn btn-danger" : "btn btn-secondary"}
                        onClick={() => onToggleActive(person)}
                      >
                        {person.active ? "Desativar" : "Reativar"}
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
