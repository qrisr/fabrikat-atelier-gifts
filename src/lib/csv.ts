/**
 * Recipient CSV import. Accepts comma or semicolon (Swiss Excel), quoted
 * fields, UTF-8 BOM, English and German headers. Returns rows plus
 * human-readable problems instead of failing silently.
 */
import type { RecipientInput } from "@/lib/store";
import { isCanton, isEmail, isSwissPostalCode } from "@/lib/swiss";

export const CSV_COLUMNS = ["first_name", "last_name", "email", "company", "street", "postal_code", "city", "canton"] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];
export const REQUIRED_COLUMNS: CsvColumn[] = ["first_name", "last_name", "email"];

const ALIASES: Record<string, CsvColumn> = {
  first_name: "first_name", firstname: "first_name", "first name": "first_name", vorname: "first_name", prenom: "first_name", prénom: "first_name",
  last_name: "last_name", lastname: "last_name", "last name": "last_name", surname: "last_name", nachname: "last_name", name: "last_name", nom: "last_name",
  email: "email", "e-mail": "email", mail: "email", "email address": "email", "e-mail-adresse": "email",
  company: "company", firma: "company", unternehmen: "company", organisation: "company",
  street: "street", strasse: "street", straße: "street", adresse: "street", address: "street", "strasse und nr.": "street",
  postal_code: "postal_code", zip: "postal_code", "zip code": "postal_code", postcode: "postal_code", plz: "postal_code", npa: "postal_code",
  city: "city", ort: "city", stadt: "city", town: "city", ville: "city",
  canton: "canton", kanton: "canton", state: "canton",
};

export type CsvProblem =
  | { kind: "empty_file" }
  | { kind: "missing_headers"; missing: CsvColumn[]; found: string[] }
  | { kind: "empty_row"; line: number }
  | { kind: "missing_value"; line: number; column: CsvColumn }
  | { kind: "invalid_email"; line: number; value: string }
  | { kind: "invalid_postal_code"; line: number; value: string }
  | { kind: "invalid_canton"; line: number; value: string }
  | { kind: "duplicate_email"; line: number; value: string };

export type CsvResult = {
  rows: RecipientInput[];
  problems: CsvProblem[];
  /** Header problems block the import entirely. */
  fatal: boolean;
};

export function parseCsvText(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = count(firstLine, ";") > count(firstLine, ",") ? ";" : count(firstLine, "\t") > count(firstLine, ",") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const count = (value: string, char: string) => value.split(char).length - 1;

export function importRecipientsCsv(text: string, existingEmails: string[] = []): CsvResult {
  const table = parseCsvText(text);
  const nonBlankTable = table.filter((cells) => cells.some((c) => c.trim() !== ""));
  if (nonBlankTable.length === 0) return { rows: [], problems: [{ kind: "empty_file" }], fatal: true };

  const headerCells = table.find((cells) => cells.some((c) => c.trim() !== "")) ?? [];
  const headerIndex = table.indexOf(headerCells);
  const mapping = headerCells.map((cell) => ALIASES[cell.trim().toLowerCase().replace(/\s+/g, " ")]);
  const missing = REQUIRED_COLUMNS.filter((col) => !mapping.includes(col));
  if (missing.length > 0) {
    return {
      rows: [],
      problems: [{ kind: "missing_headers", missing, found: headerCells.map((c) => c.trim()).filter(Boolean) }],
      fatal: true,
    };
  }

  const problems: CsvProblem[] = [];
  const rows: RecipientInput[] = [];
  const seen = new Set(existingEmails.map((e) => e.toLowerCase()));

  table.slice(headerIndex + 1).forEach((cells, offset) => {
    const line = headerIndex + offset + 2;
    const isBlank = cells.every((c) => c.trim() === "");
    if (isBlank) {
      // Trailing newline at the end of a file is not a problem.
      if (offset < table.length - headerIndex - 2 || cells.length > 1) problems.push({ kind: "empty_row", line });
      return;
    }
    const get = (col: CsvColumn) => {
      const index = mapping.indexOf(col);
      return index >= 0 ? (cells[index] ?? "").trim() : "";
    };

    let rowOk = true;
    for (const col of REQUIRED_COLUMNS) {
      if (!get(col)) {
        problems.push({ kind: "missing_value", line, column: col });
        rowOk = false;
      }
    }
    const email = get("email");
    if (email && !isEmail(email)) {
      problems.push({ kind: "invalid_email", line, value: email });
      rowOk = false;
    }
    const postalCode = get("postal_code");
    if (postalCode && !isSwissPostalCode(postalCode)) {
      problems.push({ kind: "invalid_postal_code", line, value: postalCode });
      rowOk = false;
    }
    const canton = get("canton");
    if (canton && !isCanton(canton)) {
      problems.push({ kind: "invalid_canton", line, value: canton });
      rowOk = false;
    }
    if (email && seen.has(email.toLowerCase())) {
      problems.push({ kind: "duplicate_email", line, value: email });
      rowOk = false;
    }
    if (!rowOk) return;
    seen.add(email.toLowerCase());
    rows.push({
      firstName: get("first_name"),
      lastName: get("last_name"),
      email,
      company: get("company"),
      address: { street: get("street"), postalCode, city: get("city"), canton: canton.toUpperCase() },
      preferences: {},
    });
  });

  return { rows, problems, fatal: false };
}

export const CSV_TEMPLATE = [
  "first_name;last_name;email;company;street;postal_code;city;canton",
  "Lea;Meier;lea.meier@beispiel.ch;Beispiel AG;Seefeldstrasse 12;8008;Zürich;ZH",
  "Jonas;Huber;jonas.huber@beispiel.ch;Beispiel AG;;;;",
].join("\r\n");
