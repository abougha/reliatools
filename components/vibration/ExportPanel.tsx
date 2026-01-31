import React from "react";
import type { AccelSettings, MissionProfile, ReliabilityDemo, FixtureWarning, PsdTemplate } from "@/lib/vibration/types";
import type { EquivalencyResult } from "@/lib/vibration/equivalency";
import type { FixtureEvaluation } from "@/lib/vibration/fixture";
import { resolvePsdDefinition } from "@/lib/vibration/psd";

type ExportPanelProps = {
  profile: MissionProfile;
  accel: AccelSettings;
  reliability: ReliabilityDemo;
  sampleSize: number;
  equivalency: EquivalencyResult;
  fixture: FixtureEvaluation;
  psdTemplates: Record<string, PsdTemplate>;
  warnings: FixtureWarning[];
  acknowledgment: { acknowledged: boolean; reason: string };
  onAcknowledgmentChange: (patch: { acknowledged?: boolean; reason?: string }) => void;
};

function download(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildPsdCsv(points: { f_hz: number; g2_per_hz: number }[]): string {
  const header = "f_hz,g2_per_hz";
  const rows = points.map((p) => `${p.f_hz},${p.g2_per_hz}`);
  return [header, ...rows].join("\n");
}

function buildPlaylistCsv(profile: MissionProfile, templates: Record<string, PsdTemplate>): string {
  const header = "state,f_hz,g2_per_hz";
  const rows: string[] = [];
  profile.states.forEach((state) => {
    const points = resolvePsdDefinition(state.psd, templates);
    points.forEach((point) => rows.push(`${state.name},${point.f_hz},${point.g2_per_hz}`));
  });
  return [header, ...rows].join("\n");
}

function buildFixtureHtml(fixture: FixtureEvaluation, warnings: FixtureWarning[]): string {
  const warningItems = warnings
    .map((w) => `<li><strong>${w.level}:</strong> ${w.message}</li>`)
    .join("");
  const checklistItems = fixture.checklist.map((item) => `<li>${item}</li>`).join("");
  return `
  <html>
    <head>
      <title>Fixture Requirements</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
        h1 { font-size: 20px; margin-bottom: 8px; }
        h2 { font-size: 14px; margin-top: 20px; }
        .card { border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; margin-top: 12px; }
        ul { padding-left: 18px; }
        .muted { color: #6b7280; }
      </style>
    </head>
    <body>
      <h1>Fixture Requirements</h1>
      <div class="muted">Generated from Vibration + Thermal Cycling Wizard.</div>
      <div class="card">
        <h2>Targets</h2>
        <div>Fixture frequency min: ${fixture.f_fixture_min.toFixed(1)} Hz</div>
        <div>Mass ratio: ${fixture.massRatio ? fixture.massRatio.toFixed(1) + "x" : "target " + fixture.targetFixtureMass_kg?.toFixed(1) + " kg"}</div>
        ${fixture.k_fixture_min ? `<div>Stiffness target: ${fixture.k_fixture_min.toExponential(2)} N/m</div>` : ""}
        ${fixture.thickness_mm ? `<div>Plate thickness estimate: ${fixture.thickness_mm.toFixed(1)} mm</div>` : ""}
      </div>
      <div class="card">
        <h2>Warnings</h2>
        <ul>${warningItems || "<li>No warnings</li>"}</ul>
      </div>
      <div class="card">
        <h2>Checklist</h2>
        <ul>${checklistItems}</ul>
      </div>
      <div class="muted" style="margin-top:16px;">Use browser Print -> Save as PDF.</div>
    </body>
  </html>
  `;
}

export function ExportPanel({
  profile,
  accel,
  reliability,
  sampleSize,
  equivalency,
  fixture,
  psdTemplates,
  warnings,
  acknowledgment,
  onAcknowledgmentChange,
}: ExportPanelProps) {
  const criticalWarnings = warnings.filter((warning) => warning.level === "Critical");
  const requiresAck = criticalWarnings.length > 0;
  const canExport = !requiresAck || (acknowledgment.acknowledged && acknowledgment.reason.trim().length >= 5);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 text-sm font-semibold">Export</div>
      <div className="text-xs text-gray-500">
        Export playlist PSD by default, plus equivalent test PSD and JSON summary.
      </div>

      {requiresAck && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <div className="font-semibold">Critical warnings detected</div>
          <div className="mt-1">Acknowledge and document a reason before exporting.</div>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={acknowledgment.acknowledged}
              onChange={(e) => onAcknowledgmentChange({ acknowledged: e.target.checked })}
            />
            Acknowledge critical warnings
          </label>
          <textarea
            className="mt-2 w-full rounded-lg border px-2 py-1 text-xs"
            rows={2}
            placeholder="Reason for proceeding..."
            value={acknowledgment.reason}
            onChange={(e) => onAcknowledgmentChange({ reason: e.target.value })}
          />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => download("psd_playlist.csv", buildPlaylistCsv(profile, psdTemplates), "text/csv")}
          className="rounded-lg border px-3 py-2 text-xs font-medium"
          disabled={!canExport}
        >
          Export PSD Playlist CSV
        </button>
        <button
          type="button"
          onClick={() => download("psd_test_profile.csv", buildPsdCsv(equivalency.testPsd), "text/csv")}
          className="rounded-lg border px-3 py-2 text-xs font-medium"
          disabled={!canExport}
        >
          Export Test PSD CSV
        </button>
        <button
          type="button"
          onClick={() =>
            download(
              "vibration_profile.json",
              JSON.stringify(
                {
                  profile,
                  accel,
                  reliability,
                  sampleSize,
                  equivalency,
                  fixture,
                },
                null,
                2
              ),
              "application/json"
            )
          }
          className="rounded-lg border px-3 py-2 text-xs font-medium"
          disabled={!canExport}
        >
          Export JSON Summary
        </button>
        <button
          type="button"
          onClick={() => {
            const popup = window.open("", "_blank", "width=800,height=700");
            if (!popup) return;
            popup.document.write(buildFixtureHtml(fixture, warnings));
            popup.document.close();
            popup.focus();
          }}
          className="rounded-lg border px-3 py-2 text-xs font-medium"
          disabled={!canExport}
        >
          Printable Fixture Requirements
        </button>
      </div>

      <div className="mt-3 text-[11px] text-gray-500">
        Acceptance rule: test {sampleSize} units for {equivalency.t_test_h.toFixed(1)} h each; accept if failures &le;{" "}
        {reliability.c_allowed}.
      </div>
    </div>
  );
}
