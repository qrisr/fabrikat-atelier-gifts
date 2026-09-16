# Integrationen: Google Sheets, Pipeline, Resend

Alle Anbindungen laufen serverseitig (`src/services/integrations.server.ts`). Fehlt ein
Schlüssel, bereitet die App den Schritt vor, schickt aber nichts ab (Hinweis «Preview mode»).
Die Vorlagen aller E-Mails zeigt die App unter **/atelier/emails**.

## Wann wird was ausgelöst?

| Ereignis | Mit Lovable Cloud (Datenbank) | Ohne Datenbank (Browser-Demo) |
|---|---|---|
| Empfänger hinzugefügt (von Hand oder per CSV) | Einladungs-Mail mit persönlichem Link an jeden neuen Empfänger | Nur Vorschau |
| «Send confirmation emails» | Einladungs-Mail an alle Offenen | Nur Vorschau |
| Offerte angefragt | DB-Trigger → `/api/hooks/campaign-status`: Zeile in Google Sheets, Pipeline-Webhook, Mail «Anfrage erhalten» | Nur Vorschau |
| Status «Under Review», «Approved», «Changes Requested» | Gleicher Hook: Mail an die Kontakt-E-Mail der Firma, Sheet-Zeile und Pipeline aktualisiert | Nur Vorschau |

Mit Datenbank liest der Server die Kampagne immer selbst aus der Datenbank, mit der Sitzung der
Person oder beim Hook mit der Service-Rolle. Was der Browser schickt, übernimmt er nicht
ungeprüft. Ohne Datenbank wird nie wirklich versendet, ausser `ALLOW_DEMO_INTEGRATIONS=true`
ist gesetzt. Nur zu Testzwecken verwenden.

## Secrets (Lovable Cloud → Secrets)

| Name | Zweck |
|---|---|
| `RESEND_API_KEY` | Resend-API-Schlüssel |
| `RESEND_FROM` | Absender, Domain in Resend verifiziert, z. B. `Fabrikat Gift Atelier <atelier@fabrikat.ch>` |
| `GOOGLE_SHEETS_WEBHOOK_URL` | URL der Apps-Script-Web-App (siehe unten) |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | beliebiges Geheimnis, identisch im Apps Script |
| `PIPELINE_WEBHOOK_URL` | optional: CRM oder Automatisierung (Zapier, Make, Pipedrive …) |
| `APP_URL` | öffentliche Adresse der App für Links in Mails, z. B. `https://gifts.fabrikat.ch` |
| `HOOK_SECRET` | Geheimnis für den Datenbank-Hook |
| `SUPABASE_SERVICE_ROLE_KEY` | nur für den Hook (liest Kampagnen aller Firmen) |

Danach in der Datenbank einmal eintragen (Migration `20260916210000_status_notifications.sql`
legt Tabelle und Trigger an):

```sql
insert into private.integration_settings (key, value) values
  ('status_hook_url', 'https://<app-domain>/api/hooks/campaign-status'),
  ('status_hook_secret', '<gleicher Wert wie HOOK_SECRET>')
on conflict (key) do update set value = excluded.value;
```

## Google Sheet einrichten

1. Neues Google Sheet anlegen, Tabellenblatt `Anfragen`.
2. Erweiterungen → Apps Script, folgenden Code einfügen, `SECRET` setzen:

```javascript
const SECRET = "gleicher Wert wie GOOGLE_SHEETS_WEBHOOK_SECRET";
const SHEET = "Anfragen";

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.secret !== SECRET) return json({ ok: false, error: "unauthorized" });
  const row = body.row;
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
  const headers = Object.keys(row);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idCol = existing.indexOf("campaign_id") + 1;
  const values = existing.map((h) => row[h] ?? "");
  // Same campaign again (status change) → update its row instead of adding one.
  const ids = idCol ? sheet.getRange(2, idCol, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat() : [];
  const index = ids.indexOf(row.campaign_id);
  if (index >= 0) sheet.getRange(index + 2, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
  return json({ ok: true });
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
```

3. Bereitstellen → Neue Bereitstellung → Web-App, «Ausführen als: ich», «Zugriff: jeder».
   Die URL als `GOOGLE_SHEETS_WEBHOOK_URL` eintragen.

Spalten: Eingang, Status, Firma, Kontakt, Kampagne, Anlass, Lieferdatum, Set, Anzahl
Empfänger und bestätigte Adressen, Budget pro Person und total, Schätzung pro Person und total
ohne MWST, Papier, Sticker, Karte, Kartentext, Logo, Gravuren, Empfängerliste mit Adressen und
Präferenzen, Link zur Anfrage.

## Pipeline statt HubSpot

Fabrikat hat kein HubSpot. Die Pipeline lebt deshalb in der App:
- **/atelier** (nur für `staff`): alle Anfragen nach Stufe (angefragt → in Prüfung → wartet auf Kunde → Offerte bestätigt) mit Firma, Schätzung, Empfängern und Lieferdatum.
- Statusänderungen über «Fabrikat review» in der Anfrage.
- `PIPELINE_WEBHOOK_URL` schickt bei jedem Ereignis ein neutrales `deal`-Objekt (Name, Stufe, Betrag, Budget, Termin, Firma, Link). Ein späteres CRM lässt sich so anhängen, ohne die App umzubauen.

## Lokal getestet (16.09.2026)

Mit lokaler Supabase: Datenbank-Trigger → pg_net → Hook (401 ohne Geheimnis, 200 mit),
Daten über die Service-Rolle geladen, Sheet-Zeile vollständig, Notiz der Statusänderung
übernommen. Einladungen über Server-Funktion mit Benutzersitzung. Resend und Google Sheets
selbst ungetestet, weil keine Schlüssel vorhanden. Der Versand-Aufruf ist mit einem Unit-Test
abgedeckt.
