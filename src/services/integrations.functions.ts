/**
 * Server functions the browser calls after quote submission, status changes
 * (demo mode) and recipient invitations. Inputs are validated; with Supabase the
 * server re-reads everything from the database using the caller's session.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { CAMPAIGN_STATUSES } from "@/lib/domain";
import {
  type DemoPayload,
  IntegrationError,
  loadContext,
  onInvite,
  onQuoteSubmitted,
  onStatusChanged,
  supabaseServerConfig,
} from "@/services/integrations.server";

// Demo payloads are only used when no database is configured (dry runs by default).
const demoSchema = z
  .object({ campaign: z.any(), company: z.any(), recipients: z.array(z.any()) })
  .nullable()
  .optional();

const base = z.object({
  campaignId: z.string().min(1).max(80),
  accessToken: z.string().max(4000).nullable().optional(),
  demo: demoSchema,
});

const baseUrl = () => new URL(getRequest().url).origin;

async function context(input: z.infer<typeof base>) {
  return loadContext({
    campaignId: input.campaignId,
    accessToken: input.accessToken ?? null,
    demo: (input.demo as DemoPayload | null | undefined) ?? null,
    baseUrl: baseUrl(),
  });
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = error instanceof IntegrationError ? error.status : 500;
  console.error("[integrations]", status, message);
  return { ok: false as const, error: message };
}

export const quoteSubmittedFn = createServerFn({ method: "POST" })
  .inputValidator(base)
  .handler(async ({ data }) => {
    try {
      // With a database, the status trigger (/api/hooks/campaign-status) handles this once.
      if (supabaseServerConfig()) return { ok: true as const, delegated: true };
      const { ctx, verified } = await context(data);
      if (ctx.campaign.status !== "submitted")
        throw new IntegrationError("campaign is not in submitted state");
      return { ok: true as const, verified, ...(await onQuoteSubmitted(ctx, verified)) };
    } catch (error) {
      return failure(error);
    }
  });

export const statusChangedFn = createServerFn({ method: "POST" })
  .inputValidator(
    base.extend({
      status: z.enum(CAMPAIGN_STATUSES),
      note: z.string().max(1000).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      // With a database, status emails are sent by the database trigger
      // (/api/hooks/campaign-status) so changes made anywhere are covered once.
      if (supabaseServerConfig()) return { ok: true as const, delegated: true };
      const { ctx, verified } = await context(data);
      return {
        ok: true as const,
        verified,
        ...(await onStatusChanged(ctx, data.status, verified, data.note)),
      };
    } catch (error) {
      return failure(error);
    }
  });

export const inviteRecipientsFn = createServerFn({ method: "POST" })
  .inputValidator(base.extend({ recipientIds: z.array(z.string().max(80)).min(1).max(2000) }))
  .handler(async ({ data }) => {
    try {
      const { ctx, verified } = await context(data);
      return { ok: true as const, verified, ...(await onInvite(ctx, data.recipientIds, verified)) };
    } catch (error) {
      return failure(error);
    }
  });
