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

// A resident who is also the unit's owner — used to detect that the
// apartment already has its one owner represented as a resident, so the
// "É proprietário" toggle can be hidden for anyone else registering there.
export interface UnitOccupant extends UnitResident {
  isOwner: boolean;
}

export interface UnitOccupancy {
  owner: UnitResident | null;
  residents: UnitOccupant[];
}
