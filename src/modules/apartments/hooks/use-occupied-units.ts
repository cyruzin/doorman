"use client";

import { useQuery } from "@tanstack/react-query";
import { unitsApi } from "../api";

export const occupiedUnitsQueryKey = ["occupied-units"];

export function useOccupiedUnits() {
  return useQuery({
    queryKey: occupiedUnitsQueryKey,
    queryFn: () => unitsApi.getOccupiedUnits(),
  });
}
