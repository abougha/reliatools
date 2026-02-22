"use client";

import { useEffect, useMemo, useState } from "react";
import { parseDataPointsFromTable, parseDelimitedTable } from "../_lib/csv";
import type { DataPoint } from "../_lib/weibullMath";

type DatasetUploaderProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddDataset: (dataset: { name: string; data: DataPoint[] }) => void;
};

function guessColumnIndex(headers: string[], patterns: string[], fallback: number): number {
  const index = headers.findIndex((header) => {
    const normalized = header.toLowerCase();
    return patterns.some((pattern) => normalized.includes(pattern));
  });
  return index >= 0 ? index : fallback;
}

export default function DatasetUploader({ isOpen, onClose, onAddDataset }: DatasetUploaderProps) {
  const [datasetName, setDatasetName] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [timeColumn, setTimeColumn] = useState(0);
  const [statusColumn, setStatusColumn] = useState(1);
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

  const submit = () => {
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

    setDatasetName("");
    setRawInput("");
    setErrorMessage("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="rounded border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Add dataset</h3>
        <button type="button" onClick={onClose} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm">
          Dataset name
          <input
            type="text"
            value={datasetName}
            onChange={(event) => setDatasetName(event.target.value)}
            placeholder="e.g., ALT Lot A"
            className="mt-1 w-full rounded border p-2"
          />
        </label>

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
          className="mt-1 w-full rounded border p-2 font-mono text-xs"
        />
      </label>

      {parsed.headers.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Time column
            <select value={timeColumn} onChange={(event) => setTimeColumn(Number(event.target.value))} className="mt-1 w-full rounded border p-2">
              {parsed.headers.map((header, index) => (
                <option key={`time-col-${header}-${index}`} value={index}>
                  {header}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Status column
            <select value={statusColumn} onChange={(event) => setStatusColumn(Number(event.target.value))} className="mt-1 w-full rounded border p-2">
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
        <div className="mt-4 rounded border-l-4 border-blue-500 bg-blue-50 p-3 text-sm text-blue-900">
          <p>
            Parsed rows: {parseResult.acceptedRows}/{parseResult.totalRows}
          </p>
          <p className="text-xs">
            Skipped: {parseResult.skippedRows} (missing time: {parseResult.missingTimeRows}, invalid time: {parseResult.invalidTimeRows}, unknown
            status: {parseResult.unknownStatusRows})
          </p>
        </div>
      ) : null}

      <p className="mt-2 text-xs text-gray-600">
        Accepted status values: FAIL/F/1 and SUSP/C/0/CENSORED. Delimiters supported: comma, tab, semicolon.
      </p>

      {errorMessage ? <p className="mt-2 text-sm text-red-700">{errorMessage}</p> : null}

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={submit} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          Add dataset
        </button>
        <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  );
}
