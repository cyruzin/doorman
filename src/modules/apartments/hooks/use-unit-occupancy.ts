"use client";

import { useQuery } from "@tanstack/react-query";
import { unitsApi } from "../api";

export function useUnitOccupancy(unit: string | null) {
  return useQuery({
    queryKey: ["unit-occupancy", unit],
    queryFn: () => unitsApi.getOccupancy(unit as string),
    enabled: !!unit,
  });
}
