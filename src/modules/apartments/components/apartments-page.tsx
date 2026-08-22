"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { can } from "@/lib/permissions";
import { ApartmentGrid } from "./apartment-grid";
import { ApartmentDetail } from "./apartment-detail";
import styles from "./apartments-page.module.css";

export function ApartmentsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const canView = !!role && (can(role, "tenants", "read") || can(role, "owners", "read"));

  if (!canView) {
    return (
      <div className="page">
        <p className="text-muted">Você não tem permissão para acessar os apartamentos.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className={styles.title}>Apartamentos</h1>
      <ApartmentGrid selectedUnit={selectedUnit} onSelect={setSelectedUnit} />
      {selectedUnit && <ApartmentDetail unit={selectedUnit} />}
    </div>
  );
}
