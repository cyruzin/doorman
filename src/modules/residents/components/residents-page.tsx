"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { can } from "@/lib/permissions";
import { PersonModulePage } from "@/components/person/person-module-page";
import {
  useCreateTenant,
  useDeleteTenant,
  useTenantDetail,
  useTenants,
  useUpdateTenant,
} from "@/modules/tenants/hooks/use-tenants";
import {
  useCreateOwner,
  useDeleteOwner,
  useOwnerDetail,
  useOwners,
  useUpdateOwner,
} from "@/modules/owners/hooks/use-owners";
import styles from "./residents-page.module.css";

type Kind = "tenant" | "owner";

export function ResidentsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const searchParams = useSearchParams();

  const canSeeTenants = !!role && can(role, "tenants", "read");
  const canSeeOwners = !!role && can(role, "owners", "read");

  const urlKind = searchParams.get("kind");
  const urlEditId = searchParams.get("editId");

  const [kind, setKind] = useState<Kind>(() => {
    if (urlKind === "tenant" || urlKind === "owner") return urlKind;
    return canSeeTenants ? "tenant" : "owner";
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleKindChange = (next: Kind) => {
    setKind(next);
    setIsCreating(false);
  };

  // A cheap existence check (not a full list) — the tenant form's own owner
  // picker handles the actual search-by-name lookup.
  const { data: ownerExistence } = useOwners({ pageSize: 1, status: "active" });
  const hasAnyOwner = (ownerExistence?.total ?? 0) > 0;

  if (!canSeeTenants && !canSeeOwners) {
    return (
      <div className="page">
        <p className="text-muted">Você não tem permissão para acessar moradores.</p>
      </div>
    );
  }

  const resource = kind === "tenant" ? "tenants" : "owners";
  const entityLabel = kind === "tenant" ? "Inquilino" : "Proprietário";
  const canCreate = !!role && can(role, resource, "create");
  // A tenant always rents from an owner — there's nobody to hold responsible
  // for the unit otherwise, so block tenant creation until one exists.
  const blockTenantCreate = kind === "tenant" && !hasAnyOwner;

  return (
    <div className="page">
      <div className={styles.header}>
        <h1 className={styles.title}>Moradores</h1>
        <div className={styles.headerActions}>
          {canSeeTenants && canSeeOwners && (
            <div className="segmented" role="tablist" aria-label="Tipo de morador">
              <button
                type="button"
                role="tab"
                aria-selected={kind === "tenant"}
                className={kind === "tenant" ? "segmented-option active" : "segmented-option"}
                onClick={() => handleKindChange("tenant")}
              >
                Inquilinos
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={kind === "owner"}
                className={kind === "owner" ? "segmented-option active" : "segmented-option"}
                onClick={() => handleKindChange("owner")}
              >
                Proprietários
              </button>
            </div>
          )}
          {canCreate && !isCreating && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsCreating(true)}
              aria-label={`Novo ${entityLabel.toLowerCase()}`}
              disabled={blockTenantCreate}
            >
              <span className="btn-label-full">Novo {entityLabel.toLowerCase()}</span>
              <span className="btn-label-icon" aria-hidden="true">
                +
              </span>
            </button>
          )}
        </div>
      </div>

      {blockTenantCreate && (
        <span className="badge badge-danger">
          Cadastre um proprietário antes de cadastrar um inquilino.
        </span>
      )}

      {kind === "tenant" ? (
        <PersonModulePage
          key="tenant"
          resource="tenants"
          entityLabel="Inquilino"
          useItems={useTenants}
          useCreate={useCreateTenant}
          useUpdate={useUpdateTenant}
          useDelete={useDeleteTenant}
          isCreating={isCreating}
          onCreatingChange={setIsCreating}
          showOwnerField
          relationColumn="owner"
          initialEditId={kind === "tenant" ? urlEditId : null}
          useDetail={useTenantDetail}
        />
      ) : (
        <PersonModulePage
          key="owner"
          resource="owners"
          entityLabel="Proprietário"
          useItems={useOwners}
          useCreate={useCreateOwner}
          useUpdate={useUpdateOwner}
          useDelete={useDeleteOwner}
          isCreating={isCreating}
          onCreatingChange={setIsCreating}
          relationColumn="tenants"
          initialEditId={kind === "owner" ? urlEditId : null}
          useDetail={useOwnerDetail}
        />
      )}
    </div>
  );
}
