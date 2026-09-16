/**
 * Curated Fabrikat catalogue: gift templates, wrapping, stickers, cards.
 * Prices in CHF, excluding VAT. Copy is bilingual (de/en).
 * Placeholder assortment — replace with Fabrikat's confirmed range and prices.
 */

export type Lang = "de" | "en";
export type Localized = Record<Lang, string>;

export type ItemKind =
  | "candle"
  | "tea"
  | "notebook"
  | "pen"
  | "knife"
  | "mug"
  | "honey"
  | "pouch"
  | "whetstone"
  | "chocolate"
  | "napkin"
  | "matches";

export type PreferenceOption = { id: string; label: Localized };

export type TemplateItem = {
  id: string;
  kind: ItemKind;
  name: Localized;
  maker: string;
  /** Surcharge per engraved piece; undefined = not engravable. */
  engravingSurcharge?: number;
  engravingMaxLength?: number;
  /** Optional choice the recipient may make (tea flavour, notebook colour). */
  preference?: { id: string; label: Localized; options: PreferenceOption[] };
};

export type GiftTemplate = {
  id: string;
  name: Localized;
  tagline: Localized;
  description: Localized;
  price: number;
  /** Background tone for the product still life. */
  tone: string;
  items: TemplateItem[];
};

export type WrappingOption = {
  id: string;
  name: Localized;
  description: Localized;
  surcharge: number;
  paper: string;
  ribbon: string;
  pattern: "plain" | "linen" | "dots" | "foil";
};

export type StickerOption = {
  id: string;
  name: Localized;
  surcharge: number;
  motif: "none" | "star" | "fir" | "peaks" | "merci";
  color: string;
};

export type CardOption = {
  id: string;
  name: Localized;
  description: Localized;
  surcharge: number;
  stock: string;
};

const teaPreference = {
  id: "tea",
  label: { de: "Teesorte", en: "Tea blend" },
  options: [
    { id: "alpine-herbs", label: { de: "Alpenkräuter", en: "Alpine herbs" } },
    { id: "black-winter", label: { de: "Schwarztee Winterapfel", en: "Black tea, winter apple" } },
    {
      id: "rooibos",
      label: { de: "Rooibos Vanille (koffeinfrei)", en: "Rooibos vanilla (caffeine-free)" },
    },
  ],
};

const notebookPreference = {
  id: "notebook-colour",
  label: { de: "Farbe Notizbuch", en: "Notebook colour" },
  options: [
    { id: "cognac", label: { de: "Cognac", en: "Cognac" } },
    { id: "forest", label: { de: "Waldgrün", en: "Forest green" } },
    { id: "ink", label: { de: "Tintenblau", en: "Ink blue" } },
  ],
};

export const GIFT_TEMPLATES: GiftTemplate[] = [
  {
    id: "winterabend",
    name: { de: "Winterabend", en: "Winter Evening" },
    tagline: { de: "Licht, Wärme und eine Tasse Ruhe", en: "Light, warmth and a cup of quiet" },
    description: {
      de: "Eine Bienenwachskerze aus dem Emmental, Bio-Tee aus dem Tessin, eine Leinenserviette und Zündhölzer in der Schachtel. Für ruhige Abende zwischen den Jahren.",
      en: "A beeswax candle from the Emmental, organic tea from Ticino, a linen napkin and a box of matches. For quiet evenings between the years.",
    },
    price: 89,
    tone: "#EADFCB",
    items: [
      {
        id: "wa-candle",
        kind: "candle",
        name: { de: "Bienenwachskerze", en: "Beeswax candle" },
        maker: "Imkerei Rüegsau",
      },
      {
        id: "wa-tea",
        kind: "tea",
        name: { de: "Bio-Tee in der Dose", en: "Organic tea tin" },
        maker: "Erboristi Ticino",
        preference: teaPreference,
      },
      {
        id: "wa-napkin",
        kind: "napkin",
        name: { de: "Leinenserviette", en: "Linen napkin" },
        maker: "Weberei Langenthal",
      },
      {
        id: "wa-matches",
        kind: "matches",
        name: { de: "Zündhölzer", en: "Safety matches" },
        maker: "Fabrikat Edition",
      },
    ],
  },
  {
    id: "schreibtisch",
    name: { de: "Der Schreibtisch", en: "The Writing Desk" },
    tagline: { de: "Werkzeuge für gute Gedanken", en: "Tools for good thoughts" },
    description: {
      de: "Ein Messing-Kugelschreiber, der mit den Jahren Patina ansetzt, ein Notizbuch mit Ledereinband und ein Set Bleistifte. Stift und Notizbuch lassen sich gravieren.",
      en: "A brass ballpoint that gathers patina over the years, a leather-bound notebook and a set of pencils. Pen and notebook can be engraved.",
    },
    price: 145,
    tone: "#E3D6C2",
    items: [
      {
        id: "sd-pen",
        kind: "pen",
        name: { de: "Messing-Kugelschreiber", en: "Brass ballpoint pen" },
        maker: "Fabrikat Edition",
        engravingSurcharge: 14,
        engravingMaxLength: 12,
      },
      {
        id: "sd-notebook",
        kind: "notebook",
        name: { de: "Notizbuch mit Ledereinband", en: "Leather-bound notebook" },
        maker: "Buchbinderei Bern",
        engravingSurcharge: 16,
        engravingMaxLength: 3,
        preference: notebookPreference,
      },
      {
        id: "sd-pouch",
        kind: "pouch",
        name: { de: "Bleistift-Etui aus Canvas", en: "Canvas pencil pouch" },
        maker: "Atelier Zürich",
      },
    ],
  },
  {
    id: "werkzeug",
    name: { de: "Werkzeug fürs Leben", en: "Tools for Life" },
    tagline: { de: "Ein Messer, das Generationen begleitet", en: "A knife to pass down" },
    description: {
      de: "Ein Taschenmesser aus Schweizer Manufaktur mit Nussbaumgriff, ein Abziehstein und ein gewachstes Canvas-Etui. Die Klinge trägt auf Wunsch Initialen.",
      en: "A Swiss-made pocket knife with a walnut handle, a whetstone and a waxed canvas pouch. The blade can carry initials on request.",
    },
    price: 168,
    tone: "#DCD3C4",
    items: [
      {
        id: "wz-knife",
        kind: "knife",
        name: { de: "Taschenmesser Nussbaum", en: "Walnut pocket knife" },
        maker: "Messerschmiede Schwyz",
        engravingSurcharge: 18,
        engravingMaxLength: 4,
      },
      {
        id: "wz-stone",
        kind: "whetstone",
        name: { de: "Abziehstein", en: "Whetstone" },
        maker: "Fabrikat Edition",
      },
      {
        id: "wz-pouch",
        kind: "pouch",
        name: { de: "Gewachstes Canvas-Etui", en: "Waxed canvas pouch" },
        maker: "Atelier Zürich",
      },
    ],
  },
  {
    id: "vorrat",
    name: { de: "Alpine Vorratskammer", en: "Alpine Pantry" },
    tagline: { de: "Guter Geschmack aus den Bergen", en: "Good taste from the mountains" },
    description: {
      de: "Blütenhonig aus dem Wallis, Schokolade einer Zürcher Chocolaterie und ein Emaille-Becher. Ein Geschenk, das geteilt wird.",
      en: "Blossom honey from Valais, chocolate from a Zurich chocolatier and an enamel mug. A gift that gets shared.",
    },
    price: 72,
    tone: "#EFE3CF",
    items: [
      {
        id: "vo-honey",
        kind: "honey",
        name: { de: "Walliser Blütenhonig", en: "Valais blossom honey" },
        maker: "Bienen Saas",
      },
      {
        id: "vo-choc",
        kind: "chocolate",
        name: { de: "Tafelschokolade 70 %", en: "Dark chocolate bar 70%" },
        maker: "Chocolaterie Zürich",
      },
      {
        id: "vo-mug",
        kind: "mug",
        name: { de: "Emaille-Becher", en: "Enamel mug" },
        maker: "Fabrikat Edition",
      },
    ],
  },
  {
    id: "grand",
    name: { de: "Grand Atelier", en: "Grand Atelier" },
    tagline: { de: "Das vollständige Fabrikat-Erlebnis", en: "The complete Fabrikat experience" },
    description: {
      de: "Für Geschäftspartner und langjährige Mitarbeitende: Messing-Kugelschreiber und Leder-Notizbuch mit Gravur, Bienenwachskerze und Bio-Tee.",
      en: "For key partners and long-serving staff: engravable brass pen and leather notebook, beeswax candle and organic tea.",
    },
    price: 240,
    tone: "#E6DCCB",
    items: [
      {
        id: "ga-pen",
        kind: "pen",
        name: { de: "Messing-Kugelschreiber", en: "Brass ballpoint pen" },
        maker: "Fabrikat Edition",
        engravingSurcharge: 14,
        engravingMaxLength: 12,
      },
      {
        id: "ga-notebook",
        kind: "notebook",
        name: { de: "Notizbuch mit Ledereinband", en: "Leather-bound notebook" },
        maker: "Buchbinderei Bern",
        engravingSurcharge: 16,
        engravingMaxLength: 3,
        preference: notebookPreference,
      },
      {
        id: "ga-candle",
        kind: "candle",
        name: { de: "Bienenwachskerze", en: "Beeswax candle" },
        maker: "Imkerei Rüegsau",
      },
      {
        id: "ga-tea",
        kind: "tea",
        name: { de: "Bio-Tee in der Dose", en: "Organic tea tin" },
        maker: "Erboristi Ticino",
        preference: teaPreference,
      },
    ],
  },
];

export const WRAPPINGS: WrappingOption[] = [
  {
    id: "kraft-natural",
    name: { de: "Kraftpapier natur", en: "Natural kraft" },
    description: { de: "Ungebleicht, mit Baumwollkordel", en: "Unbleached, with cotton cord" },
    surcharge: 0,
    paper: "#C9A77C",
    ribbon: "#F4EDE1",
    pattern: "plain",
  },
  {
    id: "linen-cream",
    name: { de: "Leinenstruktur Creme", en: "Cream linen" },
    description: { de: "Strukturpapier mit Seidenband", en: "Textured paper, silk ribbon" },
    surcharge: 4.5,
    paper: "#EFE6D6",
    ribbon: "#8A5A3C",
    pattern: "linen",
  },
  {
    id: "forest",
    name: { de: "Tannengrün", en: "Fir green" },
    description: { de: "Tiefgrünes Papier, Goldkordel", en: "Deep green paper, gold cord" },
    surcharge: 3,
    paper: "#3E5245",
    ribbon: "#C8A96A",
    pattern: "plain",
  },
  {
    id: "midnight",
    name: { de: "Nachtblau gepunktet", en: "Midnight dots" },
    description: { de: "Blau mit feinem Punktdruck", en: "Blue with a fine dot print" },
    surcharge: 3,
    paper: "#2F3A4E",
    ribbon: "#E9E1D2",
    pattern: "dots",
  },
  {
    id: "gold-foil",
    name: { de: "Goldprägung", en: "Gold foil" },
    description: { de: "Handgeprägt im Atelier", en: "Hand-foiled in the atelier" },
    surcharge: 6.5,
    paper: "#E7DCC8",
    ribbon: "#B08D57",
    pattern: "foil",
  },
];

export const STICKERS: StickerOption[] = [
  {
    id: "none",
    name: { de: "Ohne Sticker", en: "No sticker" },
    surcharge: 0,
    motif: "none",
    color: "transparent",
  },
  {
    id: "christmas",
    name: { de: "Weihnachtsstern", en: "Christmas star" },
    surcharge: 0.8,
    motif: "star",
    color: "#9C3B2E",
  },
  {
    id: "winter-forest",
    name: { de: "Winterwald", en: "Winter forest" },
    surcharge: 0.8,
    motif: "fir",
    color: "#3E5245",
  },
  {
    id: "alpine",
    name: { de: "Alpenkette", en: "Alpine peaks" },
    surcharge: 0.8,
    motif: "peaks",
    color: "#2F3A4E",
  },
  {
    id: "merci",
    name: { de: "Merci", en: "Merci" },
    surcharge: 0.8,
    motif: "merci",
    color: "#8A5A3C",
  },
];

export const CARDS: CardOption[] = [
  {
    id: "classic",
    name: { de: "Klassisch", en: "Classic" },
    description: { de: "Digitaldruck auf Naturkarton", en: "Digital print on natural board" },
    surcharge: 0,
    stock: "#F7F2E8",
  },
  {
    id: "letterpress",
    name: { de: "Letterpress", en: "Letterpress" },
    description: {
      de: "Buchdruck mit spürbarer Prägung",
      en: "Letterpress with a tactile impression",
    },
    surcharge: 3.5,
    stock: "#FBF8F1",
  },
  {
    id: "deckle",
    name: { de: "Büttenrand", en: "Deckle edge" },
    description: {
      de: "Handgeschöpftes Papier mit Büttenrand",
      en: "Handmade paper with a deckle edge",
    },
    surcharge: 5,
    stock: "#F3ECDD",
  },
];

export const findTemplate = (id: string | null | undefined) =>
  GIFT_TEMPLATES.find((t) => t.id === id);
export const findWrapping = (id: string) => WRAPPINGS.find((w) => w.id === id) ?? WRAPPINGS[0]!;
export const findSticker = (id: string) => STICKERS.find((s) => s.id === id) ?? STICKERS[0]!;
export const findCard = (id: string) => CARDS.find((c) => c.id === id) ?? CARDS[0]!;
