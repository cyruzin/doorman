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

// A resident who is also the unit's owner.
export interface UnitOccupant extends UnitResident {
  isOwner: boolean;
}

export interface UnitOccupancy {
  owner: UnitResident | null;
  residents: UnitOccupant[];
}
