/**
 * Illustrated still life of a gift set, drawn from the template's item kinds.
 * Stand-in for Fabrikat product photography.
 */
import type { ReactNode } from "react";

import type { GiftTemplate, ItemKind } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const INK = "#3A2E25";
const BRASS = "#B8924F";
const LEATHER = "#8A5A3C";
const CREAM = "#F6EFE3";

/** Each drawing sits on a baseline at y=0 and is centred on x=0. */
const drawings: Record<ItemKind, { width: number; node: ReactNode }> = {
  candle: {
    width: 70,
    node: (
      <g>
        <rect x="-26" y="-96" width="52" height="96" rx="3" fill="#E9C77B" />
        <rect x="-26" y="-96" width="52" height="96" rx="3" fill="url(#honeycomb)" opacity="0.35" />
        <path d="M0-96v-10" stroke={INK} strokeWidth="2" />
        <path d="M0-126c7 8 6 17 0 19-6-2-7-11 0-19z" fill="#E88A3A" />
      </g>
    ),
  },
  tea: {
    width: 70,
    node: (
      <g>
        <rect x="-28" y="-84" width="56" height="84" rx="4" fill="#4E6250" />
        <rect x="-28" y="-92" width="56" height="12" rx="3" fill="#3E5245" />
        <rect x="-20" y="-60" width="40" height="30" fill={CREAM} />
        <path d="M-12-45h24M-12-38h16" stroke={INK} strokeWidth="1.5" />
      </g>
    ),
  },
  notebook: {
    width: 110,
    node: (
      <g>
        <rect x="-50" y="-22" width="100" height="22" rx="2" fill={CREAM} />
        <rect x="-52" y="-26" width="104" height="8" rx="2" fill={LEATHER} />
        <rect x="-52" y="-4" width="104" height="6" rx="2" fill="#6F4630" />
        <path d="M30-26v30" stroke="#C8A96A" strokeWidth="3" />
      </g>
    ),
  },
  pen: {
    width: 120,
    node: (
      <g transform="rotate(-8)">
        <rect x="-55" y="-10" width="96" height="9" rx="4.5" fill={BRASS} />
        <path d="M41-10l16 4.5-16 4.5z" fill="#8F6F37" />
        <rect x="-40" y="-14" width="30" height="3" rx="1.5" fill="#8F6F37" />
      </g>
    ),
  },
  knife: {
    width: 120,
    node: (
      <g>
        <rect x="-55" y="-16" width="80" height="16" rx="8" fill="#6B4A32" />
        <path d="M-50-8h70" stroke="#4F3524" strokeWidth="1" opacity="0.5" />
        <path d="M25-14h32c4 0 6 3 3 6l-6 6H25z" fill="#C9CCCB" />
        <circle cx="-42" cy="-8" r="3" fill="#C9CCCB" />
      </g>
    ),
  },
  mug: {
    width: 80,
    node: (
      <g>
        <path d="M-26-64h52v58c0 4-3 6-6 6h-40c-3 0-6-2-6-6z" fill={CREAM} />
        <path d="M-26-64h52v6h-52z" fill="#2F3A4E" />
        <path d="M26-50c16 0 16 26 0 26" fill="none" stroke={CREAM} strokeWidth="7" />
        <path d="M-24-64c0-2 1-3 3-3h42c2 0 3 1 3 3" stroke="#2F3A4E" strokeWidth="3" fill="none" />
      </g>
    ),
  },
  honey: {
    width: 70,
    node: (
      <g>
        <rect x="-26" y="-70" width="52" height="70" rx="8" fill="#D99A2B" opacity="0.9" />
        <rect x="-28" y="-84" width="56" height="16" rx="3" fill={CREAM} />
        <path d="M-28-76h56" stroke={INK} strokeWidth="1" opacity="0.4" />
        <rect x="-16" y="-48" width="32" height="22" fill={CREAM} />
      </g>
    ),
  },
  pouch: {
    width: 110,
    node: (
      <g>
        <path d="M-50-40h100v36c0 2-2 4-4 4h-92c-2 0-4-2-4-4z" fill="#B7A68A" />
        <path d="M-50-40h100l-50 20z" fill="#A69477" />
        <circle cx="0" cy="-22" r="4" fill={LEATHER} />
      </g>
    ),
  },
  whetstone: {
    width: 100,
    node: (
      <g>
        <rect x="-45" y="-18" width="90" height="18" rx="2" fill="#8F9A8C" />
        <rect x="-45" y="-26" width="90" height="10" rx="2" fill="#B4552F" opacity="0.85" />
      </g>
    ),
  },
  chocolate: {
    width: 100,
    node: (
      <g transform="rotate(4)">
        <rect x="-45" y="-14" width="90" height="14" rx="2" fill="#5A3A2A" />
        <rect x="-45" y="-14" width="56" height="14" fill="#C8A96A" />
        <path d="M-40-7h40" stroke={INK} strokeWidth="1.2" opacity="0.6" />
      </g>
    ),
  },
  napkin: {
    width: 100,
    node: (
      <g>
        <rect x="-45" y="-12" width="90" height="12" rx="2" fill="#E4DCCB" />
        <rect x="-45" y="-20" width="90" height="10" rx="2" fill="#D6CBB5" />
        <path d="M-45-15h90" stroke="#B9AE97" strokeDasharray="3 3" />
      </g>
    ),
  },
  matches: {
    width: 60,
    node: (
      <g>
        <rect x="-24" y="-16" width="48" height="16" rx="1.5" fill="#2F3A4E" />
        <rect x="-24" y="-16" width="48" height="5" fill="#9C3B2E" />
        <circle cx="12" cy="-6" r="3" fill={CREAM} />
      </g>
    ),
  },
};

export function ProductArt({
  template,
  className,
  label,
  crop = false,
}: {
  template: Pick<GiftTemplate, "items" | "tone">;
  className?: string;
  label?: string;
  /** Wide, shallower frame for compact cards. */
  crop?: boolean;
}) {
  const items = template.items.slice(0, 4);
  const total = items.reduce((sum, item) => sum + drawings[item.kind].width, 0) + (items.length - 1) * 14;
  let cursor = 200 - total / 2;

  return (
    <svg
      viewBox={crop ? "0 40 400 180" : "0 0 400 260"}
      preserveAspectRatio="xMidYMid slice"
      className={cn("block h-auto w-full", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <pattern id="honeycomb" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 4h8M4 0v8" stroke="#B8862F" strokeWidth="0.6" />
        </pattern>
        <radialGradient id="light" cx="30%" cy="20%" r="90%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill={template.tone} />
      <rect width="400" height="260" fill="url(#light)" />
      <rect y="196" width="400" height="64" fill="#000" opacity="0.045" />
      {items.map((item) => {
        const { width, node } = drawings[item.kind];
        const x = cursor + width / 2;
        cursor += width + 14;
        return (
          <g key={item.id} transform={`translate(${x} 206)`}>
            <ellipse cx="0" cy="2" rx={width / 2} ry="5" fill="#000" opacity="0.08" />
            {node}
          </g>
        );
      })}
    </svg>
  );
}
