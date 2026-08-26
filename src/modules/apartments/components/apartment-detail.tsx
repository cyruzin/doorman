"use client";

import Link from "next/link";
import { useUnitOccupancy } from "../hooks/use-unit-occupancy";
import { maskPhone } from "@/lib/helpers/masks";
import styles from "./apartment-detail.module.css";

interface ApartmentDetailProps {
  unit: string;
}

export function ApartmentDetail({ unit }: ApartmentDetailProps) {
  const { data, isLoading } = useUnitOccupancy(unit);

  if (isLoading) return <p>Carregando...</p>;

  const owner = data?.owner ?? null;
  const residents = data?.residents ?? [];

  return (
    <div className={`card ${styles.panel}`}>
      <h2 className={styles.title}>Apartamento {unit}</h2>

      {!owner ? (
        <p className="text-muted">Nenhum proprietário ativo cadastrado para esse apartamento.</p>
      ) : (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Proprietário</span>
          <div className="table-wrapper">
            <table className={styles.detailTable}>
              <thead>
                <tr>
                  <th>Proprietário</th>
                  <th>Contato</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Link href={`/residents?kind=owner&editId=${owner.id}`} className={styles.personLink}>
                      {owner.name}
                    </Link>
                  </td>
                  <td>{owner.phones.length > 0 ? maskPhone(owner.phones[0].number) : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {residents.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Morador(es)</span>
          <div className="table-wrapper">
            <table className={styles.detailTable}>
              <thead>
                <tr>
                  <th>Morador</th>
                  <th>Contato</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((resident) => (
                  <tr key={resident.id}>
                    <td>
                      <Link href={`/residents?kind=resident&editId=${resident.id}`} className={styles.personLink}>
                        {resident.name}
                      </Link>
                    </td>
                    <td>{resident.phones.length > 0 ? maskPhone(resident.phones[0].number) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
