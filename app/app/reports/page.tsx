import { FileText } from "lucide-react";

export default function ReportsPage() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Project reports and exported decision packages will be listed here.
          </p>
        </div>
      </div>
    </section>
  );
}
