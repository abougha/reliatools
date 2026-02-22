"use client";

import { Download } from "lucide-react";
import type { CsvRow } from "./types";
import { buildCsvContent } from "./utils";

type ExportButtonsProps = {
  rows: CsvRow[];
  disabled?: boolean;
};

export default function ExportButtons({ rows, disabled = false }: ExportButtonsProps) {
  const onDownloadCsv = () => {
    if (rows.length === 0) return;
    const csv = buildCsvContent(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "halt-profile.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onDownloadCsv}
        disabled={disabled || rows.length === 0}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        <Download className="h-4 w-4" />
        Download CSV
      </button>
      <span className="text-xs text-gray-500">Columns: time_min, phase, temp_C, vib_Grms, humidity_RH, voltage_V, powerState</span>
    </div>
  );
}
