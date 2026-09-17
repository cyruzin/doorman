import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-guard";
import { getUnitsFreedBy } from "@/lib/units-status";

// ?residentIds=a,b — the units that stop having any resident once those go inactive.
export async function GET(req: NextRequest) {
  const { error } = await requirePermission("residents", "read");
  if (error) return error;

  const ids = (new URL(req.url).searchParams.get("residentIds") ?? "").split(",").filter(Boolean);
  const units = await getUnitsFreedBy(ids);
  return NextResponse.json({ units });
}
