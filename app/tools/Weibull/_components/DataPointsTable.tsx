"use client";

import type { KeyboardEvent } from "react";
import type { DataPoint, Status } from "../_lib/weibullMath";

export type EditableRow = {
  id: string;
  time: string;
  status: Status;
};

let rowCounter = 0;
function nextRowId(): string {
  rowCounter += 1;
  return `row-${Date.now()}-${rowCounter}`;
}

export function createEmptyRows(count: number): EditableRow[] {
  return Array.from({ length: count }, () => ({ id: nextRowId(), time: "", status: "FAIL" }));
}

export function dataPointsToEditableRows(data: DataPoint[]): EditableRow[] {
  return data.map((point) => ({ id: point.id ?? nextRowId(), time: String(point.t), status: point.status }));
}

export function editableRowsToDataPoints(rows: EditableRow[]): { data: DataPoint[]; ignoredCount: number } {
  const data: DataPoint[] = [];
  let ignoredCount = 0;

  for (const row of rows) {
    const trimmed = row.time.trim();
    const value = Number(trimmed);
    if (!trimmed || !Number.isFinite(value) || value <= 0) {
      ignoredCount += 1;
      continue;
    }
    data.push({ id: row.id, t: value, status: row.status });
  }

  return { data, ignoredCount };
}

type DataPointsTableProps = {
  rows: EditableRow[];
  onChange: (rows: EditableRow[]) => void;
};

export default function DataPointsTable({ rows, onChange }: DataPointsTableProps) {
  const updateRow = (id: string, patch: Partial<EditableRow>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  const addRow = () => {
    onChange([...rows, ...createEmptyRows(1)]);
  };

  const onTimeKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Enter" && index === rows.length - 1) {
      event.preventDefault();
      addRow();
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#8a929c]">
              <th className="py-1 pr-2 font-medium">Time</th>
              <th className="py-1 pr-2 font-medium">Status</th>
              <th className="py-1 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td className="py-1 pr-2">
                  <input
                    type="number"
                    value={row.time}
                    onChange={(event) => updateRow(row.id, { time: event.target.value })}
                    onKeyDown={(event) => onTimeKeyDown(event, index)}
                    min={0}
                    step="any"
                    placeholder="e.g. 120"
                    className="w-full rounded-lg border border-[#d5dae1] p-1.5 text-[#1a2027]"
                    style={{ fontFamily: "var(--font-weibull-mono)" }}
                  />
                </td>
                <td className="py-1 pr-2">
                  <select
                    value={row.status}
                    onChange={(event) => updateRow(row.id, { status: event.target.value as Status })}
                    className="w-full rounded-lg border border-[#d5dae1] p-1.5 text-[#1a2027]"
                  >
                    <option value="FAIL">Fail</option>
                    <option value="SUSP">Suspended</option>
                  </select>
                </td>
                <td className="py-1">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    aria-label="Delete row"
                    className="rounded-lg border border-[#f0c9c9] px-2 py-1 text-xs text-[#c0362c] hover:bg-[#fff5f5]"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 rounded-lg border border-[#d5dae1] px-3 py-1.5 text-xs text-[#5b6470] hover:bg-[#f8fafc]"
      >
        Add row
      </button>
    </div>
  );
}
