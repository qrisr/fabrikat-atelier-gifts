/**
 * Supabase repository (Lovable Cloud). Active when VITE_SUPABASE_URL and
 * VITE_SUPABASE_PUBLISHABLE_KEY are set. Each browser gets an anonymous
 * session and its own workspace; access is enforced by RLS and the RPCs in
 * supabase/migrations. Local edits are diffed against the last known database
 * state and written in the background.
 */
import { type SupabaseClient, createClient } from "@supabase/supabase-js";

import type { ConfirmationData, PersistedData, Repository } from "@/lib/data/types";
import {
  type Campaign,
  type CampaignSnapshot,
  type CampaignStatus,
  type Company,
  type Occasion,
  type Personalization,
  type Recipient,
  type RecipientStatus,
} from "@/lib/domain";
import { estimateCost } from "@/lib/pricing";

type Row = Record<string, unknown>;

const ACTIVE_KEY = "fabrikat-atelier:active-company";
const DEFAULT_WORKSPACE = "Mein Unternehmen";

export function supabaseConfig(): { url: string; key: string } | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const url = env["VITE_SUPABASE_URL"];
  const key = env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? env["VITE_SUPABASE_ANON_KEY"];
  return url && key ? { url, key } : null;
}

// ─── Row mapping ─────────────────────────────────────────────────────────────

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));

function toCompany(row: Row): Company {
  return {
    id: str(row["id"]),
    name: str(row["name"]),
    initials: str(row["initials"]),
    contactName: str(row["contact_name"]),
    contactEmail: str(row["contact_email"]),
  };
}

function toPersonalization(row: Row | undefined, engravings: Row[]): Personalization {
  return {
    wrappingId: str(row?.["wrapping_id"] ?? "kraft-natural"),
    stickerId: str(row?.["sticker_id"] ?? "none"),
    cardId: str(row?.["card_id"] ?? "classic"),
    cardMessage: str(row?.["card_message"]),
    logoDataUrl: (row?.["logo_data_url"] as string | null) ?? null,
    logoFileName: (row?.["logo_file_name"] as string | null) ?? null,
    engravings: Object.fromEntries(
      engravings.map((e) => [
        str(e["item_id"]),
        { enabled: Boolean(e["enabled"]), text: str(e["text"]) },
      ]),
    ),
  };
}

function toSnapshot(raw: unknown): CampaignSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Row;
  const engravings = Object.entries((s["engravings"] as Record<string, Row>) ?? {}).map(
    ([item_id, e]) => ({ item_id, ...e }),
  );
  const personalization = toPersonalization((s["personalization"] as Row) ?? undefined, engravings);
  const templateId = (s["templateId"] as string | null) ?? null;
  const recipientCount = num(s["recipientCount"]);
  const cost = estimateCost({ templateId, personalization, recipients: recipientCount });
  return {
    templateId,
    personalization,
    recipientCount,
    budgetPerRecipient: num(s["budgetPerRecipient"]),
    deliveryDate: str(s["deliveryDate"]),
    totals: { perRecipient: cost.perRecipient, total: cost.total },
  };
}

function toCampaign(row: Row, personalization: Row | undefined, engravings: Row[]): Campaign {
  return {
    id: str(row["id"]),
    companyId: str(row["company_id"]),
    name: str(row["name"]),
    occasion: str(row["occasion"]) as Occasion,
    recipientEstimate: num(row["recipient_estimate"]),
    budgetPerRecipient: num(row["budget_per_recipient_chf"]),
    deliveryDate: str(row["delivery_date"]),
    templateId: (row["template_id"] as string | null) ?? null,
    personalization: toPersonalization(personalization, engravings),
    status: str(row["status"]) as CampaignStatus,
    shareToken: str(row["share_token"]),
    submittedAt: (row["submitted_at"] as string | null) ?? null,
    snapshot: toSnapshot(row["snapshot"]),
    createdAt: str(row["created_at"]),
    updatedAt: str(row["updated_at"]),
  };
}

function toRecipient(row: Row): Recipient {
  return {
    id: str(row["id"]),
    campaignId: str(row["campaign_id"]),
    firstName: str(row["first_name"]),
    lastName: str(row["last_name"]),
    email: str(row["email"]),
    company: str(row["company"]),
    address: {
      street: str(row["street"]),
      postalCode: str(row["postal_code"]),
      city: str(row["city"]),
      canton: str(row["canton"]),
    },
    status: str(row["status"]) as RecipientStatus,
    preferences: (row["preferences"] as Record<string, string>) ?? {},
    token: str(row["token"]),
    confirmedAt: (row["confirmed_at"] as string | null) ?? null,
    createdAt: str(row["created_at"]),
  };
}

const campaignColumns = (c: Campaign) => ({
  name: c.name,
  occasion: c.occasion,
  recipient_estimate: c.recipientEstimate,
  budget_per_recipient_chf: c.budgetPerRecipient,
  delivery_date: c.deliveryDate,
  template_id: c.templateId,
});

const personalizationColumns = (c: Campaign) => ({
  campaign_id: c.id,
  wrapping_id: c.personalization.wrappingId,
  sticker_id: c.personalization.stickerId,
  card_id: c.personalization.cardId,
  card_message: c.personalization.cardMessage,
  logo_data_url: c.personalization.logoDataUrl,
  logo_file_name: c.personalization.logoFileName,
});

const recipientColumns = (r: Recipient) => ({
  id: r.id,
  campaign_id: r.campaignId,
  first_name: r.firstName,
  last_name: r.lastName,
  email: r.email,
  company: r.company,
  street: r.address.street,
  postal_code: r.address.postalCode,
  city: r.address.city,
  canton: r.address.canton,
  status: r.status,
  preferences: r.preferences,
  token: r.token,
});

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ─── Repository ──────────────────────────────────────────────────────────────

export function createSupabaseRepository(config: { url: string; key: string }): Repository {
  const client: SupabaseClient = createClient(config.url, config.key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  let baseline: PersistedData | null = null;
  let pending: PersistedData | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let writing: Promise<void> = Promise.resolve();

  async function ensureSession() {
    const { data } = await client.auth.getSession();
    if (data.session) return;
    const { error } = await client.auth.signInAnonymously();
    if (error) throw error;
  }

  async function fetchAll(): Promise<PersistedData> {
    const [companies, campaigns, personalizations, engravings, recipients] = await Promise.all([
      client.from("companies").select("*").order("created_at"),
      client.from("campaigns").select("*").order("updated_at", { ascending: false }),
      client.from("campaign_personalizations").select("*"),
      client.from("campaign_engravings").select("*"),
      client.from("recipients").select("*").order("created_at").order("last_name"),
    ]);
    const failed = [companies, campaigns, personalizations, engravings, recipients].find(
      (r) => r.error,
    );
    if (failed?.error) throw failed.error;

    const companyList = (companies.data ?? []).map(toCompany);
    const stored = safeRead(ACTIVE_KEY);
    return {
      companies: companyList,
      activeCompanyId: companyList.some((c) => c.id === stored)
        ? stored!
        : (companyList[0]?.id ?? ""),
      campaigns: (campaigns.data ?? []).map((row) =>
        toCampaign(
          row,
          (personalizations.data ?? []).find((p) => p["campaign_id"] === row["id"]),
          (engravings.data ?? []).filter((e) => e["campaign_id"] === row["id"]),
        ),
      ),
      recipients: (recipients.data ?? []).map(toRecipient),
    };
  }

  async function writeDiff(from: PersistedData, to: PersistedData) {
    if (to.activeCompanyId !== from.activeCompanyId) safeWrite(ACTIVE_KEY, to.activeCompanyId);

    for (const company of to.companies) {
      const before = from.companies.find((c) => c.id === company.id);
      if (before && !same(before, company)) {
        await check(
          client
            .from("companies")
            .update({
              name: company.name,
              initials: company.initials,
              contact_name: company.contactName,
              contact_email: company.contactEmail,
            })
            .eq("id", company.id),
        );
      }
    }

    for (const campaign of to.campaigns) {
      const before = from.campaigns.find((c) => c.id === campaign.id);
      if (!before) {
        await check(
          client.from("campaigns").insert({
            id: campaign.id,
            company_id: campaign.companyId,
            share_token: campaign.shareToken,
            ...campaignColumns(campaign),
          }),
        );
        await check(
          client.from("campaign_personalizations").insert(personalizationColumns(campaign)),
        );
      } else {
        if (!same(campaignColumns(before), campaignColumns(campaign))) {
          await check(
            client.from("campaigns").update(campaignColumns(campaign)).eq("id", campaign.id),
          );
        }
        if (!same(personalizationColumns(before), personalizationColumns(campaign))) {
          await check(
            client.from("campaign_personalizations").upsert(personalizationColumns(campaign)),
          );
        }
      }
      const engravings = Object.entries(campaign.personalization.engravings);
      const beforeEngravings = before?.personalization.engravings ?? {};
      const changed = engravings.filter(([itemId, e]) => !same(beforeEngravings[itemId], e));
      const removed = Object.keys(beforeEngravings).filter(
        (itemId) => !(itemId in campaign.personalization.engravings),
      );
      if (removed.length)
        await check(
          client
            .from("campaign_engravings")
            .delete()
            .eq("campaign_id", campaign.id)
            .in("item_id", removed),
        );
      if (changed.length) {
        await check(
          client.from("campaign_engravings").upsert(
            changed.map(([item_id, e]) => ({
              campaign_id: campaign.id,
              item_id,
              enabled: e.enabled,
              text: e.text,
            })),
          ),
        );
      }
    }

    const removedRecipients = from.recipients
      .filter((r) => !to.recipients.some((n) => n.id === r.id))
      .map((r) => r.id);
    if (removedRecipients.length)
      await check(client.from("recipients").delete().in("id", removedRecipients));

    const added = to.recipients.filter((r) => !from.recipients.some((o) => o.id === r.id));
    if (added.length) await check(client.from("recipients").insert(added.map(recipientColumns)));

    for (const recipient of to.recipients) {
      const before = from.recipients.find((r) => r.id === recipient.id);
      if (before && !same(recipientColumns(before), recipientColumns(recipient))) {
        const { id, token, campaign_id, ...columns } = recipientColumns(recipient);
        await check(client.from("recipients").update(columns).eq("id", id));
      }
    }

    const removedCampaigns = from.campaigns
      .filter((c) => !to.campaigns.some((n) => n.id === c.id))
      .map((c) => c.id);
    if (removedCampaigns.length)
      await check(client.from("campaigns").delete().in("id", removedCampaigns));
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void runWrite(), 450);
  }

  function runWrite(): Promise<void> {
    timer = null;
    writing = writing.then(async () => {
      if (!pending || !baseline) return;
      const target = pending;
      pending = null;
      try {
        await writeDiff(baseline, target);
        baseline = target;
      } catch (error) {
        console.error("[fabrikat] save failed", error);
        window.dispatchEvent(new CustomEvent("fabrikat:save-error", { detail: error }));
        // Re-sync with the database so the UI shows what is actually stored.
        baseline = await fetchAll();
        window.dispatchEvent(new CustomEvent("fabrikat:remote-data", { detail: baseline }));
      }
    });
    return writing;
  }

  return {
    kind: "supabase",

    async load() {
      await ensureSession();
      const { data: user } = await client.auth.getUser();
      const { error } = await client.rpc("ensure_workspace", {
        _name: DEFAULT_WORKSPACE,
        _contact_name: "",
        _contact_email: user.user?.email ?? "",
      });
      if (error) throw error;
      baseline = await fetchAll();
      return baseline;
    },

    persist(next) {
      pending = next;
      schedule();
    },

    async flush() {
      if (timer) clearTimeout(timer);
      await runWrite();
    },

    subscribe(onChange) {
      let reload: ReturnType<typeof setTimeout> | null = null;
      const onRemote = (event: Event) => onChange((event as CustomEvent<PersistedData>).detail);
      window.addEventListener("fabrikat:remote-data", onRemote);
      const channel = client
        .channel("gift-atelier")
        .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => queue())
        .on("postgres_changes", { event: "*", schema: "public", table: "recipients" }, () =>
          queue(),
        )
        .subscribe();

      function queue() {
        if (reload) clearTimeout(reload);
        reload = setTimeout(async () => {
          if (pending || timer) return queue();
          await writing;
          const fresh = await fetchAll();
          baseline = fresh;
          onChange(fresh);
        }, 350);
      }

      return () => {
        window.removeEventListener("fabrikat:remote-data", onRemote);
        void client.removeChannel(channel);
      };
    },

    async submitQuote(campaignId) {
      await this.flush();
      const { data, error } = await client.rpc("submit_quote", { _campaign_id: campaignId });
      if (error) {
        const reason = /recipient/.test(error.message)
          ? "no_recipients"
          : /gift set/.test(error.message)
            ? "no_template"
            : /submitted|locked/.test(error.message)
              ? "locked"
              : "error";
        return { ok: false, reason, message: error.message };
      }
      baseline = await fetchAll();
      const campaign = baseline.campaigns.find((c) => c.id === (data as Row)["id"]);
      return campaign ? { ok: true, campaign } : { ok: false, reason: "error" };
    },

    async setStatus(campaignId, status) {
      await this.flush();
      const { error } = await client.rpc("set_campaign_status", {
        _campaign_id: campaignId,
        _status: status,
      });
      if (error) throw error;
      baseline = await fetchAll();
      return baseline.campaigns.find((c) => c.id === campaignId) ?? null;
    },

    async getConfirmation(token) {
      const { data, error } = await client.rpc("get_confirmation", { _token: token });
      if (error || !data) return null;
      const raw = data as { campaign: Row; recipient: Row | null };
      return {
        campaign: {
          id: str(raw.campaign["id"]),
          templateId: (raw.campaign["templateId"] as string | null) ?? null,
          deliveryDate: str(raw.campaign["deliveryDate"]),
          status: str(raw.campaign["status"]) as CampaignStatus,
          companyName: str(raw.campaign["companyName"]),
        },
        recipient: raw.recipient
          ? {
              firstName: str(raw.recipient["firstName"]),
              lastName: str(raw.recipient["lastName"]),
              email: str(raw.recipient["email"]),
              address: {
                street: str(raw.recipient["street"]),
                postalCode: str(raw.recipient["postalCode"]),
                city: str(raw.recipient["city"]),
                canton: str(raw.recipient["canton"]),
              },
              preferences: (raw.recipient["preferences"] as Record<string, string>) ?? {},
            }
          : null,
      } satisfies ConfirmationData;
    },

    async confirmAddress(token, payload) {
      const { data, error } = await client.rpc("confirm_address", {
        _token: token,
        _payload: { ...payload, ...payload.address },
      });
      if (error) return { result: "error" };
      return {
        result: data === "confirmed" ? "confirmed" : data === "closed" ? "closed" : "not_found",
      };
    },

    async isStaff() {
      const { data: user } = await client.auth.getUser();
      if (!user.user) return false;
      const { data } = await client
        .from("staff")
        .select("user_id")
        .eq("user_id", user.user.id)
        .maybeSingle();
      return Boolean(data);
    },
  };
}

async function check(query: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await query;
  if (error) throw error;
}

function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
