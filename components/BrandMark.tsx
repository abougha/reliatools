export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width="30"
        height="24"
        viewBox="0 0 30 24"
        fill="none"
        aria-hidden="true"
        className="flex-none text-blue-600"
      >
        <path
          d="M3 19 L11 12 L17 16 L27 5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="3" cy="19" r="2.5" fill="currentColor" />
        <circle cx="11" cy="12" r="2.5" fill="currentColor" />
        <circle cx="17" cy="16" r="2.5" fill="currentColor" />
        <circle cx="27" cy="5" r="2.5" fill="currentColor" />
      </svg>
      <span className="text-xl font-bold tracking-tight text-slate-900">Reliatools</span>
    </span>
  );
}
