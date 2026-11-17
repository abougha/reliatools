"use client";
import React, { useRef, useState } from "react";
import Link from "next/link";
import { Download, RotateCcw, Wand2, ImageDown, Printer, ZoomIn, ZoomOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ContactCTA from "@/components/ContactCTA";

interface PDItem { id: string; text: string }
interface PDState {
  title: string;
  signals: PDItem[];
  controls: PDItem[];
  noises: PDItem[];
  ideal: PDItem[];
  errors: PDItem[];
}

type ListKey = Exclude<keyof PDState, "title">;
type EditKey = ListKey | "diagramTitle";

const uid = () => Math.random().toString(36).slice(2, 9);
const items = (...texts: string[]): PDItem[] => texts.map((text) => ({ id: uid(), text }));

const DEFAULT_PRESET = "Industrial Motor Controller";

// Built fresh on each use so loading a preset never shares item objects with a previous edit.
const PRESETS: Record<string, () => PDState> = {
  [DEFAULT_PRESET]: () => ({
    title: "Industrial Motor Controller",
    signals: items("Motor speed command", "Load torque"),
    controls: items("PID tuning", "Thermal protection threshold"),
    noises: items("Ambient temperature", "Supply voltage variation", "Vibration"),
    ideal: items("Shaft speed accuracy", "Thermal stability"),
    errors: items("Speed deviation"),
  }),
  "Blank diagram": () => ({
    title: "System name",
    signals: [],
    controls: [],
    noises: [],
    ideal: [],
    errors: [],
  }),
};

// ---------- Layout ----------

const FONT = "Inter,system-ui,Arial";
const LINE_H = 16; // px per text line
const ITEM_GAP = 6; // px between items
const HEADER_H = 28;
const BOX_PAD = 12;

/** Break text into lines of at most `max` characters, splitting over-long words. */
function wrapText(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const rawWord of text.trim().split(/\s+/).filter(Boolean)) {
    let word = rawWord;
    while (word.length > max) {
      if (line) { lines.push(line); line = ""; }
      lines.push(word.slice(0, max));
      word = word.slice(max);
    }
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > max) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Characters that fit across a box of the given width at 11px. */
const charsFor = (width: number) => Math.max(10, Math.floor((width - 36) / 6));

function boxHeight(list: PDItem[], width: number): number {
  const max = charsFor(width);
  const textH = list.reduce((sum, it) => sum + wrapText(it.text, max).length * LINE_H + ITEM_GAP, 0);
  return HEADER_H + BOX_PAD + Math.max(textH, LINE_H) + BOX_PAD / 2;
}

/** Positions for every box, grown from the content so nothing overlaps or runs off the canvas. */
function computeLayout(state: PDState) {
  const W = 980;
  const gap = 46;
  const sysW = 220;
  const sysH = 64;
  const wLeft = 210, wTop = 280, wBot = 300, wRight = 210;

  const hNoise = boxHeight(state.noises, wTop);
  const hControl = boxHeight(state.controls, wBot);
  const hSignal = boxHeight(state.signals, wLeft);
  const hIdeal = boxHeight(state.ideal, wRight);
  const hError = boxHeight(state.errors, wRight);

  const rightStack = hIdeal + 20 + hError;
  const middleH = Math.max(sysH, hSignal, rightStack);

  const topY = 24;
  const middleTop = topY + hNoise + gap;
  const centerY = middleTop + middleH / 2;
  const botY = middleTop + middleH + gap;
  const H = botY + hControl + 24;

  const sysX = (W - sysW) / 2;
  const sysY = centerY - sysH / 2;
  const rightX = W - wRight - 36;
  const idealY = centerY - rightStack / 2;

  return {
    W, H,
    system: { x: sysX, y: sysY, w: sysW, h: sysH },
    signals: { x: 36, y: centerY - hSignal / 2, w: wLeft, h: hSignal },
    noises: { x: (W - wTop) / 2, y: topY, w: wTop, h: hNoise },
    controls: { x: (W - wBot) / 2, y: botY, w: wBot, h: hControl },
    ideal: { x: rightX, y: idealY, w: wRight, h: hIdeal },
    errors: { x: rightX, y: idealY + hIdeal + 20, w: wRight, h: hError },
  };
}

const BOX_TITLES: Record<ListKey, string> = {
  signals: "Input Signals",
  noises: "Noise Factors",
  controls: "Control Factors",
  ideal: "Ideal Function",
  errors: "Error States",
};

type DiagramProps = {
  state: PDState;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEdit: (key: EditKey, id: string | null, value: string, x: number, y: number, width: number) => void;
  onAdd: (key: ListKey, x: number, y: number, width: number) => void;
  onRemove: (key: ListKey, id: string) => void;
};

function DiagramBox({ keyName, list, box, onEdit, onAdd, onRemove }: {
  keyName: ListKey;
  list: PDItem[];
  box: { x: number; y: number; w: number; h: number };
} & Pick<DiagramProps, "onEdit" | "onAdd" | "onRemove">) {
  const { x, y, w, h } = box;
  const max = charsFor(w);
  let cursorY = y + HEADER_H + BOX_PAD;

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#fff" stroke="#111827" />
      <line x1={x} y1={y + HEADER_H} x2={x + w} y2={y + HEADER_H} stroke="#111827" />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" fontFamily={FONT} fontSize={12} fontWeight={700}>
        {BOX_TITLES[keyName]}
      </text>

      {/* Edit controls are tagged so they can be stripped from exported files. */}
      <g
        data-edit-control="true"
        role="button"
        aria-label={`Add to ${BOX_TITLES[keyName]}`}
        onClick={() => onAdd(keyName, x + 8, y + h - 4, w - 16)}
        className="cursor-pointer"
      >
        <rect x={x + w - 22} y={y + 6} width={16} height={16} rx={3} fill="#eff6ff" stroke="#bfdbfe" />
        <text x={x + w - 14} y={y + 18} textAnchor="middle" fontSize={13} fontFamily={FONT} fill="#1d4ed8">+</text>
      </g>

      {list.length === 0 ? (
        <text data-edit-control="true" x={x + 10} y={cursorY + 10} fontSize={11} fontFamily={FONT} fill="#9ca3af">
          Click + to add
        </text>
      ) : null}

      {list.map((it) => {
        const lines = wrapText(it.text, max);
        const top = cursorY;
        cursorY += lines.length * LINE_H + ITEM_GAP;
        return (
          <g key={it.id}>
            <text
              x={x + 10}
              y={top + 10}
              fontSize={11}
              fontFamily={FONT}
              className="cursor-text"
              onClick={() => onEdit(keyName, it.id, it.text, x + 8, top, w - 16)}
            >
              {lines.map((ln, i) => (
                <tspan key={i} x={x + 10} dy={i === 0 ? 0 : LINE_H}>{ln}</tspan>
              ))}
            </text>
            <g
              data-edit-control="true"
              role="button"
              aria-label={`Remove ${it.text}`}
              onClick={() => onRemove(keyName, it.id)}
              className="cursor-pointer"
            >
              <rect x={x + w - 20} y={top} width={14} height={14} rx={3} fill="#fee2e2" stroke="#fca5a5" />
              <text x={x + w - 13} y={top + 11} textAnchor="middle" fontSize={11} fontFamily={FONT} fill="#b91c1c">×</text>
            </g>
          </g>
        );
      })}
    </g>
  );
}

function DiagramSVG({ state, svgRef, onEdit, onAdd, onRemove }: DiagramProps) {
  const L = computeLayout(state);
  const sys = L.system;
  const sysCx = sys.x + sys.w / 2;
  const sysCy = sys.y + sys.h / 2;
  const titleLines = wrapText(state.title, 26);
  const titleStartY = sysCy - ((titleLines.length - 1) * 15) / 2 + 4;
  const arrow = { stroke: "#2563EB", strokeWidth: 4, markerEnd: "url(#pd-arrow)" };
  const handlers = { onEdit, onAdd, onRemove };

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`0 0 ${L.W} ${L.H}`}
      xmlns="http://www.w3.org/2000/svg"
      className="rounded-2xl border bg-white"
    >
      <defs>
        <marker id="pd-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M1,1 L7,4 L1,7 Z" fill="#2563EB" />
        </marker>
      </defs>

      <line x1={L.signals.x + L.signals.w} y1={sysCy} x2={sys.x - 4} y2={sysCy} {...arrow} />
      <line x1={sysCx} y1={L.noises.y + L.noises.h} x2={sysCx} y2={sys.y - 4} {...arrow} />
      <line x1={sysCx} y1={L.controls.y} x2={sysCx} y2={sys.y + sys.h + 4} {...arrow} />
      <line x1={sys.x + sys.w} y1={sysCy - 10} x2={L.ideal.x - 4} y2={L.ideal.y + L.ideal.h / 2} {...arrow} />
      <line x1={sys.x + sys.w} y1={sysCy + 10} x2={L.errors.x - 4} y2={L.errors.y + L.errors.h / 2} {...arrow} />

      <rect x={sys.x} y={sys.y} width={sys.w} height={sys.h} rx={6} fill="#eff6ff" stroke="#111827" strokeWidth={1.5} />
      <text
        x={sysCx}
        y={titleStartY}
        textAnchor="middle"
        fontFamily={FONT}
        fontSize={13}
        fontWeight={700}
        className="cursor-text"
        onClick={() => onEdit("diagramTitle", null, state.title, sys.x + 6, sys.y + 14, sys.w - 12)}
      >
        {titleLines.map((ln, i) => (
          <tspan key={i} x={sysCx} dy={i === 0 ? 0 : 15}>{ln}</tspan>
        ))}
      </text>

      <DiagramBox keyName="signals" list={state.signals} box={L.signals} {...handlers} />
      <DiagramBox keyName="noises" list={state.noises} box={L.noises} {...handlers} />
      <DiagramBox keyName="controls" list={state.controls} box={L.controls} {...handlers} />
      <DiagramBox keyName="ideal" list={state.ideal} box={L.ideal} {...handlers} />
      <DiagramBox keyName="errors" list={state.errors} box={L.errors} {...handlers} />
    </svg>
  );
}

// ---------- Page ----------

type EditorState = { open: boolean; key: EditKey; id: string | null; value: string; left: number; top: number; width: number };

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const Page: React.FC = () => {
  const [presetKey, setPresetKey] = useState<string>(DEFAULT_PRESET);
  const [zoom, setZoom] = useState<number>(1);
  const [data, setData] = useState<PDState>(() => PRESETS[DEFAULT_PRESET]());

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [editor, setEditor] = useState<EditorState>({ open: false, key: "diagramTitle", id: null, value: "", left: 0, top: 0, width: 220 });

  const openEditorAt = (key: EditKey, id: string | null, value: string, svgX: number, svgY: number, svgWidth: number) => {
    if (!svgRef.current || !containerRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = svgX; pt.y = svgY;
    const sp = pt.matrixTransform(ctm);
    const bounds = containerRef.current.getBoundingClientRect();
    setEditor({
      open: true, key, id, value,
      left: sp.x - bounds.left + containerRef.current.scrollLeft,
      top: sp.y - bounds.top + containerRef.current.scrollTop,
      width: Math.max(160, svgWidth * ctm.a),
    });
  };

  // Saving an empty line removes the item, so blank rows never linger in the diagram.
  const saveEditor = () => {
    if (!editor.open) return;
    const { key, id } = editor;
    const value = editor.value.trim();
    if (key === "diagramTitle") {
      setData((d) => ({ ...d, title: value || d.title }));
    } else {
      setData((d) => ({
        ...d,
        [key]: value ? d[key].map((it) => (it.id === id ? { ...it, text: value } : it)) : d[key].filter((it) => it.id !== id),
      }));
    }
    setEditor((e) => ({ ...e, open: false }));
  };

  const cancelEditor = () => {
    const { key, id } = editor;
    // Cancelling a brand-new, still-empty item discards it.
    if (key !== "diagramTitle") {
      setData((d) => ({ ...d, [key]: d[key].filter((it) => it.id !== id || it.text.trim() !== "") }));
    }
    setEditor((e) => ({ ...e, open: false }));
  };

  const addItem = (key: ListKey, x: number, y: number, width: number) => {
    const id = uid();
    setData((d) => ({ ...d, [key]: [...d[key], { id, text: "" }] }));
    openEditorAt(key, id, "", x, y, width);
  };
  const removeItem = (key: ListKey, id: string) => setData((d) => ({ ...d, [key]: d[key].filter((it) => it.id !== id) }));
  const applyPreset = () => { setEditor((e) => ({ ...e, open: false })); setData(PRESETS[presetKey]()); };
  const resetAll = () => { setEditor((e) => ({ ...e, open: false })); setPresetKey(DEFAULT_PRESET); setData(PRESETS[DEFAULT_PRESET]()); };

  /** The diagram as standalone SVG markup, without the on-screen +/× edit controls. */
  const exportMarkup = (): { src: string; width: number; height: number } | null => {
    if (!svgRef.current) return null;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll("[data-edit-control]").forEach((node) => node.remove());
    const { width, height } = svgRef.current.viewBox.baseVal;
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    clone.removeAttribute("class");
    return { src: new XMLSerializer().serializeToString(clone), width, height };
  };

  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const downloadSVG = () => {
    const out = exportMarkup();
    if (out) saveBlob(new Blob([out.src], { type: "image/svg+xml;charset=utf-8" }), "p-diagram.svg");
  };

  const downloadPNG = () => {
    const out = exportMarkup();
    if (!out) return;
    const scale = 2; // sharper output for slides and reports
    const url = URL.createObjectURL(new Blob([out.src], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = out.width * scale;
      canvas.height = out.height * scale;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => { if (blob) saveBlob(blob, "p-diagram.png"); });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const printPDF = () => {
    const out = exportMarkup();
    if (!out) return;
    const html = `<!doctype html><html><head><meta charset='utf-8'/><title>${escapeHtml(data.title)} - P-Diagram</title><style>@page{size:A4 landscape;margin:10mm}body{margin:0;font-family:Inter,system-ui,Arial}.wrap{display:flex;align-items:center;justify-content:center;width:100vw;height:100vh}svg{width:100%;height:auto;max-height:100vh}</style></head><body><div class='wrap'>${out.src}</div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
    window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank");
  };

  const toolbarButton = "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50";

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">P-Diagram Generator</h1>
          <p className="mt-1 text-gray-600 text-sm">
            Click any text in the diagram to edit it. Use <strong>+</strong> to add a line and <strong>×</strong> to remove one.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Starting template"
            value={presetKey}
            onChange={(e) => setPresetKey(e.target.value)}
            className="rounded-md border px-2.5 py-1.5 text-sm"
          >
            {Object.keys(PRESETS).map((k) => (<option key={k}>{k}</option>))}
          </select>
          <button type="button" onClick={applyPreset} className={`${toolbarButton} text-sm`}><Wand2 className="w-4 h-4" />Load</button>
          <button type="button" onClick={resetAll} className={`${toolbarButton} text-sm`}><RotateCcw className="w-4 h-4" />Reset</button>
          <div className="hidden sm:flex items-center gap-1 ml-2">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="p-2 rounded-md border bg-white hover:bg-gray-50" title="Zoom out" aria-label="Zoom out"><ZoomOut className="w-4 h-4" /></button>
            <div className="text-sm w-14 text-center">{Math.round(zoom * 100)}%</div>
            <button type="button" onClick={() => setZoom((z) => Math.min(2.0, +(z + 0.1).toFixed(2)))} className="p-2 rounded-md border bg-white hover:bg-gray-50" title="Zoom in" aria-label="Zoom in"><ZoomIn className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Diagram</CardTitle>
            <div className="flex items-center gap-2">
              <button type="button" onClick={downloadSVG} className={`${toolbarButton} text-xs`}><ImageDown className="w-4 h-4" />SVG</button>
              <button type="button" onClick={downloadPNG} className={`${toolbarButton} text-xs`}><Download className="w-4 h-4" />PNG</button>
              <button type="button" onClick={printPDF} className={`${toolbarButton} text-xs`}><Printer className="w-4 h-4" />Print / PDF</button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-auto relative" ref={containerRef}>
            {editor.open && (
              <textarea
                autoFocus
                rows={2}
                aria-label="Edit diagram text"
                placeholder="Type, then press Enter"
                className="absolute z-10 bg-white border border-blue-400 rounded-md px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ left: editor.left, top: editor.top, width: editor.width }}
                value={editor.value}
                onChange={(e) => setEditor((ed) => ({ ...ed, value: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { e.preventDefault(); cancelEditor(); }
                  else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEditor(); }
                }}
                onBlur={saveEditor}
              />
            )}
            <div style={{ width: `${zoom * 100}%`, minWidth: 640 }}>
              <DiagramSVG state={data} svgRef={svgRef} onEdit={openEditorAt} onAdd={addItem} onRemove={removeItem} />
            </div>
          </div>
        </CardContent>
      </Card>

      <ContactCTA variant="tool" />

      <section className="mt-12 border-t pt-8 text-sm text-gray-600">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">What a P-diagram shows</h2>
        <p className="mb-4">
          A parameter diagram (P-diagram) puts one system or function in the middle and lists everything that acts on
          it and everything it produces. It is a standard input to DFMEA and robust design work because it forces the
          team to write down what can disturb the function before discussing failure modes.
        </p>
        <ul className="mb-4 list-disc space-y-1 pl-5">
          <li><strong>Input signals</strong> &mdash; what the system is given to act on (commands, energy, material).</li>
          <li><strong>Control factors</strong> &mdash; design choices the engineer sets (dimensions, materials, tuning values).</li>
          <li><strong>Noise factors</strong> &mdash; variation you cannot control: environment, part-to-part variation, wear over time, customer usage, and interaction with neighbouring systems.</li>
          <li><strong>Ideal function</strong> &mdash; the intended output when everything works.</li>
          <li><strong>Error states</strong> &mdash; the unintended outputs, which become the failure modes in your FMEA.</li>
        </ul>
        <p>
          Once the noise factors and error states are listed, score what is new or uncertain with the{" "}
          <Link href="/tools/NUDD/" className="text-blue-600 hover:underline">NUDD assessment</Link>, and turn the noise
          factors into test conditions with the{" "}
          <Link href="/tools/MissionProfile/" className="text-blue-600 hover:underline">Mission Profile tool</Link>.
        </p>
      </section>
    </div>
  );
};

export default Page;
