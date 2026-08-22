"use client";

import Link from "next/link";
import { useUnitOccupancy } from "../hooks/use-unit-occupancy";
import styles from "./apartment-detail.module.css";

interface ApartmentDetailProps {
  unit: string;
}

export function ApartmentDetail({ unit }: ApartmentDetailProps) {
  const { data, isLoading } = useUnitOccupancy(unit);

  if (isLoading) return <p>Carregando...</p>;

  const owners = data?.owners ?? [];
  const tenants = data?.tenants ?? [];
  const isRented = tenants.length > 0;

  return (
    <div className={`card ${styles.panel}`}>
      <h2 className={styles.title}>Apartamento {unit}</h2>

      {owners.length === 0 ? (
        <p className="text-muted">Nenhum proprietário ativo cadastrado para esse apartamento.</p>
      ) : (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Proprietário(s)</span>
          <ul className={styles.list}>
            {owners.map((owner) => (
              <li key={owner.id}>
                <Link href={`/residents?kind=owner&editId=${owner.id}`} className={styles.personLink}>
                  {owner.name}
                  {!isRented && owner.phones.length > 0 && (
                    <span className={styles.phones}> — {owner.phones.map((p) => p.number).join(", ")}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isRented && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Inquilino(s)</span>
          <ul className={styles.list}>
            {tenants.map((tenant) => (
              <li key={tenant.id}>
                <Link href={`/residents?kind=tenant&editId=${tenant.id}`} className={styles.personLink}>
                  {tenant.name}
                  {tenant.phones.length > 0 && (
                    <span className={styles.phones}> — {tenant.phones.map((p) => p.number).join(", ")}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
