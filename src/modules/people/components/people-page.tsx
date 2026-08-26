"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePermissions } from "@/modules/permissions/hooks/use-permissions";
import { OwnerPage } from "@/modules/owners/components/owner-page";
import { useOwners } from "@/modules/owners/hooks/use-owners";
import { ResidentPage } from "@/modules/residents/components/resident-page";
import styles from "./people-page.module.css";

type Kind = "resident" | "owner";

export function PeoplePage() {
  const { can } = usePermissions();
  const searchParams = useSearchParams();

  const canSeeResidents = can("residents", "read");
  const canSeeOwners = can("owners", "read");

  const urlKind = searchParams.get("kind");
  const urlEditId = searchParams.get("editId");

  const [kind, setKind] = useState<Kind>(() => {
    if (urlKind === "resident" || urlKind === "owner") return urlKind;
    return canSeeOwners ? "owner" : "resident";
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleKindChange = (next: Kind) => {
    setKind(next);
    setIsCreating(false);
  };

  // Cheap existence check — just enough to know if any owner exists, to gate resident creation.
  const { data: ownerExistence } = useOwners({ pageSize: 1, status: "active" });
  const hasAnyOwner = (ownerExistence?.total ?? 0) > 0;

  if (!canSeeResidents && !canSeeOwners) {
    return (
      <div className="page">
        <p className="text-muted">Você não tem permissão para acessar moradores.</p>
      </div>
    );
  }

  const resource = kind === "resident" ? "residents" : "owners";
  const entityLabel = kind === "resident" ? "Morador" : "Proprietário";
  const canCreate = can(resource, "create");
  const blockResidentCreate = kind === "resident" && !hasAnyOwner;

  return (
    <div className="page">
      <div className={styles.header}>
        <h1 className={styles.title}>Moradores</h1>
        <div className={styles.headerActions}>
          {canSeeResidents && canSeeOwners && (
            <div className="segmented" role="tablist" aria-label="Tipo de morador">
              <button
                type="button"
                role="tab"
                aria-selected={kind === "owner"}
                className={kind === "owner" ? "segmented-option active" : "segmented-option"}
                onClick={() => handleKindChange("owner")}
              >
                Proprietários
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={kind === "resident"}
                className={kind === "resident" ? "segmented-option active" : "segmented-option"}
                onClick={() => handleKindChange("resident")}
              >
                Moradores
              </button>
            </div>
          )}
          {canCreate && !isCreating && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsCreating(true)}
              aria-label={`Novo ${entityLabel.toLowerCase()}`}
              disabled={blockResidentCreate}
            >
              <span className="btn-label-full">Novo {entityLabel.toLowerCase()}</span>
              <span className="btn-label-icon" aria-hidden="true">
                +
              </span>
            </button>
          )}
        </div>
      </div>

      {blockResidentCreate && (
        <span className="badge badge-danger">Cadastre um proprietário antes de cadastrar um morador.</span>
      )}

      {kind === "resident" ? (
        <ResidentPage
          key="resident"
          isCreating={isCreating}
          onCreatingChange={setIsCreating}
          initialEditId={kind === "resident" ? urlEditId : null}
        />
      ) : (
        <OwnerPage
          key="owner"
          isCreating={isCreating}
          onCreatingChange={setIsCreating}
          initialEditId={kind === "owner" ? urlEditId : null}
        />
      )}
    </div>
  );
}
