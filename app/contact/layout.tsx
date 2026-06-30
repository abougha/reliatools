import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Reliatools",
  description: "Get in touch with the Reliatools team.",
  openGraph: {
    title: "Contact Reliatools",
    description: "Get in touch with the Reliatools team.",
    url: "https://www.reliatools.com/contact",
    siteName: "Reliatools",
    type: "website",
  },
  alternates: { canonical: "https://www.reliatools.com/contact" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
