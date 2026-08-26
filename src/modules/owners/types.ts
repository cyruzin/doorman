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
}

export interface Owner {
  id: string;
  name: string;
  cpf: string | null;
  email: string | null;
  active: boolean;
  units: string[];
  residents: OwnerResidentSummary[];
  phones: OwnerPhone[];
  vehicles: OwnerVehicle[];
  createdAt: string;
  updatedAt: string;
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
