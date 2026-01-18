"use client";

import type { ReactNode } from "react";

export type TabKey = "setup" | "components" | "summary" | "export";

export function Tabs(props: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  items: Array<{ key: TabKey; label: string; badge?: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-2">
      {props.items.map((it) => {
        const active = props.active === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => props.onChange(it.key)}
            className={[
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-black text-white" : "text-neutral-700 hover:bg-neutral-100",
            ].join(" ")}
          >
            {it.label}
            {it.badge ? (
              <span className={active ? "rounded-full bg-white/20 px-2 py-0.5 text-xs" : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs"}>
                {it.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel(props: { active: boolean; children: ReactNode }) {
  if (!props.active) return null;
  return <div className="mt-4">{props.children}</div>;
}
