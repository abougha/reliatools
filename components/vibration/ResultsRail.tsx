import React from "react";
import type { FixtureWarning } from "@/lib/vibration/types";

type RailStat = { label: string; value: string; hint?: string };

type ResultsRailProps = {
  title: string;
  badge?: string;
  stats?: RailStat[];
  warnings?: FixtureWarning[];
};

const levelStyles: Record<FixtureWarning["level"], string> = {
  Info: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Caution: "text-amber-700 bg-amber-50 border-amber-200",
  Critical: "text-red-700 bg-red-50 border-red-200",
};

const levelIcons: Record<FixtureWarning["level"], string> = {
  Info: "OK",
  Caution: "!",
  Critical: "X",
};

export function ResultsRail({ title, badge, stats, warnings }: ResultsRailProps) {
  const criticalCount = warnings?.filter((w) => w.level === "Critical").length ?? 0;
  const badgeText = badge ?? (criticalCount > 0 ? "Critical" : "Ready");
  const badgeClass = criticalCount > 0 ? levelStyles.Critical : levelStyles.Info;

  return (
    <aside className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{title}</div>
          <div className={`rounded-full border px-2 py-1 text-[11px] font-medium ${badgeClass}`}>{badgeText}</div>
        </div>
        {stats && stats.length > 0 && (
          <div className="mt-3 space-y-2 text-sm">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-xs text-gray-500">{stat.label}</div>
                <div className="font-medium">{stat.value}</div>
                {stat.hint && <div className="text-[11px] text-gray-400">{stat.hint}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 text-sm font-semibold">Warnings</div>
        {warnings && warnings.length > 0 ? (
          <div className="space-y-2 text-sm">
            {warnings.map((warning, index) => (
              <div
                key={`${warning.level}-${index}`}
                className={`flex items-start gap-2 rounded-lg border px-2 py-2 text-xs ${levelStyles[warning.level]}`}
              >
                <span className="text-sm">{levelIcons[warning.level]}</span>
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">No warnings yet.</div>
        )}
      </div>
    </aside>
  );
}
