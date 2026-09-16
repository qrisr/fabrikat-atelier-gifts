/** Visual previews for personalisation: wrapped parcel, greeting card, engraving. */
import { findCard, findSticker, findWrapping, type StickerOption, type WrappingOption } from "@/lib/catalog";
import type { Personalization } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function ParcelPreview({ personalization, className }: { personalization: Personalization; className?: string }) {
  const wrapping = findWrapping(personalization.wrappingId);
  const sticker = findSticker(personalization.stickerId);
  const id = `wrap-${wrapping.id}`;

  return (
    <svg viewBox="0 0 320 240" className={cn("block h-auto w-full", className)} role="img" aria-label={wrapping.name.en}>
      <defs>
        <PaperPattern id={id} wrapping={wrapping} />
      </defs>
      <rect width="320" height="240" fill="#EDE5D6" />
      <ellipse cx="160" cy="206" rx="118" ry="10" fill="#000" opacity="0.08" />
      {/* box: front and top */}
      <path d="M52 92h216v112H52z" fill={`url(#${id})`} />
      <path d="M52 92l30-30h216l-30 30z" fill={`url(#${id})`} />
      <path d="M52 92l30-30h216l-30 30z" fill="#fff" opacity="0.18" />
      <path d="M268 92l30-30v112l-30 30z" fill={`url(#${id})`} />
      <path d="M268 92l30-30v112l-30 30z" fill="#000" opacity="0.12" />
      {/* ribbon */}
      <path d="M150 92h14v112h-14z" fill={wrapping.ribbon} />
      <path d="M52 140h216v12H52z" fill={wrapping.ribbon} />
      <path d="M268 146l30-30v10l-30 30z" fill={wrapping.ribbon} opacity="0.85" />
      <path d="M165 62l-14 30h14l14-30z" fill={wrapping.ribbon} opacity="0.9" />
      <path d="M157 86c-26-26-52-10-34 2 8 5 22 2 34-2zM157 86c14-30 44-26 32-8-6 7-20 8-32 8z" fill="none" stroke={wrapping.ribbon} strokeWidth="6" />
      {sticker.motif !== "none" && <Sticker sticker={sticker} cx={96} cy={120} />}
    </svg>
  );
}

function PaperPattern({ id, wrapping }: { id: string; wrapping: WrappingOption }) {
  return (
    <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill={wrapping.paper} />
      {wrapping.pattern === "linen" && (
        <path d="M0 3h12M0 9h12M3 0v12M9 0v12" stroke="#000" strokeOpacity="0.05" strokeWidth="1" />
      )}
      {wrapping.pattern === "dots" && <circle cx="6" cy="6" r="1.1" fill="#E9E1D2" opacity="0.7" />}
      {wrapping.pattern === "foil" && <path d="M0 12L12 0" stroke={wrapping.ribbon} strokeOpacity="0.35" strokeWidth="1" />}
      {wrapping.pattern === "plain" && <path d="M0 6h12" stroke="#000" strokeOpacity="0.025" />}
    </pattern>
  );
}

export function Sticker({ sticker, cx, cy, r = 20 }: { sticker: StickerOption; cx: number; cy: number; r?: number }) {
  const s = r / 20;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <circle r="20" fill={sticker.color} />
      <circle r="17" fill="none" stroke="#F6EFE3" strokeWidth="0.8" opacity="0.8" />
      {sticker.motif === "star" && (
        <path d="M0-10l2.9 6 6.6.9-4.8 4.6 1.2 6.5L0 4.9-5.9 8l1.2-6.5-4.8-4.6 6.6-.9z" fill="#F6EFE3" />
      )}
      {sticker.motif === "fir" && (
        <path d="M0-11l6 8h-3l5 7h-3l4 6H-9l4-6h-3l5-7h-3zM-1 10h2v3h-2z" fill="#F6EFE3" />
      )}
      {sticker.motif === "peaks" && <path d="M-12 7l7-11 4 6 4-8 9 13z" fill="#F6EFE3" />}
      {sticker.motif === "merci" && (
        <text y="4" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="11" fill="#F6EFE3">
          Merci
        </text>
      )}
    </g>
  );
}

export function CardPreview({
  personalization,
  companyName,
  placeholder,
  className,
}: {
  personalization: Personalization;
  companyName: string;
  placeholder: string;
  className?: string;
}) {
  const card = findCard(personalization.cardId);
  const message = personalization.cardMessage.trim();

  return (
    <div
      className={cn(
        "relative flex aspect-[7/5] flex-col justify-between overflow-hidden p-[7%] text-[#3A2E25] shadow-[0_18px_30px_-22px_rgba(58,46,37,0.6)]",
        card.id === "deckle" && "[clip-path:polygon(0_1%,3%_0,8%_1%,15%_0,24%_1%,33%_0,45%_1%,58%_0,70%_1%,82%_0,92%_1%,100%_0,99%_12%,100%_30%,99%_52%,100%_75%,99%_92%,100%_100%,90%_99%,76%_100%,60%_99%,46%_100%,30%_99%,16%_100%,5%_99%,0_100%,1%_80%,0_60%,1%_40%,0_20%)]",
        className,
      )}
      style={{ backgroundColor: card.stock }}
      data-testid="card-preview"
    >
      {card.id === "letterpress" && (
        <div className="pointer-events-none absolute inset-[4%] border border-[#3A2E25]/15" aria-hidden="true" />
      )}
      <div className="flex min-h-[18%] items-start justify-between gap-4">
        {personalization.logoDataUrl ? (
          <img
            src={personalization.logoDataUrl}
            alt={companyName}
            className="max-h-10 max-w-[45%] object-contain grayscale-[35%] sm:max-h-12"
            data-testid="card-logo"
          />
        ) : (
          <span className="text-[0.625rem] uppercase tracking-[0.2em] text-[#3A2E25]/60">{companyName}</span>
        )}
      </div>
      <p
        className={cn(
          "font-display text-[clamp(0.85rem,2.2vw,1.15rem)] leading-snug",
          !message && "text-[#3A2E25]/40",
        )}
      >
        {message || placeholder}
      </p>
      <div className="flex items-end justify-between text-[0.5625rem] uppercase tracking-[0.2em] text-[#3A2E25]/50">
        <span>{personalization.logoDataUrl ? companyName : ""}</span>
        <span>Fabrikat · Zürich</span>
      </div>
    </div>
  );
}

export function EngravingPreview({ text, kind }: { text: string; kind: "pen" | "notebook" | "knife" | string }) {
  const surface = kind === "notebook" ? "#8A5A3C" : kind === "knife" ? "#C9CCCB" : "#B8924F";
  const ink = kind === "knife" ? "#4B4F4E" : kind === "notebook" ? "#D8B98A" : "#5E4722";
  return (
    <div
      className="flex h-10 items-center justify-center overflow-hidden rounded-full px-5 shadow-inner"
      style={{ backgroundColor: surface }}
      aria-hidden="true"
    >
      <span className="truncate font-display text-sm tracking-[0.18em]" style={{ color: ink, textShadow: "0 1px 0 rgba(255,255,255,0.25)" }}>
        {text || "·"}
      </span>
    </div>
  );
}
