import { PDFDocument, PageSizes, StandardFonts, rgb } from "pdf-lib";
import { REPORT_ROOM_LABELS, type DateRangeFilter, type ReportRoom, type ReportStatusFilter } from "@/lib/reports";

export interface ReportEntryRow {
  eventAt: Date;
  unit: string;
  requesterName: string;
  finishedAt: Date | null;
  finishedByUsername: string | null;
  cancelledAt: Date | null;
  cancelledByUsername: string | null;
}

export interface BuildSchedulingReportPdfParams {
  room: ReportRoom;
  statusFilter: ReportStatusFilter;
  range: DateRangeFilter;
  entries: ReportEntryRow[];
  generatedBy: string;
}

const MARGIN = 40;
const ROW_HEIGHT = 20;
const COLUMNS = [
  { label: "Apartamento", width: 90 },
  { label: "Status", width: 70 },
  { label: "Solicitante", width: 160 },
  { label: "Data do evento", width: 100 },
  { label: "Operador", width: 95 },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

function statusLabel(entry: ReportEntryRow): string {
  return entry.cancelledAt ? "Cancelado" : "Utilizado";
}

function operatorName(entry: ReportEntryRow): string {
  return (entry.cancelledAt ? entry.cancelledByUsername : entry.finishedByUsername) ?? "—";
}

function statusFilterSummary(filter: ReportStatusFilter): string {
  if (filter.all) return "Todos";
  const parts: string[] = [];
  if (filter.finished) parts.push("Utilizado");
  if (filter.cancelled) parts.push("Cancelado");
  return parts.length > 0 ? parts.join(", ") : "Nenhum status selecionado";
}

function buildFilterSummary(statusFilter: ReportStatusFilter, range: DateRangeFilter): string {
  const parts = [`Status: ${statusFilterSummary(statusFilter)}`];
  if (range.startDate) parts.push(`De: ${formatDate(range.startDate)}`);
  if (range.endDate) parts.push(`Até: ${formatDate(range.endDate)}`);
  return parts.join("   ·   ");
}

export async function buildSchedulingReportPdf({
  room,
  statusFilter,
  range,
  entries,
  generatedBy,
}: BuildSchedulingReportPdfParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  let y = height - MARGIN;

  const drawTableHeader = () => {
    let x = MARGIN;
    for (const col of COLUMNS) {
      page.drawText(col.label, { x, y, size: 10, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      x += col.width;
    }
    y -= 16;
    page.drawLine({
      start: { x: MARGIN, y: y + 6 },
      end: { x: width - MARGIN, y: y + 6 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    // Extra breathing room so the divider doesn't run through the first row's text.
    y -= 8;
  };

  const drawPageHeader = () => {
    page.drawText(`Relatório de agendamentos — ${REPORT_ROOM_LABELS[room]}`, {
      x: MARGIN,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 20;
    page.drawText(buildFilterSummary(statusFilter, range), { x: MARGIN, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
    y -= 12;
    const now = new Date();
    page.drawText(`Gerado em ${formatDate(now)} às ${formatTime(now)} por ${generatedBy}`, {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 24;
    drawTableHeader();
  };

  drawPageHeader();

  if (entries.length === 0) {
    page.drawText("Nenhum registro encontrado para os filtros selecionados.", {
      x: MARGIN,
      y,
      size: 11,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  for (const entry of entries) {
    if (y < MARGIN + ROW_HEIGHT) {
      page = pdfDoc.addPage(PageSizes.A4);
      y = height - MARGIN;
      drawPageHeader();
    }

    let x = MARGIN;
    const row = [entry.unit, statusLabel(entry), entry.requesterName, formatDateTime(entry.eventAt), operatorName(entry)];
    row.forEach((value, i) => {
      page.drawText(value, { x, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
      x += COLUMNS[i].width;
    });
    y -= ROW_HEIGHT;
  }

  return pdfDoc.save();
}
