import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
};

export function EmptyState({ icon: Icon, eyebrow, title, description, action }: EmptyStateProps) {
  return (
    <section className="grid min-h-[31rem] place-items-center border-y border-border py-16 text-center">
      <div className="max-w-lg px-5">
        <div className="mx-auto mb-8 grid size-16 place-items-center rounded-full border border-border bg-secondary">
          <Icon className="size-6 text-primary" strokeWidth={1.4} />
        </div>
        <p className="mb-4 text-xs font-semibold uppercase text-brand">{eyebrow}</p>
        <h2 className="font-display text-3xl font-medium text-foreground sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-muted-foreground">{description}</p>
        <Button className="mt-8">{action}</Button>
      </div>
    </section>
  );
}

export function PageIntro({ eyebrow, title, description }: Omit<EmptyStateProps, "icon" | "action">) {
  return (
    <header className="mb-14 max-w-3xl">
      <p className="mb-5 text-xs font-semibold uppercase text-brand">{eyebrow}</p>
      <h1 className="font-display text-4xl font-medium text-foreground sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
    </header>
  );
}