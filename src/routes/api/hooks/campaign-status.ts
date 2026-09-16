/**
 * Database trigger target: every insert into campaign_status_events posts here
 * (see supabase/migrations/*_status_notifications.sql). Sends the status email
 * and updates Sheets / pipeline. Protected by HOOK_SECRET.
 */
import { createFileRoute } from "@tanstack/react-router";

import { CAMPAIGN_STATUSES, type CampaignStatus } from "@/lib/domain";
import {
  IntegrationError,
  loadContext,
  onQuoteSubmitted,
  onStatusChanged,
} from "@/services/integrations.server";

export const Route = createFileRoute("/api/hooks/campaign-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["HOOK_SECRET"];
        if (!secret || request.headers.get("x-hook-secret") !== secret) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }
        let body: { campaign_id?: string; to_status?: string; note?: string | null };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
        }
        const status = body.to_status as CampaignStatus;
        if (!body.campaign_id || !CAMPAIGN_STATUSES.includes(status)) {
          return Response.json({ ok: false, error: "invalid payload" }, { status: 400 });
        }
        try {
          const { ctx } = await loadContext({
            campaignId: body.campaign_id,
            serviceRole: true,
            baseUrl: new URL(request.url).origin,
          });
          const result =
            status === "submitted"
              ? await onQuoteSubmitted(ctx, true)
              : await onStatusChanged(ctx, status, true, body.note);
          return Response.json({ ok: true, result });
        } catch (error) {
          const code = error instanceof IntegrationError ? error.status : 500;
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : String(error) },
            { status: code },
          );
        }
      },
    },
  },
});
