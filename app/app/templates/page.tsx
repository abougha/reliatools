import { FileStack } from "lucide-react";

export default function TemplatesPage() {
  return <SimpleSection title="Templates" description="Reusable reliability planning templates will live here." icon={<FileStack className="h-5 w-5" aria-hidden="true" />} />;
}

function SimpleSection({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </section>
  );
}
