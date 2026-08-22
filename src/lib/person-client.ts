import { api } from "@/lib/axios";
import type { PersonInput } from "@/lib/validations/person";

export interface RelationSummary {
  id: string;
  name: string;
  unit: string;
}

export interface PersonPhone {
  id: string;
  number: string;
  isWhatsapp: boolean;
}

export interface PersonVehicle {
  id: string;
  plate: string | null;
  model: string | null;
}

// Tenant and Owner are near-identical shapes on the client too — this factory
// backs both modules' api.ts files instead of duplicating the axios calls.
// `owner`/`tenants` are only ever populated for Tenant/Owner respectively.
export interface Person {
  id: string;
  name: string;
  cpf: string | null;
  email: string | null;
  unit: string;
  active: boolean;
  phones: PersonPhone[];
  vehicles: PersonVehicle[];
  createdAt: string;
  updatedAt: string;
  owner?: RelationSummary | null;
  tenants?: RelationSummary[];
}

export type PersonWriteInput = PersonInput & { ownerId?: string };

export type PersonStatusFilter = "active" | "inactive" | "all";

export interface PersonListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  status?: PersonStatusFilter;
}

export interface PersonListResult {
  items: Person[];
  total: number;
  page: number;
  pageSize: number;
}

export function createPersonApi(basePath: "tenants" | "owners") {
  return {
    list: async (params: PersonListParams = {}): Promise<PersonListResult> =>
      (await api.get(`/${basePath}`, { params })).data,
    get: async (id: string): Promise<Person> => (await api.get(`/${basePath}/${id}`)).data,
    create: async (data: PersonWriteInput): Promise<Person> => (await api.post(`/${basePath}`, data)).data,
    update: async (id: string, data: Partial<PersonWriteInput>): Promise<Person> =>
      (await api.patch(`/${basePath}/${id}`, data)).data,
    remove: async (id: string): Promise<void> => {
      await api.delete(`/${basePath}/${id}`);
    },
  };
}
