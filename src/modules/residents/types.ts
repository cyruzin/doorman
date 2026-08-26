export interface ResidentPhone {
  id: string;
  number: string;
  isWhatsapp: boolean;
}

export interface ResidentVehicle {
  id: string;
  plate: string | null;
  model: string | null;
}

export interface Resident {
  id: string;
  name: string;
  cpf: string | null;
  email: string | null;
  unit: string;
  active: boolean;
  isOwner: boolean;
  ownerId: string | null;
  owner: { id: string; name: string } | null;
  phones: ResidentPhone[];
  vehicles: ResidentVehicle[];
  createdAt: string;
  updatedAt: string;
}

export interface ResidentWriteInput {
  name: string;
  cpf?: string;
  email?: string;
  unit: string;
  active: boolean;
  isOwner: boolean;
  ownerId?: string;
  phones: { number: string; isWhatsapp: boolean }[];
  vehicles: { plate?: string; model?: string }[];
}

export type ResidentStatusFilter = "active" | "inactive" | "all";

export interface ResidentListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  status?: ResidentStatusFilter;
}

export interface ResidentListResult {
  items: Resident[];
  total: number;
  page: number;
  pageSize: number;
}
