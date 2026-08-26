import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-guard";
import { getOccupiedUnits } from "@/lib/units-status";

export async function GET() {
  const { error } = await requirePermission("residents", "read");
  if (error) return error;

  const units = await getOccupiedUnits();
  return NextResponse.json({ units });
}
