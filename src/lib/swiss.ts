/** Swiss postal conventions: cantons and postal code checks. */

export const CANTONS = [
  ["AG", "Aargau"], ["AI", "Appenzell Innerrhoden"], ["AR", "Appenzell Ausserrhoden"], ["BE", "Bern"],
  ["BL", "Basel-Landschaft"], ["BS", "Basel-Stadt"], ["FR", "Freiburg / Fribourg"], ["GE", "Genève"],
  ["GL", "Glarus"], ["GR", "Graubünden"], ["JU", "Jura"], ["LU", "Luzern"], ["NE", "Neuchâtel"],
  ["NW", "Nidwalden"], ["OW", "Obwalden"], ["SG", "St. Gallen"], ["SH", "Schaffhausen"], ["SO", "Solothurn"],
  ["SZ", "Schwyz"], ["TG", "Thurgau"], ["TI", "Ticino"], ["UR", "Uri"], ["VD", "Vaud"], ["VS", "Valais / Wallis"],
  ["ZG", "Zug"], ["ZH", "Zürich"],
] as const;

export type CantonCode = (typeof CANTONS)[number][0];

export const isCanton = (value: string): value is CantonCode => CANTONS.some(([code]) => code === value.toUpperCase());

/** Swiss postal codes: four digits, 1000–9699. */
export function isSwissPostalCode(value: string): boolean {
  if (!/^\d{4}$/.test(value.trim())) return false;
  const n = Number(value);
  return n >= 1000 && n <= 9699;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isAddressComplete(address: { street: string; postalCode: string; city: string }): boolean {
  return address.street.trim() !== "" && isSwissPostalCode(address.postalCode) && address.city.trim() !== "";
}
