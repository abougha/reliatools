"use client";

import { useState } from "react";
import type { DataPoint } from "../_lib/weibullMath";
import DataPointsTable, { dataPointsToEditableRows, editableRowsToDataPoints, type EditableRow } from "./DataPointsTable";

type DatasetEditorProps = {
  data: DataPoint[];
  onChange: (data: DataPoint[]) => void;
};

export default function DatasetEditor({ data, onChange }: DatasetEditorProps) {
  const [rows, setRows] = useState<EditableRow[]>(() => dataPointsToEditableRows(data));

  const updateRows = (nextRows: EditableRow[]) => {
    setRows(nextRows);
    onChange(editableRowsToDataPoints(nextRows).data);
  };

  const { ignoredCount } = editableRowsToDataPoints(rows);

  return (
    <div className="mt-3 rounded-lg border border-[#eef1f4] bg-[#f8fafc] p-3">
      <DataPointsTable rows={rows} onChange={updateRows} />
      {ignoredCount > 0 ? (
        <p className="mt-2 text-xs text-[#8a929c]">
          {ignoredCount} empty {ignoredCount === 1 ? "row" : "rows"} ignored.
        </p>
      ) : null}
    </div>
  );
}
