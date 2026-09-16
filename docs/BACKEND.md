# Backend: Speicherung, Datenbank, Status

Die App hat zwei Speicherarten. Welche aktiv ist, entscheidet sich beim Start
(`src/lib/data/index.ts`):

| Modus | Wann | Was gilt |
|---|---|---|
| **Browser** | keine Supabase-Variablen gesetzt | Daten in `localStorage`, Demo-Firmen «Alpen & Co. AG» und «Seeblick Treuhand». Neu laden verliert nichts, ein zweiter Tab sieht Änderungen sofort. Andere Geräte sehen nichts. Die Statussteuerung «Fabrikat review» ist als Demo sichtbar. |
| **Supabase (Lovable Cloud)** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` gesetzt | Jeder Browser erhält eine anonyme Sitzung und einen eigenen Arbeitsbereich. Zugriff über RLS, Sperre und Status in der Datenbank, Echtzeit über Supabase Realtime. |

## Lovable Cloud aktivieren

1. Im Lovable-Studio **Cloud aktivieren**. Lovable setzt die Variablen `VITE_SUPABASE_*` selbst.
2. Lovable die Migrationen aus `supabase/migrations/` anwenden lassen, in dieser Reihenfolge:
   - `20260916200000_gift_atelier_schema.sql`: Tabellen, RLS, Sperr-Trigger, RPCs, Realtime
   - `20260916200100_seed_catalogue.sql`: kuratierter Katalog (aus `src/lib/catalog.ts` erzeugt)
3. In den Auth-Einstellungen **Anonymous sign-ins** einschalten.
4. Fabrikat-Mitarbeitende freischalten: `insert into public.staff (user_id) values ('<auth-user-id>');`

Katalog geändert? `bun scripts/export-catalog-sql.ts` erzeugt die Seed-Migration neu. Danach als
neue Migration anwenden lassen.

## Datenmodell

- `companies`, `company_members`: Arbeitsbereiche und wer dazugehört
- `gift_templates`, `template_items`: kuratierte Sets und Produkte (Gravur, Präferenzen)
- `campaigns`: Kampagne, Status, `share_token`, eingefrorener `snapshot`
- `campaign_personalizations`, `campaign_engravings`: gewählte Optionen
- `recipients`: Empfänger, Adresse, Status, persönlicher `token`
- `campaign_status_events`: jede Statusänderung (Grundlage für Benachrichtigungen)

## Regeln in der Datenbank (lokal getestet)

- Nach `submit_quote` sind Name, Set, Budget, Personalisierung, Gravuren und die Empfängerliste gesperrt. Adressen dürfen weiter bestätigt oder korrigiert werden.
- `status`, `snapshot` und `submitted_at` ändern sich nur über `submit_quote` (Mitglieder) und `set_campaign_status` (nur `staff`).
- Mitglieder sehen nur ihre Firma. Empfänger sehen über `get_confirmation(token)` nur, was das Formular braucht, und bestätigen über `confirm_address(token, payload)`.
- `changes_requested` gibt die Kampagne wieder zur Bearbeitung frei.

## Status von Hand setzen (Test)

```sql
select public.set_campaign_status('<campaign-id>', 'approved');   -- als staff angemeldet
```

## Lokal testen

```bash
supabase start -x studio,imgproxy,edge-runtime,logflare,vector,storage-api,mailpit,postgres-meta,supavisor
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key aus supabase status> \
  ./node_modules/.bin/vite dev --port 8081
```

`supabase/config.toml` ist nur für den lokalen Test gedacht und nicht eingecheckt. In
Lovable Cloud gilt die Konfiguration des Studios.

## Offen

- Anmeldung mit E-Mail statt anonymer Sitzung, damit ein Arbeitsbereich geräteübergreifend und für mehrere Personen einer Firma funktioniert.
- Logos liegen als Data-URL in der Tabelle (max. 2 MB). Bei vielen Kampagnen besser Supabase Storage.
