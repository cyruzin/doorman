export interface UnitPhone {
  id: string;
  number: string;
  isWhatsapp: boolean;
}

export interface UnitResident {
  id: string;
  name: string;
  phones: UnitPhone[];
}

export interface UnitOccupancy {
  owners: UnitResident[];
  tenants: UnitResident[];
}
