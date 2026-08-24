import { describe, expect, it } from "vitest";
import { buildReportWhere, parseDateRange, parseStatusFilter } from "../reports";

describe("parseStatusFilter", () => {
  it("defaults every flag to false when no params are given", () => {
    expect(parseStatusFilter(new URLSearchParams())).toEqual({ all: false, finished: false, cancelled: false });
  });

  it("reads each flag independently, including all three at once", () => {
    expect(parseStatusFilter(new URLSearchParams({ all: "true", finished: "true", cancelled: "true" }))).toEqual({
      all: true,
      finished: true,
      cancelled: true,
    });
  });
});

describe("parseDateRange", () => {
  it("returns an empty range when no params are given", () => {
    const result = parseDateRange(new URLSearchParams());
    expect(result).toEqual({ startDate: undefined, endDate: undefined });
  });

  it("parses valid start and end dates", () => {
    const result = parseDateRange(new URLSearchParams({ startDate: "2026-08-01", endDate: "2026-08-10" }));
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.startDate).toEqual(new Date("2026-08-01T00:00:00"));
      expect(result.endDate).toEqual(new Date("2026-08-10T23:59:59.999"));
    }
  });

  it("rejects an invalid start date", () => {
    const result = parseDateRange(new URLSearchParams({ startDate: "not-a-date" }));
    expect(result).toEqual({ error: "Data inicial inválida" });
  });

  it("rejects an invalid end date", () => {
    const result = parseDateRange(new URLSearchParams({ endDate: "not-a-date" }));
    expect(result).toEqual({ error: "Data final inválida" });
  });

  it("accepts a future end date — a scheduled-but-cancelled event can be future-dated", () => {
    const result = parseDateRange(new URLSearchParams({ endDate: "2099-01-01" }));
    expect("error" in result).toBe(false);
  });

  it("rejects a start date after the end date", () => {
    const result = parseDateRange(new URLSearchParams({ startDate: "2026-08-10", endDate: "2026-08-01" }));
    expect(result).toEqual({ error: "A data inicial não pode ser depois da data final" });
  });
});

describe("buildReportWhere", () => {
  const noStatus = { all: false, finished: false, cancelled: false };

  it("filters by finishedAt when only finished is checked", () => {
    const where = buildReportWhere({ room: "CINEMA", statusFilter: { ...noStatus, finished: true }, range: {} });
    expect(where).toMatchObject({ room: "CINEMA", finishedAt: { not: null } });
  });

  it("filters by cancelledAt when only cancelled is checked", () => {
    const where = buildReportWhere({ room: "CINEMA", statusFilter: { ...noStatus, cancelled: true }, range: {} });
    expect(where).toMatchObject({ room: "CINEMA", cancelledAt: { not: null } });
  });

  it("filters by either finishedAt or cancelledAt when all is checked", () => {
    const where = buildReportWhere({ room: "CINEMA", statusFilter: { ...noStatus, all: true }, range: {} });
    expect(where).toMatchObject({
      room: "CINEMA",
      OR: [{ finishedAt: { not: null } }, { cancelledAt: { not: null } }],
    });
  });

  it("filters by either finishedAt or cancelledAt when both individual boxes are checked", () => {
    const where = buildReportWhere({
      room: "CINEMA",
      statusFilter: { all: false, finished: true, cancelled: true },
      range: {},
    });
    expect(where).toMatchObject({
      room: "CINEMA",
      OR: [{ finishedAt: { not: null } }, { cancelledAt: { not: null } }],
    });
  });

  it("matches nothing when no status box is checked", () => {
    const where = buildReportWhere({ room: "CINEMA", statusFilter: noStatus, range: {} });
    expect(where).toMatchObject({ room: "CINEMA", id: "" });
  });

  it("adds an eventAt range when dates are given", () => {
    const startDate = new Date("2026-08-01");
    const endDate = new Date("2026-08-10");
    const where = buildReportWhere({
      room: "PARTY_HALL",
      statusFilter: { ...noStatus, all: true },
      range: { startDate, endDate },
    });
    expect(where).toMatchObject({ eventAt: { gte: startDate, lte: endDate } });
  });

  it("omits eventAt entirely when no dates are given", () => {
    const where = buildReportWhere({ room: "PARTY_HALL", statusFilter: { ...noStatus, all: true }, range: {} });
    expect(where).not.toHaveProperty("eventAt");
  });

  it("adds a unit contains filter when q is given", () => {
    const where = buildReportWhere({
      room: "PARTY_HALL",
      statusFilter: { ...noStatus, all: true },
      range: {},
      q: "10",
    });
    expect(where).toMatchObject({ unit: { contains: "10" } });
  });

  it("omits the unit filter when q is not given", () => {
    const where = buildReportWhere({ room: "PARTY_HALL", statusFilter: { ...noStatus, all: true }, range: {} });
    expect(where).not.toHaveProperty("unit");
  });
});
