import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  Check,
  ChevronsUpDown,
  FileCheck2,
  FolderKanban,
  Gift,
  LayoutDashboard,
  Menu,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand";
import { CompanySettingsDialog } from "@/components/company-settings-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { actions, startStore, useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Routes rendered without the sidebar (recipient-facing pages). */
const STANDALONE_PREFIXES = ["/confirm"];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { m } = useI18n();
  const { ready, loadError, isStaff } = useAppState();
  const standalone = STANDALONE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    // Recipient pages talk to the repository directly and never open a workspace session.
    if (!standalone) void startStore();
  }, [standalone]);

  useEffect(() => {
    const onError = () => toast.error(m.app.saveError);
    window.addEventListener("fabrikat:save-error", onError);
    return () => window.removeEventListener("fabrikat:save-error", onError);
  }, [m]);

  if (standalone) {
    return <Outlet />;
  }

  const navigation: Array<{
    label: string;
    to: string;
    icon: typeof Gift;
    match: (p: string) => boolean;
  }> = [
    {
      label: m.nav.campaigns,
      to: "/",
      icon: LayoutDashboard,
      match: (p: string) => p === "/" || p.startsWith("/campaigns"),
    },
    {
      label: m.nav.templates,
      to: "/templates",
      icon: Gift,
      match: (p: string) => p.startsWith("/templates"),
    },
    {
      label: m.nav.recipients,
      to: "/recipients",
      icon: Users,
      match: (p: string) => p.startsWith("/recipients"),
    },
    {
      label: m.nav.quoteReview,
      to: "/quote-review",
      icon: FileCheck2,
      match: (p: string) => p.startsWith("/quote-review"),
    },
  ];
  if (isStaff) {
    navigation.push({
      label: m.atelier.nav,
      to: "/atelier",
      icon: FolderKanban,
      match: (p: string) => p.startsWith("/atelier"),
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center border-b border-border bg-background/95 px-3 backdrop-blur lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label={open ? m.nav.close : m.nav.open}
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
          aria-label={m.nav.close}
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
        <div className="flex h-28 items-center border-b border-sidebar-border px-7">
          <BrandMark />
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-8" aria-label={m.nav.main}>
          <p className="px-4 pb-4 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {m.nav.section}
          </p>
          <ul className="space-y-1">
            {navigation.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group grid h-12 grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-sm px-4 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className="size-[1.125rem] shrink-0" strokeWidth={1.6} />
                    <span className="truncate">{item.label}</span>
                    {active && (
                      <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <WorkspaceSwitcher />
        </div>
      </aside>

      <main className="min-h-[calc(100vh-4rem)] lg:ml-[19rem] lg:min-h-screen">
        {loadError ? (
          <div className="grid min-h-[70vh] place-items-center px-5 text-center" role="alert">
            <div className="max-w-md">
              <h1 className="font-display text-3xl">{m.app.loadErrorTitle}</h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{m.app.loadErrorBody}</p>
              <Button className="mt-6" onClick={() => window.location.reload()}>
                {m.app.reload}
              </Button>
            </div>
          </div>
        ) : ready ? (
          <Outlet />
        ) : (
          <div className="grid min-h-[70vh] place-items-center" role="status" aria-live="polite">
            <p className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-brand" /> {m.app.loading}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function WorkspaceSwitcher() {
  const { m } = useI18n();
  const { companies, activeCompanyId, ready } = useAppState();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const active = companies.find((c) => c.id === activeCompanyId) ?? companies[0];
  if (!active || !ready) return <div className="h-16" aria-hidden="true" />;

  return (
    <>
      <CompanySettingsDialog company={active} open={settingsOpen} onOpenChange={setSettingsOpen} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={m.workspace.switch}
            className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-sm p-3 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-10 place-items-center rounded-sm bg-workspace text-sm font-semibold text-workspace-foreground">
              {active.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-sidebar-foreground">
                {active.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-status" /> {m.workspace.active}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-[17rem]">
          <DropdownMenuLabel className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {m.workspace.heading}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onSelect={() => actions.setActiveCompany(company.id)}
              className="gap-3 py-2.5"
            >
              <span className="grid size-8 place-items-center rounded-sm bg-secondary text-xs font-semibold">
                {company.initials}
              </span>
              <span className="min-w-0 flex-1 truncate">{company.name}</span>
              {company.id === active.id && <Check className="size-4 text-brand" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)} className="gap-3 py-2.5">
            <Building2 className="size-4 text-muted-foreground" /> {m.workspace.settings}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
