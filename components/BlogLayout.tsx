// components/BlogLayout.tsx
import { ReactNode } from "react";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto p-4 prose prose-lg prose-slate">
      {children}
    </div>
  );
}
