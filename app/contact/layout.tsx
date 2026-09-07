import type { Metadata } from "next";
import { ogTitle, PAGE_NAMES } from "@/lib/seo/titles";

export const metadata: Metadata = {
  title: PAGE_NAMES["/contact/"],
  description: "Get in touch with the Reliatools team.",
  openGraph: {
    title: ogTitle("/contact/"),
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
