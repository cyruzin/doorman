"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePermissions } from "@/modules/permissions/hooks/use-permissions";
import { OwnerPage } from "@/modules/owners/components/owner-page";
import { useOwners } from "@/modules/owners/hooks/use-owners";
import { ResidentPage } from "@/modules/residents/components/resident-page";
import styles from "./people-page.module.css";

type Kind = "resident" | "owner";

export function PeoplePage() {
  const { can } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const canSeeResidents = can("residents", "read");
  const canSeeOwners = can("owners", "read");

  const urlKind = searchParams.get("kind");
  const urlQuery = searchParams.get("q");

  const [kind, setKind] = useState<Kind>(() => {
    if (urlKind === "resident" || urlKind === "owner") return urlKind;
    return canSeeOwners ? "owner" : "resident";
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // `q` is a one-shot seed for the search box (deep-linked from Apartments). Strip it
  // from the URL right after so it can't resurface later — e.g. re-seeding the search
  // box with a stale name after switching tabs and back, even once the user cleared it.
  useEffect(() => {
    if (!urlQuery) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.replace(params.size > 0 ? `${pathname}?${params}` : pathname, { scroll: false });
  }, [urlQuery, searchParams, router, pathname]);

  const handleKindChange = (next: Kind) => {
    setKind(next);
    setIsCreating(false);
    setIsEditing(false);
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
  const title = isCreating ? `Novo ${entityLabel.toLowerCase()}` : isEditing ? `Editando ${entityLabel.toLowerCase()}` : "Moradores";

  return (
    <div className="page">
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
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
          {canCreate && !isCreating && !isEditing && (
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
          onEditingChange={setIsEditing}
          initialSearch={kind === "resident" ? urlQuery : null}
        />
      ) : (
        <OwnerPage
          key="owner"
          isCreating={isCreating}
          onCreatingChange={setIsCreating}
          onEditingChange={setIsEditing}
          initialSearch={kind === "owner" ? urlQuery : null}
        />
      )}
    </div>
  );
}
