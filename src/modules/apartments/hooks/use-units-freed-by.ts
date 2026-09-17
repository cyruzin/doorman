"use client";

import { useQuery } from "@tanstack/react-query";
import { unitsApi } from "../api";

// Units left with nobody living in them once these residents go inactive — the live preview
// inside a deactivation/unlink modal, where the selection can change before confirming.
export function useUnitsFreedBy(residentIds: string[]) {
  const ids = [...residentIds].sort();
  return useQuery({
    queryKey: ["units-freed-by", ids],
    queryFn: () => unitsApi.getUnitsFreedBy(ids),
    enabled: ids.length > 0,
  });
}
