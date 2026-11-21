import Link from "next/link";
import { ArrowRight } from "lucide-react";

// An illustrative two-parameter Weibull fit drawn on Weibull probability
// paper: x = ln(t), y = ln(-ln(1 - F)), on which a Weibull CDF is a straight
// line of slope beta. Points are generated from the fitted model with a small
// deterministic scatter so the server render is stable.
const BETA = 2.3;
const ETA = 1250;
const N = 30;

const W = 440;
const H = 300;
const M = { left: 46, right: 14, top: 14, bottom: 40 };

const T_TICKS = [100, 250, 500, 1000, 2500, 5000];
const F_TICKS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 0.9, 0.99];

const weibit = (f: number) => Math.log(-Math.log(1 - f));
const X_MIN = Math.log(T_TICKS[0]);
const X_MAX = Math.log(T_TICKS[T_TICKS.length - 1]);
const Y_MIN = weibit(F_TICKS[0]);
const Y_MAX = weibit(F_TICKS[F_TICKS.length - 1]);

const px = (t: number) =>
  M.left + ((Math.log(t) - X_MIN) / (X_MAX - X_MIN)) * (W - M.left - M.right);
const py = (f: number) =>
  H - M.bottom - ((weibit(f) - Y_MIN) / (Y_MAX - Y_MIN)) * (H - M.top - M.bottom);

const timeAt = (f: number) => ETA * Math.pow(-Math.log(1 - f), 1 / BETA);

const points = Array.from({ length: N }, (_, k) => {
  const i = k + 1;
  const f = (i - 0.3) / (N + 0.4); // Benard median rank
  const scatter = Math.exp(0.07 * Math.sin(i * 2.3) + 0.03 * Math.cos(i * 5.1));
  return { f, t: timeAt(f) * scatter };
});

const b10 = Math.round(timeAt(0.1) / 10) * 10;
const fmt = (n: number) => n.toLocaleString("en-US");

const readouts = [
  { label: "Shape, β", value: BETA.toFixed(1) },
  { label: "Scale, η", value: `${fmt(ETA)} h` },
  { label: "B10 life", value: `${fmt(b10)} h` },
  { label: "Failures", value: String(N) },
];

export default function WeibullPanel() {
  return (
    <Link
      href="/tools/Weibull/"
      className="group block rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transform-none"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <p className="text-sm font-semibold text-slate-900">Weibull probability plot</p>
        <p className="text-xs text-slate-500">Example data set</p>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_9.5rem]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Weibull probability plot of ${N} failure times with a fitted line: shape ${BETA}, scale ${fmt(ETA)} hours, B10 life ${fmt(b10)} hours.`}
        >
          {T_TICKS.map((t) => (
            <g key={t}>
              <line x1={px(t)} x2={px(t)} y1={M.top} y2={H - M.bottom} stroke="#e2e8f0" />
              <text x={px(t)} y={H - M.bottom + 16} textAnchor="middle" fontSize="11" fill="#475569">
                {fmt(t)}
              </text>
            </g>
          ))}
          {F_TICKS.map((f) => (
            <g key={f}>
              <line x1={M.left} x2={W - M.right} y1={py(f)} y2={py(f)} stroke="#e2e8f0" />
              <text x={M.left - 8} y={py(f) + 4} textAnchor="end" fontSize="11" fill="#475569">
                {Math.round(f * 100)}%
              </text>
            </g>
          ))}
          <rect
            x={M.left}
            y={M.top}
            width={W - M.left - M.right}
            height={H - M.top - M.bottom}
            fill="none"
            stroke="#94a3b8"
          />
          <text x={(M.left + W - M.right) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#475569">
            Time to failure, t (hours)
          </text>

          {/* B10 reference: 10% failed at t = B10 */}
          <path
            d={`M${M.left} ${py(0.1)} H${px(timeAt(0.1))} V${H - M.bottom}`}
            fill="none"
            stroke="#2563eb"
            strokeDasharray="4 4"
            strokeOpacity="0.55"
          />

          <line
            x1={px(timeAt(F_TICKS[0]))}
            y1={py(F_TICKS[0])}
            x2={px(timeAt(0.99))}
            y2={py(0.99)}
            stroke="#2563eb"
            strokeWidth="2"
          />
          {points.map((p) => (
            <circle key={p.f} cx={px(p.t)} cy={py(p.f)} r="3" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
          ))}
        </svg>

        <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-3 sm:grid-cols-1">
          {readouts.map((r) => (
            <div key={r.label} className="border-t border-slate-200 pt-2">
              <dt className="text-xs text-slate-500">{r.label}</dt>
              <dd className="text-lg font-semibold tabular-nums text-slate-900">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="flex items-center gap-2 border-t border-slate-200 px-5 py-3 text-sm font-semibold text-blue-700">
        Fit your own life data
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </p>
    </Link>
  );
}
