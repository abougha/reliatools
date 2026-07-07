"use client";

import { useEffect, useMemo, useState } from "react";
import { parseDataPointsFromTable, parseDelimitedTable } from "../_lib/csv";
import type { DataPoint } from "../_lib/weibullMath";
import DataPointsTable, { createEmptyRows, editableRowsToDataPoints, type EditableRow } from "./DataPointsTable";

type DatasetUploaderProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddDataset: (dataset: { name: string; data: DataPoint[] }) => void;
};

type Mode = "MANUAL" | "CSV";

function guessColumnIndex(headers: string[], patterns: string[], fallback: number): number {
  const index = headers.findIndex((header) => {
    const normalized = header.toLowerCase();
    return patterns.some((pattern) => normalized.includes(pattern));
  });
  return index >= 0 ? index : fallback;
}

export default function DatasetUploader({ isOpen, onClose, onAddDataset }: DatasetUploaderProps) {
  const [mode, setMode] = useState<Mode>("MANUAL");
  const [datasetName, setDatasetName] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [timeColumn, setTimeColumn] = useState(0);
  const [statusColumn, setStatusColumn] = useState(1);
  const [manualRows, setManualRows] = useState<EditableRow[]>(() => createEmptyRows(5));
  const [errorMessage, setErrorMessage] = useState("");

  const parsed = useMemo(() => parseDelimitedTable(rawInput), [rawInput]);
  const parseResult = useMemo(
    () =>
      parsed.headers.length > 0
        ? parseDataPointsFromTable(parsed, {
            timeColumn,
            statusColumn,
          })
        : null,
    [parsed, timeColumn, statusColumn],
  );
  const manualParsed = useMemo(() => editableRowsToDataPoints(manualRows), [manualRows]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
  }, [isOpen]);

  useEffect(() => {
    if (parsed.headers.length === 0) return;
    const guessedTime = guessColumnIndex(parsed.headers, ["time", "hour", "cycle", "t"], 0);
    const guessedStatus = guessColumnIndex(parsed.headers, ["status", "result", "state", "censor"], Math.min(1, parsed.headers.length - 1));
    setTimeColumn(guessedTime);
    setStatusColumn(guessedStatus === guessedTime ? Math.min(guessedTime + 1, parsed.headers.length - 1) : guessedStatus);
  }, [parsed.headers]);

  const onFileSelected = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result ?? "");
      setRawInput(content);
      if (!datasetName.trim()) {
        const baseName = file.name.replace(/\.[^.]+$/, "");
        setDatasetName(baseName);
      }
    };
    reader.readAsText(file);
  };

  const resetAndClose = () => {
    setDatasetName("");
    setRawInput("");
    setManualRows(createEmptyRows(5));
    setErrorMessage("");
    onClose();
  };

  const submitManual = () => {
    setErrorMessage("");
    const { data } = manualParsed;
    if (data.length === 0) {
      setErrorMessage("Enter at least one row with a valid time before adding a dataset.");
      return;
    }

    const nFail = data.filter((point) => point.status === "FAIL").length;
    if (nFail < 1) {
      setErrorMessage("At least one FAIL row is required.");
      return;
    }

    onAddDataset({
      name: datasetName.trim() || `Dataset ${Date.now()}`,
      data,
    });
    resetAndClose();
  };

  const submitCsv = () => {
    setErrorMessage("");
    if (!rawInput.trim()) {
      setErrorMessage("Paste or upload CSV data before adding a dataset.");
      return;
    }
    if (!parseResult) {
      setErrorMessage("Unable to parse input.");
      return;
    }
    if (parseResult.acceptedRows === 0) {
      setErrorMessage("No valid rows found after parsing and status mapping.");
      return;
    }

    const nFail = parseResult.data.filter((point) => point.status === "FAIL").length;
    if (nFail < 1) {
      setErrorMessage("At least one FAIL row is required.");
      return;
    }

    onAddDataset({
      name: datasetName.trim() || `Dataset ${Date.now()}`,
      data: parseResult.data,
    });
    resetAndClose();
  };

  const submit = () => (mode === "MANUAL" ? submitManual() : submitCsv());

  if (!isOpen) return null;

  return (
    <div className="rounded-xl border border-[#e4e7ec] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#1a2027]">Add dataset</h3>
        <button type="button" onClick={onClose} className="rounded-lg border border-[#d5dae1] px-2 py-1 text-xs text-[#5b6470] hover:bg-[#f8fafc]">
          Close
        </button>
      </div>

      <label className="mb-4 block text-sm md:w-1/2">
        Dataset name
        <input
          type="text"
          value={datasetName}
          onChange={(event) => setDatasetName(event.target.value)}
          placeholder="e.g., ALT Lot A"
          className="mt-1 w-full rounded-lg border border-[#d5dae1] p-2"
        />
      </label>

      <div className="mb-4 flex gap-1 border-b border-[#eef1f4]">
        <button
          type="button"
          onClick={() => setMode("MANUAL")}
          className={`px-3 py-2 text-sm font-medium ${
            mode === "MANUAL" ? "border-b-2 border-[#2563eb] text-[#1d4ed8]" : "text-[#8a929c] hover:text-[#5b6470]"
          }`}
        >
          Enter manually
        </button>
        <button
          type="button"
          onClick={() => setMode("CSV")}
          className={`px-3 py-2 text-sm font-medium ${
            mode === "CSV" ? "border-b-2 border-[#2563eb] text-[#1d4ed8]" : "text-[#8a929c] hover:text-[#5b6470]"
          }`}
        >
          Paste / upload CSV
        </button>
      </div>

      {mode === "MANUAL" ? (
        <div>
          <DataPointsTable rows={manualRows} onChange={setManualRows} />
          {manualParsed.ignoredCount > 0 ? (
            <p className="mt-2 text-xs text-gray-600">
              {manualParsed.ignoredCount} empty {manualParsed.ignoredCount === 1 ? "row" : "rows"} ignored.
            </p>
          ) : null}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm">
              Upload CSV / TSV
              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm"
              />
            </label>
          </div>

          <label className="mt-4 block text-sm">
            Paste data
            <textarea
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              rows={8}
              placeholder={"time,status\n120,FAIL\n150,F\n200,SUSP"}
              className="mt-1 w-full rounded-lg border border-[#d5dae1] p-2 text-xs"
              style={{ fontFamily: "var(--font-weibull-mono)" }}
            />
          </label>

          {parsed.headers.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Time column
                <select
                  value={timeColumn}
                  onChange={(event) => setTimeColumn(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-[#d5dae1] p-2"
                >
                  {parsed.headers.map((header, index) => (
                    <option key={`time-col-${header}-${index}`} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Status column
                <select
                  value={statusColumn}
                  onChange={(event) => setStatusColumn(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-[#d5dae1] p-2"
                >
                  {parsed.headers.map((header, index) => (
                    <option key={`status-col-${header}-${index}`} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {parseResult ? (
            <div className="mt-4 rounded-lg border-l-[3px] border-[#2563eb] bg-[#eff4ff] p-3 text-sm text-[#1a2027]">
              <p>
                Parsed rows: {parseResult.acceptedRows}/{parseResult.totalRows}
              </p>
              <p className="text-xs text-[#5b6470]">
                Skipped: {parseResult.skippedRows} (missing time: {parseResult.missingTimeRows}, invalid time: {parseResult.invalidTimeRows}, unknown
                status: {parseResult.unknownStatusRows})
              </p>
            </div>
          ) : null}

          <p className="mt-2 text-xs text-[#8a929c]">
            Accepted status values: FAIL/F/1 and SUSP/C/0/CENSORED. Delimiters supported: comma, tab, semicolon.
          </p>
        </div>
      )}

      {errorMessage ? <p className="mt-2 text-sm text-red-700">{errorMessage}</p> : null}

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={submit} className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm text-white hover:bg-[#1d4ed8]">
          Add dataset
        </button>
        <button type="button" onClick={resetAndClose} className="rounded-lg border border-[#d5dae1] px-4 py-2 text-sm text-[#5b6470] hover:bg-[#f8fafc]">
          Cancel
        </button>
      </div>
    </div>
  );
}
