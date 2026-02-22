import type { DataPoint, FitMethod, FitResult, Status } from "./weibullMath";

type Delimiter = "," | "\t" | ";";

export type ParsedDelimitedTable = {
  delimiter: Delimiter;
  hasHeader: boolean;
  headers: string[];
  rows: string[][];
};

export type CsvMapping = {
  timeColumn: number;
  statusColumn: number;
};

export type CsvParseResult = {
  data: DataPoint[];
  totalRows: number;
  acceptedRows: number;
  skippedRows: number;
  missingTimeRows: number;
  invalidTimeRows: number;
  unknownStatusRows: number;
};

export type DatasetSummaryRow = {
  name: string;
  method: FitMethod;
  beta: number;
  eta: number;
  b1: number;
  b10: number;
  b50: number;
  mttf: number;
  rMission?: number;
};

type PlotPointExport = {
  dataset: string;
  t: number;
  status: Status;
  F_plot?: number;
  y_plot?: number;
};

function detectDelimiter(raw: string): Delimiter {
  const candidates: Delimiter[] = [",", "\t", ";"];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 6);

  if (lines.length === 0) return ",";

  let best: Delimiter = ",";
  let bestScore = -1;

  for (const delimiter of candidates) {
    let score = 0;
    for (const line of lines) {
      const matches = line.split(delimiter).length - 1;
      score += matches;
    }
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  }

  return best;
}

function splitCsvLine(line: string, delimiter: Delimiter): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function isLikelyHeaderRow(row: string[]): boolean {
  if (row.length === 0) return false;
  const normalized = row.map((cell) => cell.trim().toLowerCase());

  const headerHints = ["time", "t", "hours", "cycles", "status", "state", "result", "censor"];
  const hasHint = normalized.some((cell) => headerHints.some((hint) => cell.includes(hint)));
  if (hasHint) return true;

  const firstNumeric = Number(row[0]);
  return !Number.isFinite(firstNumeric) || firstNumeric <= 0;
}

export function parseDelimitedTable(rawInput: string): ParsedDelimitedTable {
  const raw = rawInput.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(raw);
  const rawLines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rawLines.length === 0) {
    return {
      delimiter,
      hasHeader: false,
      headers: [],
      rows: [],
    };
  }

  const parsedRows = rawLines.map((line) => splitCsvLine(line, delimiter));
  const hasHeader = isLikelyHeaderRow(parsedRows[0]);
  const dataRows = hasHeader ? parsedRows.slice(1) : parsedRows;

  const maxColumns = Math.max(parsedRows[0]?.length ?? 0, ...dataRows.map((row) => row.length));
  const defaultHeaders = Array.from({ length: maxColumns }, (_, index) => `column_${index + 1}`);
  const headers = hasHeader
    ? defaultHeaders.map((fallback, index) => (parsedRows[0][index]?.trim() || fallback))
    : defaultHeaders;

  const normalizedRows = dataRows.map((row) => {
    const padded = [...row];
    while (padded.length < headers.length) padded.push("");
    return padded.map((cell) => cell.trim());
  });

  return {
    delimiter,
    hasHeader,
    headers,
    rows: normalizedRows,
  };
}

function coerceStatus(raw: string): Status | null {
  const normalized = raw.trim().toUpperCase();
  if (["FAIL", "F", "1"].includes(normalized)) return "FAIL";
  if (["SUSP", "C", "0", "CENSORED"].includes(normalized)) return "SUSP";
  return null;
}

export function parseDataPointsFromTable(table: ParsedDelimitedTable, mapping: CsvMapping): CsvParseResult {
  const { rows } = table;
  const data: DataPoint[] = [];

  let missingTimeRows = 0;
  let invalidTimeRows = 0;
  let unknownStatusRows = 0;

  rows.forEach((row, index) => {
    const timeRaw = row[mapping.timeColumn]?.trim() ?? "";
    const statusRaw = row[mapping.statusColumn]?.trim() ?? "";

    if (!timeRaw) {
      missingTimeRows += 1;
      return;
    }

    const time = Number(timeRaw);
    if (!Number.isFinite(time) || time <= 0) {
      invalidTimeRows += 1;
      return;
    }

    const status = coerceStatus(statusRaw);
    if (!status) {
      unknownStatusRows += 1;
      return;
    }

    data.push({
      id: `row-${index + 1}`,
      t: time,
      status,
    });
  });

  const totalRows = rows.length;
  const acceptedRows = data.length;
  const skippedRows = totalRows - acceptedRows;

  return {
    data,
    totalRows,
    acceptedRows,
    skippedRows,
    missingTimeRows,
    invalidTimeRows,
    unknownStatusRows,
  };
}

function csvEscape(value: string | number | undefined): string {
  if (value === undefined) return "";
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export function buildSummaryCsv(rows: DatasetSummaryRow[]): string {
  const header = ["name", "method", "beta", "eta", "b1", "b10", "b50", "mttf", "rMission"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.name),
        csvEscape(row.method),
        csvEscape(row.beta),
        csvEscape(row.eta),
        csvEscape(row.b1),
        csvEscape(row.b10),
        csvEscape(row.b50),
        csvEscape(row.mttf),
        csvEscape(row.rMission),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function buildPlotPointsCsv(rows: PlotPointExport[]): string {
  const header = ["dataset", "time", "status", "plotting_position", "weibull_y"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.dataset),
        csvEscape(row.t),
        csvEscape(row.status),
        csvEscape(row.F_plot),
        csvEscape(row.y_plot),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function buildSummaryRows(
  datasets: Array<{ name: string; fit?: FitResult }>,
): DatasetSummaryRow[] {
  return datasets
    .filter((dataset) => dataset.fit)
    .map((dataset) => ({
      name: dataset.name,
      method: (dataset.fit as FitResult).method,
      beta: (dataset.fit as FitResult).beta,
      eta: (dataset.fit as FitResult).eta,
      b1: (dataset.fit as FitResult).b1,
      b10: (dataset.fit as FitResult).b10,
      b50: (dataset.fit as FitResult).b50,
      mttf: (dataset.fit as FitResult).mttf,
      rMission: (dataset.fit as FitResult).rMission,
    }));
}

export function triggerCsvDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
