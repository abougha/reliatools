"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";

/**
 * RBD Generator — Single-file page component
 * Drop in: app/tools/rbd/page.tsx
 *
 * Features
 * - Editable input table (Component Name, Type, Parent, Reliability)
 * - Parent is a dropdown built from Component Names (excludes self)
 * - Inline warning if parent appears after child in the table
 * - Generate button computes + renders; no auto-compute while typing
 * - Auto-reorder on Generate so parents appear before children
 * - Reliability math: Block (given), Series (product), Parallel (1 - Π(1 - r))
 * - SVG diagram showing only reachable subgraph; Summary greys out orphans
 * - Overall reliability badge on SVG; decimals follow user input precision
 * - CSV Import/Export (input), CSV Export (summary), PNG export (diagram)
 */

type RbdType = "Block" | "Series" | "Parallel";

interface Row {
  name: string;
  type: RbdType | "";
  parent: string;           // blank for root
  reliability?: string;     // string for input; parsed later
}

interface Node {
  name: string;
  type: RbdType;
  parent?: string;          // blank/undefined for root
  reliability?: number;     // for Block only
  children: Node[];
  computed?: number;        // computed reliability
}

const ALLOWED_TYPES: RbdType[] = ["Block", "Series", "Parallel"];

const EXAMPLE_ROWS: Row[] = [
  { name: "System", type: "Series", parent: "", reliability: "" },
  { name: "Subsystem1", type: "Parallel", parent: "System", reliability: "" },
  { name: "Subsystem2", type: "Parallel", parent: "System", reliability: "" },
  { name: "Component A", type: "Block", parent: "Subsystem1", reliability: "0.9" },
  { name: "Component B", type: "Block", parent: "Subsystem1", reliability: "0.8" },
  { name: "Component C", type: "Block", parent: "Subsystem2", reliability: "0.85" },
  { name: "Component D", type: "Block", parent: "Subsystem2", reliability: "0.75" },
];

function clamp01(x: number): number {
  if (Number.isNaN(x)) return x;
  return Math.max(0, Math.min(1, x));
}

function csvEscape(v: string) {
  if (v.includes(",") || v.includes("\n") || v.includes("\"")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function toCSV(rows: Row[]): string {
  const header = ["Component Name", "Type", "Parent", "Reliability"].join(",");
  const lines = rows.map((r) =>
    [r.name, r.type, r.parent, r.reliability ?? ""]
      .map((v) => csvEscape(String(v ?? "")))
      .join(",")
  );
  return [header, ...lines].join("\n");
}

function fromCSV(text: string): Row[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase().replace(/\s+/g, "");
  const hasHeader = header.includes("componentname") && header.includes("type") && header.includes("parent");
  const body = hasHeader ? lines.slice(1) : lines;

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else { inQ = false; }
        } else cur += ch;
      } else {
        if (ch === ",") { out.push(cur); cur = ""; }
        else if (ch === '"') inQ = true;
        else cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const rows: Row[] = body.map((line) => {
    const cols = parseLine(line);
    const [name = "", type = "", parent = "", reliability = ""] = cols;
    return { name, type: type as Row["type"], parent, reliability };
  });
  return rows;
}

function buildTree(rows: Row[]): { root?: Node; nodes: Record<string, Node>; errors: string[] } {
  const errors: string[] = [];
  const nameSet = new Set<string>();
  const nameIndex = new Map<string, number>();

  // Basic checks
  for (const [i, r] of rows.entries()) {
    if (!r.name) errors.push(`Row ${i + 1}: Component Name is required.`);
    if (nameSet.has(r.name)) errors.push(`Row ${i + 1}: Duplicate Component Name "${r.name}".`);
    nameSet.add(r.name);
    nameIndex.set(r.name, i);

    if (!r.type || !ALLOWED_TYPES.includes(r.type as RbdType)) {
      errors.push(`Row ${i + 1}: Type must be one of ${ALLOWED_TYPES.join(", ")}.`);
    }

    if (r.type === "Block") {
      const val = (r.reliability ?? "").trim();
      if (val === "") errors.push(`Row ${i + 1}: Reliability is required for Block.`);
      const num = Number(val);
      if (Number.isNaN(num) || num < 0 || num > 1) errors.push(`Row ${i + 1}: Reliability must be a number between 0 and 1.`);
    } else {
      if ((r.reliability ?? "").trim() !== "" && Number(r.reliability) !== 0) {
        errors.push(`Row ${i + 1}: Reliability should be blank (or 0) for Series/Parallel rows.`);
      }
    }
  }

  // Root checks
  const roots = rows.filter((r) => (r.parent ?? "").trim() === "");
  if (roots.length === 0) errors.push("No root found. Add a top-level system row with blank Parent.");
  if (roots.length > 1) errors.push(`Multiple roots found: ${roots.map((r) => r.name).join(", ")}. Exactly one root is required.`);

  // Parent existence + order
  for (const [i, r] of rows.entries()) {
    if ((r.parent ?? "").trim() !== "" && !nameSet.has(r.parent)) {
      errors.push(`Row ${i + 1}: Parent "${r.parent}" not found (case-sensitive).`);
    } else if ((r.parent ?? "").trim() !== "") {
      const pIdx = nameIndex.get(r.parent!);
      if (typeof pIdx === "number" && pIdx > i) {
        errors.push(`Row ${i + 1}: Parent "${r.parent}" appears after this row. Move the parent above the child.`);
      }
    }
  }

  // Node map
  const nodes: Record<string, Node> = {};
  for (const r of rows) {
    nodes[r.name] = {
      name: r.name,
      type: (r.type as RbdType) || "Series",
      parent: (r.parent ?? "") || undefined,
      reliability: r.type === "Block" ? clamp01(Number(r.reliability)) : undefined,
      children: [],
    };
  }

  // Attach children
  Object.values(nodes).forEach((n) => {
    if (n.parent) {
      const p = nodes[n.parent];
      if (p) p.children.push(n);
    }
  });

  const root = roots.length === 1 ? nodes[roots[0].name] : undefined;

  // Cycle/orphan checks
  if (root) {
    const seen = new Set<string>();
    const stack = new Set<string>();
    let hasCycle = false;

    const dfs = (n: Node) => {
      if (stack.has(n.name)) { hasCycle = true; return; }
      if (seen.has(n.name)) return;
      seen.add(n.name);
      stack.add(n.name);
      n.children.forEach(dfs);
      stack.delete(n.name);
    };
    dfs(root);

    if (hasCycle) errors.push("Hierarchy contains a cycle. Check Parent relationships.");

    const allNames = new Set(Object.keys(nodes));
    if (seen.size !== allNames.size) {
      const unseen = [...allNames].filter((n) => !seen.has(n));
      if (unseen.length > 0) errors.push(`Orphan rows not reachable from root: ${unseen.join(", ")}.`);
    }
  }

  return { root, nodes, errors };
}

function computeReliability(node: Node): number {
  if (node.type === "Block") return node.reliability ?? 0;
  if (node.children.length === 0) return node.type === "Series" ? 1 : 0;
  const childRs = node.children.map((c) => {
    c.computed = computeReliability(c);
    return c.computed!;
  });
  if (node.type === "Series") return childRs.reduce((acc, r) => acc * r, 1);
  const prod = childRs.reduce((acc, r) => acc * (1 - r), 1);
  return 1 - prod;
}

// Simple tree layout
function layoutTree(root: Node, xGap = 160, yGap = 120) {
  const leaves: string[] = [];
  const positions = new Map<string, { x: number; y: number; depth: number }>();

  const depthMap = new Map<string, number>();
  const dfsDepth = (n: Node, d: number) => {
    depthMap.set(n.name, d);
    n.children.forEach((c) => dfsDepth(c, d + 1));
  };
  dfsDepth(root, 0);

  const assignLeaves = (n: Node) => {
    if (n.children.length === 0) { leaves.push(n.name); return; }
    n.children.forEach(assignLeaves);
  };
  assignLeaves(root);

  const leafOrder = new Map<string, number>();
  leaves.sort().forEach((nm, i) => leafOrder.set(nm, i));

  const xMap = new Map<string, number>();
  const computeX = (n: Node): number => {
    if (n.children.length === 0) return (leafOrder.get(n.name)! + 1) * xGap;
    const xs = n.children.map(computeX);
    const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
    xMap.set(n.name, avg);
    return avg;
  };
  const rootX = computeX(root);

  const maxDepth = Math.max(...[...depthMap.values()]);
  const yForDepth = (d: number) => (d + 1) * yGap;

  const setPositions = (n: Node) => {
    const x = n.children.length === 0 ? (leafOrder.get(n.name)! + 1) * xGap : xMap.get(n.name) ?? rootX;
    const y = yForDepth(depthMap.get(n.name) ?? 0);
    positions.set(n.name, { x, y, depth: depthMap.get(n.name) ?? 0 });
    n.children.forEach(setPositions);
  };
  setPositions(root);

  const width = Math.max((leaves.length + 2) * xGap, 640);
  const height = (maxDepth + 2) * yGap + 40;

  return { positions, width, height };
}

function countDecimalsFromString(s?: string) {
  if (!s) return 0;
  const str = String(s);
  const i = str.indexOf(".");
  return i >= 0 ? str.length - i - 1 : 0;
}

function numberFmtDec(n?: number, decimals: number = 2) {
  if (n === undefined || Number.isNaN(n)) return "";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function RbdGeneratorPage() {
  const [rows, setRows] = useState<Row[]>(EXAMPLE_ROWS);

  // Computation gated by "Generate"
  const [generated, setGenerated] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [root, setRoot] = useState<Node | undefined>(undefined);
  const [nodes, setNodes] = useState<Record<string, Node>>({});
  const [overall, setOverall] = useState<number | undefined>(undefined);
  const [reachable, setReachable] = useState<Set<string>>(new Set());
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Precision from user input
  const decimals = useMemo(() => {
    const d = rows
      .filter((r) => r.type === "Block" && (r.reliability ?? "").trim() !== "")
      .map((r) => countDecimalsFromString(r.reliability))
      .reduce((a, b) => Math.max(a, b), 0);
    return d > 0 ? d : 2;
  }, [rows]);

  // For Parent dropdown: unique names (non-empty) in current table
  const nameOrder = useMemo(() => rows.map((r) => (r.name || "").trim()).filter(Boolean), [rows]);

  const resetComputed = () => {
    setGenerated(false);
    setOverall(undefined);
    setRoot(undefined);
    setNodes({});
    setReachable(new Set());
    setErrors([]);
  };

  const handleChange = (idx: number, key: keyof Row, val: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
    resetComputed();
  };

  const addRow = () => {
    setRows((prev) => [...prev, { name: "", type: "", parent: "", reliability: "" }]);
    resetComputed();
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    resetComputed();
  };

  const clearAll = () => {
    setRows([{ name: "System", type: "Series", parent: "", reliability: "" }]);
    resetComputed();
  };

  const loadExample = () => {
    setRows(EXAMPLE_ROWS);
    resetComputed();
  };

  const generate = useCallback(() => {
    // --- Step 1: Auto-reorder rows so parents appear before children (topological-ish order)
    const orderMap = new Map<string, string[]>(); // parent -> children names
    const trimmedRows = rows.map((r) => ({
      ...r,
      name: (r.name || "").trim(),
      parent: (r.parent || "").trim(),
    }));

    trimmedRows.forEach((r) => {
      const parentKey = r.parent; // "" for root
      if (!orderMap.has(parentKey)) orderMap.set(parentKey, []);
      orderMap.get(parentKey)!.push(r.name);
    });

    const sorted: Row[] = [];
    const visited = new Set<string>();

    const dfs = (parentKey: string) => {
      const children = orderMap.get(parentKey) || [];
      for (const childName of children) {
        if (visited.has(childName)) continue;
        visited.add(childName);
        const original = rows.find((rr) => (rr.name || "").trim() === childName);
        if (original) {
          sorted.push(original);
          dfs(childName);
        }
      }
    };

    // Start with roots (blank parent). If multiple, they’ll be grouped.
    dfs("");

    // Append any stragglers (orphans, unknown parents)
    rows.forEach((r) => {
      const nm = (r.name || "").trim();
      if (!visited.has(nm)) sorted.push(r);
    });

    const reordered = sorted.length === rows.length ? sorted : rows;
    if (reordered !== rows) setRows(reordered);

    // --- Step 2: Build tree & compute from reordered rows
    const { root, nodes, errors } = buildTree(reordered);
    setErrors(errors);
    setNodes(nodes);
    setRoot(root);

    if (errors.length === 0 && root) {
      const r = computeReliability(root);
      root.computed = r;
      setOverall(r);

      // Reachable set for greying out orphans
      const set = new Set<string>();
      const stack: Node[] = [root];
      while (stack.length) {
        const n = stack.pop()!;
        if (set.has(n.name)) continue;
        set.add(n.name);
        n.children.forEach((c) => stack.push(c));
      }
      setReachable(set);
    } else {
      setOverall(undefined);
      setReachable(new Set());
    }

    setGenerated(true);
  }, [rows]);

  // CSV I/O
  const importCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      try {
        const parsed = fromCSV(text);
        setRows(parsed);
        resetComputed();
      } catch {
        alert("Failed to parse CSV. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const download = (filename: string, text: string, type = "text/plain") => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => download("rbd-input.csv", toCSV(rows), "text/csv");

  const exportSummaryCSV = () => {
    if (!generated) return;
    const list = Object.values(nodes).map((n) => ({
      name: n.name,
      type: n.type,
      parent: n.parent ?? "",
      reliability_input: n.type === "Block" ? String(n.reliability ?? "") : "",
      reliability_computed: n.computed ?? computeReliability(n),
    }));
    const header = [
      "Component Name",
      "Type",
      "Parent",
      "Reliability (input)",
      "Reliability (computed)",
    ].join(",");
    const lines = list
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) =>
        [r.name, r.type, r.parent, r.reliability_input, r.reliability_computed.toString()]
          .map((v) => csvEscape(String(v ?? "")))
          .join(",")
      );
    download("rbd-summary.csv", [header, ...lines].join("\n"), "text/csv");
  };

  const downloadPng = () => {
    if (!generated || !svgRef.current) return;
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svg.viewBox.baseVal.width || svg.clientWidth;
      canvas.height = svg.viewBox.baseVal.height || svg.clientHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "rbd-diagram.png";
        a.click();
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reliability Block Diagram (RBD) Generator</h1>
          <p className="text-sm text-gray-600">Build an RBD from a simple table, visualize the hierarchy, and compute overall system reliability.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadExample} className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200">Load Example</button>
          <button onClick={clearAll} className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200">Clear</button>
          <button onClick={exportCSV} className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200">Export Input CSV</button>
          <button onClick={exportSummaryCSV} disabled={!generated} className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-50">Export Summary CSV</button>
          <button onClick={downloadPng} disabled={!generated} className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-50">Download Diagram PNG</button>
          <label className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer">
            Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files && importCSV(e.target.files[0])} />
          </label>
        </div>
      </header>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">1) Input Table</h2>
        <p className="mb-4 text-sm text-gray-600">
          Columns (in order): <strong>Component Name</strong>, <strong>Type</strong> (Block, Series, Parallel),
          <strong> Parent</strong> (blank for root), <strong>Reliability</strong> (0–1, only for Block).
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white border-b px-3 py-2 text-left w-[22rem]">Component Name</th>
                <th className="border-b px-3 py-2 text-left w-40">Type</th>
                <th className="border-b px-3 py-2 text-left w-[18rem]">Parent</th>
                <th className="border-b px-3 py-2 text-left w-40">Reliability (0–1)</th>
                <th className="border-b px-3 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="odd:bg-slate-50">
                  <td className="sticky left-0 z-0 bg-inherit border-b px-3 py-2">
                    <input
                      className="w-full rounded-md border px-2 py-1"
                      value={r.name}
                      onChange={(e) => handleChange(i, "name", e.target.value)}
                      placeholder="e.g., System, Subsystem1, Component A"
                    />
                  </td>
                  <td className="border-b px-3 py-2">
                    <select
                      className="w-full rounded-md border px-2 py-1"
                      value={r.type}
                      onChange={(e) => handleChange(i, "type", e.target.value)}
                    >
                      <option value="">Select...</option>
                      {ALLOWED_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b px-3 py-2">
                    <select
                      className="w-full rounded-md border px-2 py-1"
                      value={r.parent}
                      onChange={(e) => handleChange(i, "parent", e.target.value)}
                    >
                      <option value="">(none — root)</option>
                      {nameOrder
                        .filter((nm) => nm !== r.name)
                        .map((nm) => {
                          const pIdx = nameOrder.indexOf(nm);
                          const isAfter = pIdx > i;
                          const label = isAfter ? `${nm} (after this row)` : nm;
                          return (
                            <option key={nm} value={nm} title={isAfter ? "Parent appears after this row" : undefined}>
                              {label}
                            </option>
                          );
                        })}
                    </select>
                    {r.parent && nameOrder.indexOf(r.parent) > i && (
                      <div className="mt-1 text-xs text-amber-700">
                        Warning: selected parent appears <em>after</em> this row. It will be auto-reordered on Generate.
                      </div>
                    )}
                  </td>
                  <td className="border-b px-3 py-2">
                    <input
                      className="w-full rounded-md border px-2 py-1"
                      value={r.reliability ?? ""}
                      onChange={(e) => handleChange(i, "reliability", e.target.value)}
                      placeholder={r.type === "Block" ? "0.95" : "(blank for Series/Parallel)"}
                    />
                  </td>
                  <td className="border-b px-3 py-2 text-right">
                    <button onClick={() => removeRow(i)} className="text-sm text-red-600 hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row + Generate side-by-side */}
        <div className="mt-3 flex gap-2">
          <button onClick={addRow} className="rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700">
            + Add Row
          </button>
          <button onClick={generate} className="rounded-md bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700">
            Generate
          </button>
        </div>

        {/* Only show validation after Generate */}
        {errors.length > 0 && generated && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-semibold">Validation Issues</p>
            <ul className="list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">2) Summary & Result</h2>

          <div className="flex items-baseline gap-4">
            <span className="text-sm text-gray-600">Overall System Reliability (root):</span>
            <span className="text-2xl font-bold tabular-nums">
              {generated && overall !== undefined ? numberFmtDec(overall, decimals) : "—"}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Computed from the root node (blank Parent). Series: product of children. Parallel: 1 − Π(1 − rᵢ).
          </p>

          {generated && root ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full table-fixed border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b px-3 py-2 text-left">Name</th>
                    <th className="border-b px-3 py-2 text-left">Type</th>
                    <th className="border-b px-3 py-2 text-left">Parent</th>
                    <th className="border-b px-3 py-2 text-right">Input r</th>
                    <th className="border-b px-3 py-2 text-right">Computed r</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(nodes)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((n) => {
                      const orphan = reachable.size > 0 && !reachable.has(n.name);
                      return (
                        <tr key={n.name} className={`odd:bg-slate-50 ${orphan ? "opacity-50" : ""}`}>
                          <td className="border-b px-3 py-1">{n.name}</td>
                          <td className="border-b px-3 py-1">{n.type}</td>
                          <td className="border-b px-3 py-1">{n.parent ?? ""}</td>
                          <td className="border-b px-3 py-1 text-right tabular-nums">
                            {n.type === "Block" ? numberFmtDec(n.reliability, decimals) : ""}
                          </td>
                          <td className="border-b px-3 py-1 text-right tabular-nums">
                            {n.computed !== undefined ? numberFmtDec(n.computed, decimals) : ""}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Click <strong>Generate</strong> to compute and display node reliabilities.</p>
          )}
        </div>

        <div className="lg:col-span-2 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">3) RBD Diagram</h2>

          {generated && root ? (
            (() => {
              const lt = layoutTree(root);
              const drawable = Object.values(nodes).filter(
                (n) => reachable.has(n.name) && lt.positions.has(n.name)
              );

              return (
                <div className="w-full overflow-auto">
                  <svg
                    ref={svgRef}
                    className="mx-auto block bg-white"
                    width={lt.width}
                    height={lt.height}
                    viewBox={`0 0 ${lt.width} ${lt.height}`}
                  >
                    {/* Edges */}
                    {drawable.map((n) =>
                      n.children
                        .filter((c) => reachable.has(c.name) && lt.positions.has(c.name))
                        .map((c) => {
                          const p1 = lt.positions.get(n.name)!;
                          const p2 = lt.positions.get(c.name)!;
                          return (
                            <g key={`${n.name}→${c.name}`}>
                              <line x1={p1.x} y1={p1.y + 28} x2={p2.x} y2={p2.y - 28} stroke="#334155" strokeWidth={1.5} />
                            </g>
                          );
                        })
                    )}

                    {/* Nodes */}
                    {drawable.map((n) => {
                      const pos = lt.positions.get(n.name)!;
                      const isRoot = !n.parent;
                      const fill = n.type === "Block" ? "#e2e8f0" : n.type === "Series" ? "#dbeafe" : "#dcfce7";
                      const stroke = "#1f2937";
                      return (
                        <g key={n.name}>
                          <rect
                            x={pos.x - 70}
                            y={pos.y - 28}
                            rx={10}
                            ry={10}
                            width={140}
                            height={56}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={1.5}
                            filter="url(#shadow)"
                          />
                          <text x={pos.x} y={pos.y - 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="#0f172a">
                            {n.name}
                          </text>
                          <text x={pos.x} y={pos.y + 14} textAnchor="middle" fontSize={11} fill="#334155">
                            {n.type}
                            {n.type === "Block" && n.reliability !== undefined
                              ? ` • r=${numberFmtDec(n.reliability, decimals)}`
                              : ""}
                          </text>
                          {isRoot && (
                            <text x={pos.x} y={pos.y - 36} textAnchor="middle" fontSize={11} fill="#64748b">
                              ROOT
                            </text>
                          )}
                        </g>
                      );
                    })}

                    <defs>
                      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.15" />
                      </filter>
                    </defs>

                    {/* Overall Reliability overlay */}
                    {overall !== undefined && (
                      <g>
                        <rect x={12} y={12} rx={8} ry={8} width={280} height={38} fill="#f8fafc" stroke="#cbd5e1" />
                        <text x={24} y={36} fontSize={14} fontWeight={600} fill="#0f172a">
                          Overall Reliability: {numberFmtDec(overall, decimals)}
                        </text>
                      </g>
                    )}
                  </svg>
                </div>
              );
            })()
          ) : (
            <p className="text-sm text-gray-500">Click <strong>Generate</strong> to render the diagram.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Rules Recap</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
          <li><strong>Component Name</strong> is case-sensitive and must be unique.</li>
          <li><strong>Type</strong> must be exactly one of: Block, Series, Parallel.</li>
          <li><strong>Parent</strong> is blank for the top-level system (root); otherwise, it must exactly match an existing name.</li>
          <li><strong>Reliability</strong> is required only for <em>Block</em> (0–1). Leave blank (or 0) for Series/Parallel; those are computed from children.</li>
          <li>Exactly one row must have a blank <strong>Parent</strong> (the root). All nodes must be reachable from the root. No cycles allowed.</li>
        </ul>
      </section>

      <footer className="pb-8 text-xs text-gray-500">
        <p>Tip: Use Export/Import CSV to move data between Excel and this tool. The Summary table can be exported for reports.</p>
      </footer>
    </div>
  );
}
