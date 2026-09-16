import { describe, expect, it } from "vitest";

import { CSV_TEMPLATE, importRecipientsCsv, parseCsvText } from "@/lib/csv";

describe("parseCsvText", () => {
  it("handles semicolons, quotes, BOM and CRLF", () => {
    const rows = parseCsvText('﻿a;b\r\n"x; y";"he said ""hi"""\r\n');
    expect(rows).toEqual([["a", "b"], ["x; y", 'he said "hi"']]);
  });
});

describe("importRecipientsCsv", () => {
  it("imports the downloadable template", () => {
    const result = importRecipientsCsv(CSV_TEMPLATE);
    expect(result.fatal).toBe(false);
    expect(result.problems).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      firstName: "Lea",
      email: "lea.meier@beispiel.ch",
      address: { street: "Seefeldstrasse 12", postalCode: "8008", city: "Zürich", canton: "ZH" },
    });
  });

  it("accepts German headers with commas", () => {
    const result = importRecipientsCsv("Vorname,Nachname,E-Mail,PLZ,Ort\nAnna,Keller,anna@alpen.ch,6003,Luzern\n");
    expect(result.problems).toEqual([]);
    expect(result.rows[0]?.address.postalCode).toBe("6003");
  });

  it("reports missing headers as fatal", () => {
    const result = importRecipientsCsv("name;mail\nLea;lea@x.ch");
    expect(result.fatal).toBe(true);
    expect(result.problems[0]).toMatchObject({ kind: "missing_headers", missing: ["first_name"] });
  });

  it("reports empty file", () => {
    expect(importRecipientsCsv("\n\n").problems[0]).toEqual({ kind: "empty_file" });
  });

  it("reports empty rows, invalid emails, postal codes and duplicates with line numbers", () => {
    const csv = [
      "first_name;last_name;email;postal_code",
      "Lea;Meier;lea@x.ch;8008",
      ";;;",
      "Tom;Frei;not-an-email;8000",
      "Sara;Rossi;sara@x.ch;123",
      "Lea;Meier;LEA@x.ch;8008",
      "",
    ].join("\n");
    const result = importRecipientsCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.problems).toEqual([
      { kind: "empty_row", line: 3 },
      { kind: "invalid_email", line: 4, value: "not-an-email" },
      { kind: "invalid_postal_code", line: 5, value: "123" },
      { kind: "duplicate_email", line: 6, value: "LEA@x.ch" },
    ]);
  });

  it("skips emails already in the campaign", () => {
    const result = importRecipientsCsv("first_name;last_name;email\nLea;Meier;lea@x.ch", ["lea@x.ch"]);
    expect(result.rows).toHaveLength(0);
    expect(result.problems[0]).toMatchObject({ kind: "duplicate_email" });
  });
});
