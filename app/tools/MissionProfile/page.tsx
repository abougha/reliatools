
"use client";

import { useMemo, useRef, useState } from "react";
import {
  applyTemplate,
  buildEmptyMatrix,
  computeCellExposureHours,
  computeLifeHours,
  createDefaultTargetLife,
  MISSION_PROFILE_SCHEMA_VERSION,
  MISSION_PROFILE_VERSION,
  parseMissionProfile,
  PHASES,
  serializeMissionProfile,
  STRESSES,
  summarizeLifetimeByStress,
  type Cell,
  type ExposureMode,
  type Likelihood,
  type MissionMatrix,
  type PhaseKey,
  type StressKey,
  type TargetLife,
} from "@/lib/missionProfile/schema";
import { MISSION_PROFILE_TEMPLATES } from "@/lib/missionProfile/templates";

const LIKELIHOOD_ORDER: Likelihood[] = ["not_likely", "possible", "likely"];
const LIKELIHOOD_LABEL: Record<Likelihood, string> = {
  not_likely: "Not likely",
  possible: "Possible",
  likely: "Likely",
};
const LIKELIHOOD_SHORT: Record<Likelihood, string> = { not_likely: "N", possible: "P", likely: "L" };
const LIKELIHOOD_CLASS: Record<Likelihood, string> = {
  not_likely: "bg-green-100 text-green-900",
  possible: "bg-yellow-100 text-yellow-900",
  likely: "bg-red-100 text-red-900",
};
const LIKELIHOOD_EXCEL_FILL: Record<Likelihood, string> = {
  not_likely: "FFE7F7EA",
  possible: "FFFFF7D6",
  likely: "FFFDE2E2",
};

function cycleLikelihood(current: Likelihood, reverse = false): Likelihood {
  const i = LIKELIHOOD_ORDER.indexOf(current);
  return LIKELIHOOD_ORDER[(i + (reverse ? -1 : 1) + LIKELIHOOD_ORDER.length) % LIKELIHOOD_ORDER.length];
}

function asNumber(v: number | "") {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function fmt(value: number, digits = 2) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toId(stressKey: StressKey, phaseKey: PhaseKey, fieldKey: string) {
  return `${stressKey}__${phaseKey}__${fieldKey}`;
}

function sanitizeFilenamePart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
}

function exposureInline(cell: Cell): string {
  if (cell.exposure.mode === "Once") {
    const n = asNumber(cell.exposure.events);
    return `n=${n === null ? "" : fmt(n, 1)}`;
  }
  if (cell.exposure.mode === "Hours") {
    const h = asNumber(cell.exposure.hours);
    return `h=${h === null ? "" : fmt(h, 1)}`;
  }
  const p = asNumber(cell.exposure.percentLife);
  return `%L=${p === null ? "" : fmt(p, 2)}`;
}

function stressInlineSummary(stressKey: StressKey, cell: Cell): string {
  const p = cell.params;
  const v = (key: string) => asNumber(p[key] ?? "");
  switch (stressKey) {
    case "temperature_extremes": {
      const min = v("minC");
      const max = v("maxC");
      if (min === null && max === null) return "";
      if (min !== null && max !== null) return `${fmt(min, 0)}...${fmt(max, 0)}C`;
      return min !== null ? `min ${fmt(min, 0)}C` : `max ${fmt(max as number, 0)}C`;
    }
    case "thermal_cycles": {
      const dt = v("deltaC");
      const nDay = v("cyclesPerDay");
      return [dt !== null ? `dT=${fmt(dt, 0)}C` : "", nDay !== null ? `N/day=${fmt(nDay, 1)}` : ""]
        .filter(Boolean)
        .join(", ");
    }
    case "humidity": {
      const rh = v("rhPct");
      const cond = v("condensingHoursWeek");
      return [rh !== null ? `${fmt(rh, 0)}%RH` : "", cond !== null ? `${fmt(cond, 1)}h/w` : ""]
        .filter(Boolean)
        .join(", ");
    }
    case "vibration": {
      const grms = v("grms");
      return grms === null ? "" : `${fmt(grms, 2)} gRMS`;
    }
    case "mechanical_shock": {
      const g = v("gPeak");
      const ms = v("pulseMs");
      return [g !== null ? `${fmt(g, 0)}g` : "", ms !== null ? `${fmt(ms, 1)}ms` : ""].filter(Boolean).join(", ");
    }
    case "esd": {
      const c = v("contactKv");
      const a = v("airKv");
      if (c === null && a === null) return "";
      if (c !== null && a !== null) return `${fmt(c, 1)}/${fmt(a, 1)} kV`;
      return c !== null ? `C ${fmt(c, 1)} kV` : `A ${fmt(a as number, 1)} kV`;
    }
    case "salt_fog": {
      const nacl = v("naclPct");
      const h = v("hoursPerWeek");
      return [nacl !== null ? `${fmt(nacl, 1)}%NaCl` : "", h !== null ? `${fmt(h, 1)}h/w` : ""]
        .filter(Boolean)
        .join(", ");
    }
    case "chemical_exposure": {
      const sev = v("severityIndex");
      const h = v("hoursPerWeek");
      return [sev !== null ? `SI=${fmt(sev, 1)}` : "", h !== null ? `${fmt(h, 1)}h/w` : ""]
        .filter(Boolean)
        .join(", ");
    }
    case "dust_ingress": {
      const pm = v("pmMgM3");
      return pm === null ? "" : `${fmt(pm, 0)} mg/m3`;
    }
    default:
      return "";
  }
}

function cellInlineSummary(stressKey: StressKey, cell: Cell): string[] {
  const lines = [LIKELIHOOD_LABEL[cell.likelihood], exposureInline(cell)];
  const stress = stressInlineSummary(stressKey, cell);
  if (stress) lines.push(stress);
  return lines;
}

function buildLifetimeSummaryData(matrix: MissionMatrix, lifeHours: number | null) {
  return summarizeLifetimeByStress(matrix, lifeHours)
    .map((row) => ({
      ...row,
      percentOfLife: lifeHours && lifeHours > 0 && row.totalExposureHours > 0 ? (row.totalExposureHours / lifeHours) * 100 : null,
    }))
    .sort((a, b) => b.totalExposureHours - a.totalExposureHours || b.totalEvents - a.totalEvents);
}

const defaultTemplate = MISSION_PROFILE_TEMPLATES[0];

export default function MissionProfilePage() {
  const [industry, setIndustry] = useState(defaultTemplate.industry);
  const [product, setProduct] = useState(defaultTemplate.product);
  const [location, setLocation] = useState(defaultTemplate.location);
  const [targetLife, setTargetLife] = useState<TargetLife>(() => createDefaultTargetLife());
  const [notes, setNotes] = useState("");
  const [matrix, setMatrix] = useState<MissionMatrix>(() => applyTemplate(defaultTemplate));
  const [selectedCell, setSelectedCell] = useState<{ stressKey: StressKey; phaseKey: PhaseKey }>({
    stressKey: STRESSES[0].key,
    phaseKey: PHASES[0].key,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const industries = useMemo(() => Array.from(new Set(MISSION_PROFILE_TEMPLATES.map((t) => t.industry))), []);
  const products = useMemo(
    () => Array.from(new Set(MISSION_PROFILE_TEMPLATES.filter((t) => t.industry === industry).map((t) => t.product))),
    [industry]
  );
  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          MISSION_PROFILE_TEMPLATES.filter((t) => t.industry === industry && t.product === product).map(
            (t) => t.location
          )
        )
      ),
    [industry, product]
  );
  const selectedTemplate = useMemo(
    () => MISSION_PROFILE_TEMPLATES.find((t) => t.industry === industry && t.product === product && t.location === location),
    [industry, product, location]
  );

  const selectedStress = STRESSES.find((s) => s.key === selectedCell.stressKey) ?? STRESSES[0];
  const selectedPhase = PHASES.find((p) => p.key === selectedCell.phaseKey) ?? PHASES[0];
  const selectedCellData = matrix[selectedStress.key][selectedPhase.key];
  const lifeHours = useMemo(() => computeLifeHours(targetLife), [targetLife]);

  const counts = useMemo(() => {
    let notLikely = 0, possible = 0, likely = 0;
    for (const stress of STRESSES) {
      for (const phase of PHASES) {
        const l = matrix[stress.key][phase.key].likelihood;
        if (l === "not_likely") notLikely += 1;
        if (l === "possible") possible += 1;
        if (l === "likely") likely += 1;
      }
    }
    return { notLikely, possible, likely };
  }, [matrix]);

  const latestLifetimeSummary = useMemo(() => buildLifetimeSummaryData(matrix, lifeHours), [matrix, lifeHours]);
  const [lifetimeSummary, setLifetimeSummary] = useState(() => buildLifetimeSummaryData(matrix, lifeHours));

  function generateLifetimeSummary() {
    setLifetimeSummary(latestLifetimeSummary);
  }

  function updateMatrix(updater: (draft: MissionMatrix) => void) {
    setMatrix((prev) => {
      const draft = structuredClone(prev);
      updater(draft);
      return draft;
    });
  }

  function handleCellClick(stressKey: StressKey, phaseKey: PhaseKey, reverse = false) {
    setSelectedCell({ stressKey, phaseKey });
    updateMatrix((draft) => {
      draft[stressKey][phaseKey].likelihood = cycleLikelihood(draft[stressKey][phaseKey].likelihood, reverse);
    });
  }

  function setCellLikelihood(stressKey: StressKey, phaseKey: PhaseKey, likelihood: Likelihood) {
    updateMatrix((draft) => {
      draft[stressKey][phaseKey].likelihood = likelihood;
    });
  }

  function setRowLikelihood(stressKey: StressKey, likelihood: Likelihood) {
    updateMatrix((draft) => PHASES.forEach((phase) => (draft[stressKey][phase.key].likelihood = likelihood)));
  }

  function setColumnLikelihood(phaseKey: PhaseKey, likelihood: Likelihood) {
    updateMatrix((draft) => STRESSES.forEach((stress) => (draft[stress.key][phaseKey].likelihood = likelihood)));
  }

  function setCellParam(stressKey: StressKey, phaseKey: PhaseKey, fieldKey: string, rawValue: string) {
    const id = toId(stressKey, phaseKey, fieldKey);
    if (rawValue.trim() === "") {
      updateMatrix((draft) => (draft[stressKey][phaseKey].params[fieldKey] = ""));
      setFieldErrors((prev) => {
        const next = { ...prev }; delete next[id]; return next;
      });
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return setFieldErrors((prev) => ({ ...prev, [id]: "Must be finite." }));
    updateMatrix((draft) => (draft[stressKey][phaseKey].params[fieldKey] = parsed));
    setFieldErrors((prev) => {
      const next = { ...prev }; delete next[id]; return next;
    });
  }

  function setExposureMode(stressKey: StressKey, phaseKey: PhaseKey, mode: ExposureMode) {
    updateMatrix((draft) => {
      draft[stressKey][phaseKey].exposure.mode = mode;
      if (mode === "Once" && draft[stressKey][phaseKey].exposure.events === "") draft[stressKey][phaseKey].exposure.events = 1;
    });
  }

  function setExposureValue(stressKey: StressKey, phaseKey: PhaseKey, field: "events" | "hours" | "percentLife", rawValue: string) {
    const id = toId(stressKey, phaseKey, `exposure_${field}`);
    if (rawValue.trim() === "") {
      updateMatrix((draft) => (draft[stressKey][phaseKey].exposure[field] = ""));
      setFieldErrors((prev) => {
        const next = { ...prev }; delete next[id]; return next;
      });
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0) return setFieldErrors((prev) => ({ ...prev, [id]: "Must be >= 0." }));
    if (field === "percentLife" && parsed > 100) return setFieldErrors((prev) => ({ ...prev, [id]: "Must be 0-100." }));
    updateMatrix((draft) => (draft[stressKey][phaseKey].exposure[field] = parsed));
    setFieldErrors((prev) => {
      const next = { ...prev }; delete next[id]; return next;
    });
  }

  function loadTemplate() {
    if (!selectedTemplate) return;
    setMatrix(applyTemplate(selectedTemplate, buildEmptyMatrix()));
    setFieldErrors({});
    setImportMessage(`Loaded template: ${selectedTemplate.product} / ${selectedTemplate.location}.`);
  }

  function exportProfile() {
    const payload = serializeMissionProfile({
      missionProfileSchemaVersion: MISSION_PROFILE_SCHEMA_VERSION,
      version: MISSION_PROFILE_VERSION,
      industry,
      product,
      location,
      targetLife,
      phases: PHASES,
      stresses: STRESSES,
      matrix,
      notes,
    });
    const fileName = `mission-profile-${sanitizeFilenamePart(industry)}-${sanitizeFilenamePart(product)}-${sanitizeFilenamePart(location)}.json`;
    downloadJson(fileName, payload);
  }

  async function importProfile(file: File) {
    const parsed = parseMissionProfile(await file.text());
    if (!parsed) return setImportMessage("Import failed: invalid schema.");
    setIndustry(parsed.industry);
    setProduct(parsed.product);
    setLocation(parsed.location);
    setTargetLife(parsed.targetLife);
    setNotes(parsed.notes ?? "");
    setMatrix(parsed.matrix);
    setSelectedCell({ stressKey: STRESSES[0].key, phaseKey: PHASES[0].key });
    setFieldErrors({});
    setImportMessage("Mission profile imported.");
  }

  function resetAll() {
    setMatrix(buildEmptyMatrix());
    setTargetLife(createDefaultTargetLife());
    setNotes("");
    setFieldErrors({});
    setImportMessage("Profile reset.");
  }

  async function downloadProfileCardPdf() {
    const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = (autoTableModule as { default: (doc: unknown, options: unknown) => void }).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    doc.setFontSize(13);
    doc.text("Mission Profile Card", 18, 20);
    doc.setFontSize(8);
    doc.text(
      [
        `Context: ${industry} / ${product} / ${location}`,
        `Template ID: ${selectedTemplate?.id ?? "custom"} | Schema: ${MISSION_PROFILE_SCHEMA_VERSION} | Version: ${MISSION_PROFILE_VERSION}`,
        `Generated: ${new Date().toLocaleString()}`,
        `Target Life: ${targetLife.mode === "Years" ? `${targetLife.years ?? ""} years` : `${targetLife.hours ?? ""} hours`} | Total life hours: ${lifeHours === null ? "N/A" : fmt(lifeHours, 1)}`,
      ],
      18,
      34
    );

    autoTable(doc, {
      startY: 72,
      margin: { left: 14, right: 14 },
      head: [["Stress", ...PHASES.map((phase) => phase.label)]],
      body: STRESSES.map((stress) => [
        stress.label,
        ...PHASES.map((phase) => {
          const cell = matrix[stress.key][phase.key];
          const lines = cellInlineSummary(stress.key, cell);
          return `${LIKELIHOOD_SHORT[cell.likelihood]} | ${lines[1]}\n${lines[2] ?? ""}`.trim();
        }),
      ]),
      styles: { fontSize: 6, cellPadding: 2, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [237, 242, 247], textColor: [17, 24, 39] },
      columnStyles: { 0: { cellWidth: 95 } },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index > 0) {
          const stress = STRESSES[data.row.index];
          const phase = PHASES[data.column.index - 1];
          const likelihood = matrix[stress.key][phase.key].likelihood;
          if (likelihood === "likely") data.cell.styles.fillColor = [254, 226, 226];
          if (likelihood === "possible") data.cell.styles.fillColor = [254, 243, 199];
          if (likelihood === "not_likely") data.cell.styles.fillColor = [220, 252, 231];
        }
      },
    });

    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY ?? 230) + 8,
      margin: { left: 14, right: 14 },
      head: [["Stress", "Exposure Hours", "Events", "% of Life", "Dominant Phase"]],
      body: latestLifetimeSummary.map((row) => [
        row.stressLabel,
        row.totalExposureHours > 0 ? fmt(row.totalExposureHours, 2) : "",
        row.totalEvents > 0 ? fmt(row.totalEvents, 0) : "",
        row.percentOfLife !== null ? `${fmt(row.percentOfLife, 2)}%` : "",
        row.dominantPhaseLabel ?? "",
      ]),
      styles: { fontSize: 6, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [237, 242, 247], textColor: [17, 24, 39] },
    });

    const y = ((doc as any).lastAutoTable?.finalY ?? 330) + 10;
    doc.setFontSize(8);
    doc.text("Assumptions / Notes:", 18, y);
    doc.setFontSize(7);
    doc.text(doc.splitTextToSize(notes.trim() ? notes : "None", 800), 18, y + 10);
    doc.save("mission-profile-card.pdf");
  }

  async function downloadExcelWorkbook() {
    const [excelJSImport, fileSaverImport] = await Promise.all([import("exceljs"), import("file-saver")]);
    const ExcelJS = excelJSImport as any;
    const workbook = new ExcelJS.Workbook();
    const saveAs = (fileSaverImport as any).saveAs as (data: Blob, name: string) => void;

    const summary = workbook.addWorksheet("Summary");
    summary.columns = [
      { header: "Field", key: "field", width: 24 },
      { header: "Value", key: "value", width: 46 },
    ];
    summary.addRows([
      { field: "Industry", value: industry },
      { field: "Product", value: product },
      { field: "Location", value: location },
      { field: "Template ID", value: selectedTemplate?.id ?? "custom" },
      { field: "Schema Version", value: MISSION_PROFILE_SCHEMA_VERSION },
      { field: "Profile Version", value: String(MISSION_PROFILE_VERSION) },
      {
        field: "Target Life",
        value: targetLife.mode === "Years" ? `${targetLife.years ?? ""} years @ ${targetLife.hoursPerYear ?? 8760} h/year` : `${targetLife.hours ?? ""} hours`,
      },
      { field: "Total Life Hours", value: lifeHours === null ? "N/A" : fmt(lifeHours, 2) },
      { field: "Notes", value: notes || "" },
      {},
    ]);
    summary.addRow(["Stress", "Exposure Hours", "Events", "% of Life", "Dominant Phase"]);
    for (const row of latestLifetimeSummary) {
      summary.addRow([
        row.stressLabel,
        row.totalExposureHours > 0 ? row.totalExposureHours : "",
        row.totalEvents > 0 ? row.totalEvents : "",
        row.percentOfLife !== null ? row.percentOfLife : "",
        row.dominantPhaseLabel ?? "",
      ]);
    }
    summary.getRow(11).font = { bold: true };

    const matrixSheet = workbook.addWorksheet("Matrix");
    matrixSheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
    matrixSheet.columns = [{ header: "Stress", key: "stress", width: 26 }, ...PHASES.map(() => ({ width: 16 }))];
    matrixSheet.getCell(1, 1).value = "Stress";
    PHASES.forEach((phase, idx) => (matrixSheet.getCell(1, idx + 2).value = phase.label));
    matrixSheet.getRow(1).font = { bold: true };

    STRESSES.forEach((stress, rowIndex) => {
      const r = rowIndex + 2;
      matrixSheet.getCell(r, 1).value = stress.label;
      matrixSheet.getCell(r, 1).font = { bold: true };
      PHASES.forEach((phase, colIndex) => {
        const cell = matrix[stress.key][phase.key];
        const c = matrixSheet.getCell(r, colIndex + 2);
        c.value = cellInlineSummary(stress.key, cell).join("\n");
        c.alignment = { wrapText: true, vertical: "top", horizontal: "left" };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIKELIHOOD_EXCEL_FILL[cell.likelihood] } };
      });
      matrixSheet.getRow(r).height = 42;
    });

    const inputs = workbook.addWorksheet("StressInputs");
    inputs.columns = [
      { header: "StressKey", key: "stressKey", width: 20 },
      { header: "StressLabel", key: "stressLabel", width: 28 },
      { header: "PhaseKey", key: "phaseKey", width: 18 },
      { header: "PhaseLabel", key: "phaseLabel", width: 18 },
      { header: "Likelihood", key: "likelihood", width: 12 },
      { header: "ExposureMode", key: "exposureMode", width: 14 },
      { header: "ExposureHours", key: "exposureHours", width: 14 },
      { header: "ExposurePercentLife", key: "exposurePercentLife", width: 16 },
      { header: "ExposureEvents", key: "exposureEvents", width: 14 },
      { header: "ParamKey", key: "paramKey", width: 18 },
      { header: "ParamLabel", key: "paramLabel", width: 28 },
      { header: "Value", key: "value", width: 12 },
      { header: "Unit", key: "unit", width: 12 },
    ];
    inputs.getRow(1).font = { bold: true };

    for (const stress of STRESSES) {
      for (const phase of PHASES) {
        const cell = matrix[stress.key][phase.key];
        const exposureHours = computeCellExposureHours(cell, lifeHours);
        for (const field of stress.fields) {
          inputs.addRow({
            stressKey: stress.key,
            stressLabel: stress.label,
            phaseKey: phase.key,
            phaseLabel: phase.label,
            likelihood: LIKELIHOOD_LABEL[cell.likelihood],
            exposureMode: cell.exposure.mode,
            exposureHours: exposureHours ?? "",
            exposurePercentLife: cell.exposure.percentLife,
            exposureEvents: cell.exposure.events,
            paramKey: field.key,
            paramLabel: field.label,
            value: cell.params[field.key] ?? "",
            unit: field.unit,
          });
        }
      }
    }

    const distributions = workbook.addWorksheet("Distributions");
    distributions.columns = [
      { header: "Distribution", key: "distribution", width: 30 },
      { header: "Bin", key: "bin", width: 20 },
      { header: "Value", key: "value", width: 20 },
    ];
    distributions.getRow(1).font = { bold: true };
    distributions.addRow({ distribution: "Temp time-at-temp bins", bin: "", value: "" });
    distributions.addRow({ distribution: "Delta-T histogram", bin: "", value: "" });
    distributions.addRow({ distribution: "Vibration PSD table", bin: "", value: "" });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "mission-profile.xlsx");
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Mission Profile Builder</h1>
        <p className="mt-2 text-sm text-gray-600">Build a duty-cycle stress matrix across lifecycle phases using clickable likelihood cells.</p>
        <div className="mt-3 rounded-xl border bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-800">Map where stresses are likely, possible, or not likely across storage, transport, operation, and service.</p>
          <p className="mt-1 text-sm text-gray-700">Capture numeric stress assumptions and exposure distributions, then export JSON, PDF, and Excel for reuse.</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border bg-white p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div>
            <label className="text-[11px] text-gray-500">Industry</label>
            <select className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={industry} onChange={(event) => {
              const nextIndustry = event.target.value;
              const nextProducts = Array.from(new Set(MISSION_PROFILE_TEMPLATES.filter((t) => t.industry === nextIndustry).map((t) => t.product)));
              const nextProduct = nextProducts[0] ?? "";
              const nextLocations = Array.from(new Set(MISSION_PROFILE_TEMPLATES.filter((t) => t.industry === nextIndustry && t.product === nextProduct).map((t) => t.location)));
              setIndustry(nextIndustry); setProduct(nextProduct); setLocation(nextLocations[0] ?? "");
            }}>
              {industries.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-500">Product</label>
            <select className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={product} onChange={(event) => {
              const nextProduct = event.target.value;
              const nextLocations = Array.from(new Set(MISSION_PROFILE_TEMPLATES.filter((t) => t.industry === industry && t.product === nextProduct).map((t) => t.location)));
              setProduct(nextProduct); setLocation(nextLocations[0] ?? "");
            }}>
              {products.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-500">Location</label>
            <select className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={location} onChange={(event) => setLocation(event.target.value)}>
              {locations.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={loadTemplate} className="w-full rounded-lg bg-black px-3 py-2 text-sm font-medium text-white md:w-auto" disabled={!selectedTemplate}>
              Load Template
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <span className="rounded bg-gray-100 px-2 py-1">Template: {selectedTemplate?.id ?? "custom"}</span>
          <span>Loading a template overwrites current matrix values.</span>
        </div>
        {selectedTemplate?.description ? <p className="mt-1 text-xs text-gray-600">{selectedTemplate.description}</p> : null}

        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-gray-700">Advanced actions</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={exportProfile} className="rounded-lg border px-3 py-1.5 text-xs font-medium">Export JSON</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg border px-3 py-1.5 text-xs font-medium">Import JSON</button>
            <button type="button" onClick={downloadProfileCardPdf} className="rounded-lg border px-3 py-1.5 text-xs font-medium">Download Profile Card (PDF)</button>
            <button type="button" onClick={downloadExcelWorkbook} className="rounded-lg border px-3 py-1.5 text-xs font-medium">Download Excel Workbook</button>
            <button type="button" onClick={resetAll} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700">Reset</button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              await importProfile(file);
              event.target.value = "";
            }} />
          </div>
        </details>

        {importMessage ? <p className="mt-2 text-xs text-blue-700">{importMessage}</p> : null}
      </div>

      <div className="mb-6 rounded-xl border bg-white p-4">
        <div className="mb-3 text-sm font-semibold">Target Life</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="text-xs text-gray-500">Mode</label>
            <div className="mt-2 flex gap-4 text-sm">
              <label className="inline-flex items-center gap-2"><input type="radio" checked={targetLife.mode === "Years"} onChange={() => setTargetLife((prev) => ({ ...prev, mode: "Years" }))} />Years</label>
              <label className="inline-flex items-center gap-2"><input type="radio" checked={targetLife.mode === "Hours"} onChange={() => setTargetLife((prev) => ({ ...prev, mode: "Hours" }))} />Hours</label>
            </div>
          </div>
          {targetLife.mode === "Years" ? (
            <>
              <div>
                <label className="text-xs text-gray-500">Years</label>
                <input type="number" min={0} step="any" className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" value={targetLife.years ?? ""} onChange={(event) => setTargetLife((prev) => ({ ...prev, years: event.target.value === "" ? undefined : Number(event.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Hours/Year</label>
                <input type="number" min={0} step="any" className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" value={targetLife.hoursPerYear ?? 8760} onChange={(event) => setTargetLife((prev) => ({ ...prev, hoursPerYear: event.target.value === "" ? undefined : Number(event.target.value) }))} />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs text-gray-500">Total Hours</label>
              <input type="number" min={0} step="any" className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" value={targetLife.hours ?? ""} onChange={(event) => setTargetLife((prev) => ({ ...prev, hours: event.target.value === "" ? undefined : Number(event.target.value) }))} />
            </div>
          )}
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Computed</div>
            <div className="mt-1 text-sm font-semibold">Total life hours: {lifeHours === null ? "N/A" : fmt(lifeHours, 2)}</div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded border bg-green-100 px-2 py-1 text-green-900">Not likely (N)</span>
          <span className="rounded border bg-yellow-100 px-2 py-1 text-yellow-900">Possible (P)</span>
          <span className="rounded border bg-red-100 px-2 py-1 text-red-900">Likely (L)</span>
          <span className="text-xs text-gray-600">Shift+Click on a cell cycles backward.</span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-red-50 p-3 text-sm"><div className="text-xs text-red-800">Likely</div><div className="text-xl font-semibold text-red-900">{counts.likely}</div></div>
          <div className="rounded-lg border bg-yellow-50 p-3 text-sm"><div className="text-xs text-yellow-800">Possible</div><div className="text-xl font-semibold text-yellow-900">{counts.possible}</div></div>
          <div className="rounded-lg border bg-green-50 p-3 text-sm"><div className="text-xs text-green-800">Not likely</div><div className="text-xl font-semibold text-green-900">{counts.notLikely}</div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-3 text-sm font-semibold">Stress vs Phase Matrix</div>
          <div className="max-h-[70vh] overflow-y-auto rounded-lg border">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 w-[180px] border-b border-r bg-gray-100 p-2 text-left text-xs font-semibold">Stress</th>
                  {PHASES.map((phase) => (
                    <th key={phase.key} className="sticky top-0 z-20 w-[110px] border-b border-r bg-gray-100 p-2 align-top text-left text-xs font-semibold">
                      <div className="font-semibold">{phase.label}</div>
                      <div className="mt-2 flex items-center gap-1">
                        {LIKELIHOOD_ORDER.map((likelihood) => (
                          <button key={`${phase.key}-${likelihood}`} type="button" className="rounded border px-1 py-0.5 text-[10px] hover:bg-white" onClick={() => setColumnLikelihood(phase.key, likelihood)} title={`Set ${phase.label} column to ${LIKELIHOOD_LABEL[likelihood]}`}>{LIKELIHOOD_SHORT[likelihood]}</button>
                        ))}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STRESSES.map((stress) => (
                  <tr key={stress.key}>
                    <td className="sticky left-0 z-10 border-b border-r bg-white p-2 align-top">
                      <div className="text-xs font-medium">{stress.label}</div>
                      <div className="mt-2 flex items-center gap-1">
                        {LIKELIHOOD_ORDER.map((likelihood) => (
                          <button key={`${stress.key}-${likelihood}`} type="button" className="rounded border px-1 py-0.5 text-[10px] hover:bg-gray-50" onClick={() => setRowLikelihood(stress.key, likelihood)} title={`Set ${stress.label} row to ${LIKELIHOOD_LABEL[likelihood]}`}>{LIKELIHOOD_SHORT[likelihood]}</button>
                        ))}
                      </div>
                    </td>
                    {PHASES.map((phase) => {
                      const cell = matrix[stress.key][phase.key];
                      const lines = cellInlineSummary(stress.key, cell);
                      const selected = selectedCell.stressKey === stress.key && selectedCell.phaseKey === phase.key;
                      return (
                        <td key={`${stress.key}-${phase.key}`} className="border-b border-r p-1">
                          <button type="button" onClick={(event) => handleCellClick(stress.key, phase.key, event.shiftKey)} className={["h-16 w-full rounded border p-1 text-left text-[10px] font-medium leading-tight transition", LIKELIHOOD_CLASS[cell.likelihood], selected ? "ring-2 ring-blue-500 ring-offset-1" : "hover:opacity-90"].join(" ")} aria-label={`${stress.label} - ${phase.label} - ${LIKELIHOOD_LABEL[cell.likelihood]}`}>
                            {lines.map((line, idx) => <div key={`${stress.key}-${phase.key}-${idx}`} className="truncate">{line}</div>)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold">Selected Cell Editor</div>
          <div className="mt-2 text-xs text-gray-600">{selectedStress.label} - {selectedPhase.label}</div>

          <div className="mt-4">
            <label className="text-xs text-gray-500">Likelihood</label>
            <select className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" value={selectedCellData.likelihood} onChange={(event) => setCellLikelihood(selectedStress.key, selectedPhase.key, event.target.value as Likelihood)}>
              <option value="not_likely">Not likely</option><option value="possible">Possible</option><option value="likely">Likely</option>
            </select>
          </div>

          <div className="mt-4 rounded-lg border bg-gray-50 p-3">
            <div className="text-xs font-semibold text-gray-700">Exposure</div>
            <div className="mt-2"><label className="text-xs text-gray-500">Mode</label>
              <select className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" value={selectedCellData.exposure.mode} onChange={(event) => setExposureMode(selectedStress.key, selectedPhase.key, event.target.value as ExposureMode)}>
                <option value="Once">Once</option><option value="Hours">Hours</option><option value="PercentLife">% Life</option>
              </select>
            </div>

            {selectedCellData.exposure.mode === "Once" ? <div className="mt-2"><label className="text-xs text-gray-500">Events</label><input type="number" min={0} step={1} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" value={selectedCellData.exposure.events} onChange={(event) => setExposureValue(selectedStress.key, selectedPhase.key, "events", event.target.value)} /></div> : null}
            {selectedCellData.exposure.mode === "Hours" ? <div className="mt-2"><label className="text-xs text-gray-500">Exposure hours</label><input type="number" min={0} step="any" className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" value={selectedCellData.exposure.hours} onChange={(event) => setExposureValue(selectedStress.key, selectedPhase.key, "hours", event.target.value)} /></div> : null}
            {selectedCellData.exposure.mode === "PercentLife" ? <div className="mt-2"><label className="text-xs text-gray-500">% of lifetime</label><input type="number" min={0} max={100} step="any" className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" value={selectedCellData.exposure.percentLife} onChange={(event) => setExposureValue(selectedStress.key, selectedPhase.key, "percentLife", event.target.value)} />{lifeHours === null ? <p className="mt-1 text-[11px] text-amber-700">Set target life to convert % to hours.</p> : null}</div> : null}
          </div>

          {selectedCellData.likelihood === "not_likely" ? <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-xs text-gray-600">Set this cell to Possible or Likely to enter numeric stress assumptions.</div> : (
            <div className="mt-4 grid grid-cols-1 gap-3">
              {selectedStress.fields.map((field) => {
                const id = toId(selectedStress.key, selectedPhase.key, field.key);
                const error = fieldErrors[id];
                return (
                  <div key={field.key}>
                    <label className="text-xs text-gray-500">{field.label}</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input type="number" step={field.step ?? "any"} value={selectedCellData.params[field.key]} onChange={(event) => setCellParam(selectedStress.key, selectedPhase.key, field.key, event.target.value)} className="w-full rounded-lg border px-2 py-2 text-sm" />
                      <span className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700">{field.unit}</span>
                    </div>
                    {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4"><label className="text-xs text-gray-500">Assumptions / notes</label><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm" placeholder="Optional assumptions used for this mission profile." /></div>
        </aside>
      </div>

      <div className="mb-6 rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Lifetime Summary</div>
          <button
            type="button"
            onClick={generateLifetimeSummary}
            className="rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white"
          >
            Generate
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0">
            <thead><tr><th className="border-b bg-gray-50 p-2 text-left text-xs font-semibold">Stress</th><th className="border-b bg-gray-50 p-2 text-left text-xs font-semibold">Exposure Hours</th><th className="border-b bg-gray-50 p-2 text-left text-xs font-semibold">Events</th><th className="border-b bg-gray-50 p-2 text-left text-xs font-semibold">% of Life</th><th className="border-b bg-gray-50 p-2 text-left text-xs font-semibold">Dominant Phase</th></tr></thead>
            <tbody>
              {lifetimeSummary.map((row) => (
                <tr key={row.stressKey}>
                  <td className="border-b p-2 text-xs">{row.stressLabel}</td>
                  <td className="border-b p-2 text-xs">{row.totalExposureHours > 0 ? fmt(row.totalExposureHours, 2) : ""}</td>
                  <td className="border-b p-2 text-xs">{row.totalEvents > 0 ? fmt(row.totalEvents, 0) : ""}</td>
                  <td className="border-b p-2 text-xs">{row.percentOfLife !== null ? `${fmt(row.percentOfLife, 2)}%` : ""}</td>
                  <td className="border-b p-2 text-xs">{row.dominantPhaseLabel ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
