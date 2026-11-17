// app/tools/Derating/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ComponentType, DeratingNavigatorState, ComponentRecord } from "@/lib/derating/models";
import { addComponent, createInitialState } from "@/lib/derating/factories";
import { orchestrate } from "@/lib/derating/orchestrate";
import { loadRulesFromApi } from "@/lib/derating/loadRules";

import { ComponentEditor } from "./ComponentEditor";
import { ResultsSummary, type SummaryRow } from "./ResultsSummary";
import { ExportPanel } from "./ExportPanel";
import { Tabs, TabPanel, type TabKey } from "./Tabs";
import ContactCTA from "@/components/ContactCTA";
import RelatedLinks from "@/components/RelatedLinks";

const ALL_COMPONENT_TYPES: ComponentType[] = [
    "Silicon: Digital MOS",
    "Resistor",
    "Resistor Variable",
    "Fixed, film, chip (PD < 1 W)",
    "Transistor",
    "Diode Signal",
    "Capacitor",
    "Transformer",
    "Relays",
    "Switches",
    "Bearings",
    "Springs",
    "Seals",
];

export default function DeratingToolPage() {
    const [tab, setTab] = useState<TabKey>("setup");
    const [state, setState] = useState<DeratingNavigatorState>(() => createInitialState());
    const [loadingRules, setLoadingRules] = useState(true);
    const [ruleLoadError, setRuleLoadError] = useState<string | null>(null);

    const [newType, setNewType] = useState<ComponentType>("Resistor");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // scroll-to editor
    const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // ----- Load rules once -----
    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoadingRules(true);
                setRuleLoadError(null);

                const rules = await loadRulesFromApi();
                if (!alive) return;

                // Keep any existing edits; just inject rules + recompute
                setState((prev) =>
                    orchestrate({
                        ...prev,
                        rules,
                    })
                );
            } catch (e: any) {
                if (!alive) return;
                setRuleLoadError(e?.message ?? "Failed to load rules.");
            } finally {
                if (!alive) return;
                setLoadingRules(false);
            }
        })();

        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ----- Derived summary rows (Option A: strongly typed) -----
    const summaryRows: SummaryRow[] = useMemo(() => {
        return state.components.map((c): SummaryRow => {
            const match: SummaryRow["match"] =
                c.rule.matchedRuleId ? "Exact" : c.rule.effectiveRuleId ? "Fallback" : "None";

            return {
                id: c.id,
                refDes: c.refDes,
                type: c.componentType,
                match,
                effectiveRuleId: c.rule.effectiveRuleId ?? c.rule.matchedRuleId ?? "—",
                parameter: c.results?.parameterDerated ?? c.rule.effectiveRule?.parameterDerated ?? "—",
                status: c.results?.status ?? "Attention",
                limiting: c.results?.worst?.limitingCheckKey ?? "—",
            };
        });
    }, [state.components]);

    // ----- Actions -----
    function onAddComponent() {
        const withAdded = addComponent(state, newType);
        const next = orchestrate(withAdded);
        setState(next);

        const added = next.components[next.components.length - 1];
        if (added) {
            setSelectedId(added.id);
            setTab("components");
            setTimeout(() => {
                editorRefs.current[added.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
        }
    }

    function onRemove(id: string) {
        const next = orchestrate({
            ...state,
            components: state.components.filter((c) => c.id !== id),
        });
        setState(next);
        if (selectedId === id) setSelectedId(null);
    }

    function onPatch(id: string, patch: Partial<Omit<ComponentRecord, "id">>) {
        const next = orchestrate({
            ...state,
            components: state.components.map((c) => (c.id === id ? ({ ...c, ...patch } as ComponentRecord) : c)),
        });
        setState(next);
    }

    function onUpdateMeta(field: "projectName" | "productName" | "owner" | "dateISO", value: string) {
        setState(orchestrate({ ...state, meta: { ...state.meta, [field]: value } }));
    }

    function onUpdateSettings<K extends keyof DeratingNavigatorState["settings"]>(
        key: K,
        value: DeratingNavigatorState["settings"][K]
    ) {
        setState(orchestrate({ ...state, settings: { ...state.settings, [key]: value } }));
    }

    function onUpdateTargets<K extends keyof DeratingNavigatorState["targets"]>(
        key: K,
        value: DeratingNavigatorState["targets"][K]
    ) {
        setState(orchestrate({ ...state, targets: { ...state.targets, [key]: value } }));
    }

    function jumpToComponent(id: string) {
        setSelectedId(id);
        setTab("components");
        setTimeout(() => editorRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }

    // ----- Tabs -----
    const tabItems = useMemo(
        () => [
            { key: "setup" as const, label: "Setup" },
            { key: "components" as const, label: "Components", badge: String(state.components.length) },
            { key: "summary" as const, label: "Summary" },
            { key: "export" as const, label: "Export" },
        ],
        [state.components.length]
    );

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Component Derating Navigator</h1>
                <p className="mt-2 text-sm text-neutral-600">
                    Check whether each part is loaded safely below its rating. Derating means running a part at less
                    than its rated voltage, power, current or temperature so it lasts longer.
                </p>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-neutral-700">
                    <li><strong>Setup</strong>: choose the application category. The defaults are fine to start.</li>
                    <li><strong>Components</strong>: add each part and enter its rated and applied values.</li>
                    <li><strong>Summary</strong>: see which parts pass, need attention or fail, then export.</li>
                </ol>
            </div>

            <Tabs active={tab} onChange={setTab} items={tabItems} />

            {/* SETUP TAB */}
            <TabPanel active={tab === "setup"}>
                <div className="mb-6 rounded-xl border bg-white p-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <div className="font-medium">Rule Library</div>
                            <div className="text-neutral-600">
                                {loadingRules
                                    ? "Loading rules..."
                                    : ruleLoadError
                                        ? "Failed to load."
                                        : `Loaded ${state.rules.length} rules.`}
                            </div>
                        </div>

                        {!loadingRules && !ruleLoadError && (
                            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Ready</div>
                        )}
                        {!loadingRules && ruleLoadError && (
                            <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">Error</div>
                        )}
                    </div>

                    {ruleLoadError && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            <div className="font-medium">Rule load error</div>
                            <div className="mt-1">{ruleLoadError}</div>
                            <div className="mt-2 text-xs text-red-700">
                                Reload the page to try again. If it keeps happening, please contact us.
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Meta */}
                    <div className="rounded-xl border bg-white p-4">
                        <div className="mb-3 text-sm font-medium">Project details (optional)</div>

                        <label className="block text-xs text-neutral-600">Project Name</label>
                        <input
                            className="mb-3 mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            value={state.meta.projectName ?? ""}
                            onChange={(e) => onUpdateMeta("projectName", e.target.value)}
                            placeholder="e.g., Power Module Rev B"
                        />

                        <label className="block text-xs text-neutral-600">Product Name</label>
                        <input
                            className="mb-3 mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            value={state.meta.productName ?? ""}
                            onChange={(e) => onUpdateMeta("productName", e.target.value)}
                            placeholder="e.g., ECU Controller"
                        />

                        <label className="block text-xs text-neutral-600">Owner</label>
                        <input
                            className="mb-3 mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            value={state.meta.owner ?? ""}
                            onChange={(e) => onUpdateMeta("owner", e.target.value)}
                            placeholder="e.g., Your Name"
                        />

                        <label className="block text-xs text-neutral-600">Date</label>
                        <input
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            type="date"
                            value={state.meta.dateISO ?? ""}
                            onChange={(e) => onUpdateMeta("dateISO", e.target.value)}
                        />
                    </div>

                    {/* Settings */}
                    <div className="rounded-xl border bg-white p-4">
                        <div className="mb-3 text-sm font-medium">Settings</div>

                        <label className="block text-xs text-neutral-600">Application Category</label>
                        <select
                            className="mb-3 mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            value={state.settings.applicationCategory}
                            onChange={(e) => onUpdateSettings("applicationCategory", e.target.value as any)}
                        >
                            {["Commercial", "Defence/Industry", "Military/Aerospace", "Space", "Mechanical"].map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>

                        <label className="block text-xs text-neutral-600">Quality Class</label>
                        <select
                            className="mb-3 mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            value={state.settings.qualityClass}
                            onChange={(e) => onUpdateSettings("qualityClass", e.target.value as any)}
                        >
                            {["Class 1 (Verified Pedigree)", "Class 1 (Standard)", "Class 2", "Not specified"].map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>

                        <label className="block text-xs text-neutral-600">Temp Unit</label>
                        <select
                            className="mb-3 mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            value={state.settings.tempUnit}
                            onChange={(e) => onUpdateSettings("tempUnit", e.target.value as any)}
                        >
                            {["C", "F"].map((v) => (
                                <option key={v} value={v}>
                                    °{v}
                                </option>
                            ))}
                        </select>

                        <label className="block text-xs text-neutral-600">Mechanical Units</label>
                        <select
                            className="mb-3 mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            value={state.settings.mechanicalUnits}
                            onChange={(e) => onUpdateSettings("mechanicalUnits", e.target.value as any)}
                        >
                            {["Metric", "Imperial"].map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={state.settings.requireExactRuleMatch}
                                onChange={(e) => onUpdateSettings("requireExactRuleMatch", e.target.checked as any)}
                            />
                            Only use an exact rule match
                        </label>
                        <p className="mt-1 text-xs text-neutral-500">
                            When off, a part with no exact rule for your category and quality class uses the closest
                            stricter rule instead.
                        </p>
                    </div>

                    {/* Targets */}
                    <div className="rounded-xl border bg-white p-4">
                        <div className="mb-3 text-sm font-medium">Pass targets</div>

                        <label className="block text-xs text-neutral-600">Minimum design margin after derating (DM)</label>
                        <input
                            className="mb-3 mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            type="number"
                            step="0.01"
                            min={0}
                            max={0.99}
                            value={state.targets.minDeratedDM}
                            onChange={(e) => onUpdateTargets("minDeratedDM", Number(e.target.value))}
                        />
                        <p className="-mt-2 mb-3 text-xs text-neutral-500">
                            As a fraction: 0.2 means the applied stress must sit at least 20% below the derated limit.
                        </p>

                        <label className="block text-xs text-neutral-600">Minimum factor of safety (FOS)</label>
                        <input
                            className="mb-3 mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            type="number"
                            step="0.01"
                            min={1}
                            value={state.targets.minDeratedFOS}
                            onChange={(e) => onUpdateTargets("minDeratedFOS", Number(e.target.value))}
                            disabled={!state.targets.decoupleDMFOS}
                        />
                        <label className="mb-3 flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={state.targets.decoupleDMFOS}
                                onChange={(e) => onUpdateTargets("decoupleDMFOS", e.target.checked)}
                            />
                            Set factor of safety separately from margin
                        </label>

                        <label className="block text-xs text-neutral-600">Minimum temperature margin (°C)</label>
                        <input
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            type="number"
                            step="1"
                            min={0}
                            value={state.targets.minTempMarginC}
                            onChange={(e) => onUpdateTargets("minTempMarginC", Number(e.target.value))}
                        />
                    </div>
                </div>
            </TabPanel>

            {/* COMPONENTS TAB */}
            <TabPanel active={tab === "components"}>
                <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
                    <div className="min-w-[260px]">
                        <label className="block text-xs text-neutral-600">Component type</label>
                        <select
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            value={newType}
                            onChange={(e) => setNewType(e.target.value as ComponentType)}
                        >
                            {ALL_COMPONENT_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        onClick={onAddComponent}
                        disabled={loadingRules || !!ruleLoadError}
                    >
                        Add component
                    </button>

                    <div className="ml-auto text-sm">
                        <span className="font-medium">Overall:</span>{" "}
                        <span
                            className={
                                state.overall.status === "Pass"
                                    ? "text-emerald-700"
                                    : state.overall.status === "Fail"
                                        ? "text-red-700"
                                        : "text-amber-700"
                            }
                        >
                            {state.overall.status}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {state.components.length === 0 ? (
                        <div className="rounded-xl border bg-white p-6 text-sm text-neutral-600">
                            No components yet. Choose a component type above and select &ldquo;Add component&rdquo;.
                        </div>
                    ) : (
                        state.components.map((c) => (
                            <div
                                key={c.id}
                                ref={(el) => {
                                    editorRefs.current[c.id] = el;
                                }}
                                className={selectedId === c.id ? "rounded-xl ring-2 ring-black/10" : ""}
                                onClick={() => setSelectedId(c.id)}
                            >
                                <ComponentEditor component={c} allComponentTypes={ALL_COMPONENT_TYPES} onRemove={onRemove} onPatch={onPatch} />
                            </div>
                        ))
                    )}
                </div>
            </TabPanel>

            {/* SUMMARY TAB */}
            <TabPanel active={tab === "summary"}>
                <ResultsSummary state={state} rows={summaryRows} onRowClick={(id) => jumpToComponent(id)} />
            </TabPanel>

            {/* EXPORT TAB */}
            <TabPanel active={tab === "export"}>
                <ExportPanel state={state} />
            </TabPanel>
            <RelatedLinks route="/tools/Derating/" />
            <ContactCTA variant="tool" />
        </div>
    );
}
