"use client";

import { useQuery } from "@tanstack/react-query";
import { unitsApi } from "../api";

export const unitOccupancyQueryKey = ["unit-occupancy"];

export function useUnitOccupancy(unit: string | null) {
  return useQuery({
    queryKey: [...unitOccupancyQueryKey, unit],
    queryFn: () => unitsApi.getOccupancy(unit as string),
    enabled: !!unit,
  });
}
