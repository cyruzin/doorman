import type { OwnerInput } from "@/lib/validations/owner";

export type { OwnerInput };

export interface OwnerPhone {
  id: string;
  number: string;
  isWhatsapp: boolean;
}

export interface OwnerVehicle {
  id: string;
  plate: string | null;
  model: string | null;
}

export interface OwnerResidentSummary {
  id: string;
  name: string;
  unit: string;
  active: boolean;
}

export interface Owner {
  id: string;
  name: string;
  cpf: string | null;
  email: string | null;
  active: boolean;
  /** Name of the user who deactivated the record — the "Operador" column. */
  deactivatedBy: string | null;
  units: string[];
  residents: OwnerResidentSummary[];
  phones: OwnerPhone[];
  vehicles: OwnerVehicle[];
  createdAt: string;
  updatedAt: string;
}

/** Deactivating asks for the logged-in user's password as a re-authentication. */
export type OwnerUpdateInput = Partial<OwnerInput> & { password?: string };

export interface UnlinkUnitsInput {
  units: string[];
  password: string;
}

export type OwnerStatusFilter = "active" | "inactive" | "all";

export interface OwnerListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  status?: OwnerStatusFilter;
}

export interface OwnerListResult {
  items: Owner[];
  total: number;
  page: number;
  pageSize: number;
}
