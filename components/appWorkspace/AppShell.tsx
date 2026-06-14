"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Bot,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Shapes,
  Sparkles,
  X,
} from "lucide-react";
import { demoUser } from "@/lib/appWorkspace/mockData";
import { useProject } from "./useProjects";

const appNav = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Projects", href: "/app/projects", icon: ClipboardList },
  { label: "Templates", href: "/app/templates", icon: Shapes },
  { label: "Reports", href: "/app/reports", icon: FileText },
  { label: "AI Advisor", href: "/app/ai-advisor", icon: Bot },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const projectRouteMatch = pathname.match(/^\/app\/projects\/([^/]+)/);
  const activeProjectId =
    projectRouteMatch && projectRouteMatch[1] !== "new" ? projectRouteMatch[1] : null;
  const activeProject = useProject(activeProjectId ?? "demo-project");

  const isActive = (href: string) =>
    href === "/app" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Mobile backdrop */}
      <div
        className={[
          "fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden",
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside className={[
        "fixed inset-y-0 left-0 z-40 w-72 overflow-hidden border-r border-white/10 bg-[#020617] flex flex-col transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}>
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.35),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.22),transparent_35%)]" />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <Link href="/app" className="relative flex h-20 items-center gap-3 px-5" onClick={() => setSidebarOpen(false)}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-base font-black text-white shadow-lg shadow-blue-900/40">
            R
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-white">Reliatools</p>
            <p className="text-xs text-slate-400">Engineering Workspace</p>
          </div>
        </Link>

        <nav className="relative flex-1 space-y-1 px-3 py-3" aria-label="Application navigation">
          {appNav.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={[
                "group flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition",
                isActive(href)
                  ? "bg-white text-slate-950 shadow-lg shadow-blue-950/30"
                  : "text-slate-300 hover:bg-[#0F172A] hover:text-white",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-4 w-4 transition",
                  isActive(href) ? "text-blue-600" : "text-slate-500 group-hover:text-cyan-300",
                ].join(" ")}
                aria-hidden="true"
              />
              {label}
            </Link>
          ))}
        </nav>

        <div className="relative m-3 rounded-2xl border border-white/10 bg-[#0F172A]/90 p-4 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-cyan-300">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Demo mode
          </div>
          <p className="mt-3 text-sm font-semibold text-white">Auth-ready workspace</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Open access for development. Records keep demo user and organization IDs.
          </p>
        </div>
      </aside>

      <section className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 lg:hidden"
                aria-label="Open navigation"
                title="Open navigation"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="hidden h-10 w-80 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 shadow-inner md:flex">
                <Search className="h-4 w-4" aria-hidden="true" />
                Search projects, risks, tests
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">
                  {activeProjectId ? activeProject.name : "Reliatools Workspace"}
                </p>
                <p className="hidden text-xs text-slate-500 sm:block">
                  {activeProjectId ? "Project workflow" : "Reliability engineering SaaS"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="hidden h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 sm:inline-flex"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-xs font-bold text-white">
                  D
                </span>
                {demoUser.name}
                <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </section>
    </main>
  );
}
