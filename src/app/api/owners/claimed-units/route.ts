import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-guard";
import { getAllClaimedUnits } from "@/lib/owner-units";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("owners", "read");
  if (error) return error;

  const excludeOwnerId = new URL(req.url).searchParams.get("excludeOwnerId") ?? undefined;
  const claims = await getAllClaimedUnits(excludeOwnerId);
  return NextResponse.json({ claims });
}
