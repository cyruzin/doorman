import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    schedulingEntry: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

const buildSchedulingReportPdf = vi.fn();
vi.mock("@/lib/pdf/scheduling-report", () => ({
  buildSchedulingReportPdf: (...args: unknown[]) => buildSchedulingReportPdf(...args),
}));

import { GET } from "../route";

describe("GET /api/reports/pdf", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findMany.mockReset();
    buildSchedulingReportPdf.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await GET(new NextRequest("http://localhost/api/reports/pdf?room=CINEMA"));
    expect(res.status).toBe(401);
  });

  it("rejects a missing or invalid room", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await GET(new NextRequest("http://localhost/api/reports/pdf?room=GRILL"));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid date range", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await GET(
      new NextRequest("http://localhost/api/reports/pdf?room=CINEMA&startDate=2026-08-10&endDate=2026-08-01"),
    );
    expect(res.status).toBe(400);
  });

  it("requires both a start and end date", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await GET(new NextRequest("http://localhost/api/reports/pdf?room=CINEMA"));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/data inicial e a data final/i);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("requires an end date even when a start date is given", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await GET(new NextRequest("http://localhost/api/reports/pdf?room=CINEMA&startDate=2026-08-01"));
    expect(res.status).toBe(400);
  });

  it("streams back a PDF with the expected headers", async () => {
    requirePermission.mockResolvedValue({ session: { user: { name: "jonas" } }, error: null });
    findMany.mockResolvedValue([{ id: "e1" }]);
    buildSchedulingReportPdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));

    const res = await GET(
      new NextRequest("http://localhost/api/reports/pdf?room=CINEMA&startDate=2026-08-01&endDate=2026-08-10"),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toMatch(/attachment; filename="relatorio-cinema-.*\.pdf"/);
    expect(buildSchedulingReportPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        room: "CINEMA",
        statusFilter: { all: false, finished: false, cancelled: false },
        entries: [{ id: "e1" }],
        generatedBy: "jonas",
      }),
    );
  });

  it("fetches every matching row with no pagination cap", async () => {
    requirePermission.mockResolvedValue({ session: { user: { name: "jonas" } }, error: null });
    findMany.mockResolvedValue([]);
    buildSchedulingReportPdf.mockResolvedValue(new Uint8Array());

    await GET(new NextRequest("http://localhost/api/reports/pdf?room=PARTY_HALL&startDate=2026-08-01&endDate=2026-08-10"));

    const callArg = findMany.mock.calls[0][0];
    expect(callArg).not.toHaveProperty("skip");
    expect(callArg).not.toHaveProperty("take");
  });
});
