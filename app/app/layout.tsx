import type { Metadata } from "next";
import AppShell from "@/components/appWorkspace/AppShell";

export const metadata: Metadata = {
  title: "Reliatools App",
  description: "Auth-ready Reliatools project workspace dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
