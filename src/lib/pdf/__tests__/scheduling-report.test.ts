import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildSchedulingReportPdf, fitToWidth } from "../scheduling-report";

const baseParams = {
  room: "CINEMA" as const,
  statusFilter: { all: true, finished: false, cancelled: false },
  range: {},
  generatedBy: "jonas",
};

describe("buildSchedulingReportPdf", () => {
  it("produces a valid single-page PDF for an empty result set", async () => {
    const bytes = await buildSchedulingReportPdf({ ...baseParams, entries: [] });

    expect(bytes.byteLength).toBeGreaterThan(0);
    expect(Buffer.from(bytes.slice(0, 5)).toString("ascii")).toBe("%PDF-");
  });

  it("produces a valid PDF with rows for finished and cancelled entries", async () => {
    const bytes = await buildSchedulingReportPdf({
      ...baseParams,
      statusFilter: { all: false, finished: true, cancelled: false },
      range: { startDate: new Date("2026-08-01"), endDate: new Date("2026-08-31") },
      entries: [
        {
          eventAt: new Date("2026-08-10T20:00:00.000Z"),
          unit: "101",
          requesterName: "Resident Person",
          finishedAt: new Date("2026-08-10T23:00:00.000Z"),
          finishedByUsername: "jonas",
          cancelledAt: null,
          cancelledByUsername: null,
        },
        {
          eventAt: new Date("2026-08-15T20:00:00.000Z"),
          unit: "202",
          requesterName: "Owner Person",
          finishedAt: null,
          finishedByUsername: null,
          cancelledAt: new Date("2026-08-12T10:00:00.000Z"),
          cancelledByUsername: "lindinaldo",
        },
      ],
    });

    expect(Buffer.from(bytes.slice(0, 5)).toString("ascii")).toBe("%PDF-");
  });

  it("clips an overlong requester name so it cannot overlap the next column", async () => {
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    const name = "ADEILDA FERNANDES DE MELO LIMA DOS SANTOS CONCEICAO";
    const clipped = fitToWidth(name, font, 10, 177);

    expect(clipped).not.toBe(name);
    expect(clipped.endsWith("…")).toBe(true);
    expect(font.widthOfTextAtSize(clipped, 10)).toBeLessThanOrEqual(177);
    expect(fitToWidth("101", font, 10, 177)).toBe("101");
  });

  it("spans multiple pages when there are enough rows", async () => {
    const entries = Array.from({ length: 60 }, (_, i) => ({
      eventAt: new Date(`2026-08-${String((i % 28) + 1).padStart(2, "0")}T20:00:00.000Z`),
      unit: String(100 + i),
      requesterName: `Person ${i}`,
      finishedAt: new Date(),
      finishedByUsername: "jonas",
      cancelledAt: null,
      cancelledByUsername: null,
    }));

    const bytes = await buildSchedulingReportPdf({ ...baseParams, entries });
    const reloaded = await PDFDocument.load(bytes);

    expect(reloaded.getPageCount()).toBeGreaterThan(1);
  });
});
