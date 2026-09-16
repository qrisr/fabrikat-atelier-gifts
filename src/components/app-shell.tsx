import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  FileCheck2,
  Gift,
  LayoutDashboard,
  Menu,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Campaigns", to: "/", icon: LayoutDashboard },
  { label: "Gift Templates", to: "/templates", icon: Gift },
  { label: "Recipients", to: "/recipients", icon: Users },
  { label: "Quote Review", to: "/quote-review", icon: FileCheck2 },
] as const;

export function AppShell() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center border-b border-border bg-background px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
        <BrandMark compact />
        <span className="size-11" aria-hidden="true" />
      </header>

      {open && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-overlay lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(88vw,19rem)] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:w-[19rem] lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-28 items-center border-b border-sidebar-border px-8">
          <BrandMark />
        </div>

        <nav className="flex-1 px-4 py-8" aria-label="Main navigation">
          <p className="px-4 pb-4 text-xs font-medium uppercase text-muted-foreground">Gift atelier</p>
          <ul className="space-y-1">
            {navigation.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group grid h-12 grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-sm px-4 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className="size-[1.125rem] shrink-0" strokeWidth={1.6} />
                    <span className="truncate">{item.label}</span>
                    {active && <span className="size-1.5 rounded-full bg-brand" aria-label="Current page" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <button
            type="button"
            className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-sm p-3 text-left transition-colors hover:bg-sidebar-accent"
          >
            <span className="grid size-10 place-items-center rounded-sm bg-workspace text-sm font-semibold text-workspace-foreground">
              AC
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-sidebar-foreground">Alpen & Co. AG</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-status" /> Active workspace
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </aside>

      <main className="min-h-[calc(100vh-4rem)] lg:ml-[19rem] lg:min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("min-w-0", compact && "text-center")} aria-label="Fabrikat Gift Atelier">
      <div className="font-display text-[1.15rem] font-semibold uppercase text-foreground">Fabrikat</div>
      <div className="mt-0.5 text-[0.625rem] font-medium uppercase text-muted-foreground">Gift Atelier · Zürich</div>
    </div>
  );
}