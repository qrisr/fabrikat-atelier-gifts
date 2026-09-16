import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  action?: { label: string; to: string } | { label: string; onClick: () => void };
  illustration?: ReactNode;
  children?: ReactNode;
};

export function EmptyState({ icon: Icon, eyebrow, title, description, action, illustration, children }: EmptyStateProps) {
  return (
    <section className="grid min-h-[28rem] place-items-center border-b border-border py-16 text-center">
      <div className="max-w-xl px-5">
        {illustration ?? (
          <div className="mx-auto mb-8 grid size-16 place-items-center rounded-full border border-border bg-secondary">
            <Icon className="size-6 text-primary" strokeWidth={1.4} />
          </div>
        )}
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
        <h2 className="font-display text-3xl text-foreground sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-muted-foreground">{description}</p>
        {action &&
          ("to" in action ? (
            <Button asChild size="lg" className="mt-8">
              <Link to={action.to}>{action.label}</Link>
            </Button>
          ) : (
            <Button size="lg" className="mt-8" onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        {children}
      </div>
    </section>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-12 grid gap-6 border-b border-border pb-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="min-w-0 max-w-3xl">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">{title}</h1>
        {description && <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>}
      </div>
      {aside && <div className="min-w-0">{aside}</div>}
    </header>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[90rem] px-5 py-10 sm:px-10 sm:py-14 xl:px-16 xl:py-16">{children}</div>;
}
