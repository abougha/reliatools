"use client";

import type { EntryMode, HaltStyle } from "./types";

type StyleStepProps = {
  entryMode: EntryMode;
  haltStyle: HaltStyle;
  onStyleChange: (style: HaltStyle) => void;
};

const styleCards: Array<{
  id: HaltStyle;
  title: string;
  lines: [string, string];
}> = [
  {
    id: "classical",
    title: "Classical HALT",
    lines: [
      "Run individual stress phases first (cold, hot, vibration).",
      "Optionally run a combined phase once limits are identified.",
    ],
  },
  {
    id: "rapid",
    title: "Rapid HALT",
    lines: [
      "Escalate stressors together in a combined timeline from the start.",
      "Useful when duty-cycle ranges already define likely operating corners.",
    ],
  },
];

export default function StyleStep({ entryMode, haltStyle, onStyleChange }: StyleStepProps) {
  const defaultStyle: HaltStyle = entryMode === "detection" ? "classical" : "rapid";

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
        Default suggestion from Step A: <span className="font-semibold">{defaultStyle === "classical" ? "Classical HALT" : "Rapid HALT"}</span>.
        You can override it below.
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {styleCards.map((card) => {
          const selected = haltStyle === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onStyleChange(card.id)}
              className={[
                "rounded-2xl border p-5 text-left transition",
                selected ? "border-blue-300 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <h3 className="mb-2 text-base font-semibold text-gray-900">{card.title}</h3>
              <p className="text-sm text-gray-700">{card.lines[0]}</p>
              <p className="mt-1 text-sm text-gray-700">{card.lines[1]}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
