/** Quiet line illustrations for welcome and empty states. */
import { cn } from "@/lib/utils";

export function WelcomeIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 200"
      className={cn("mx-auto block h-auto w-full max-w-[26rem]", className)}
      aria-hidden="true"
    >
      <ellipse cx="160" cy="176" rx="130" ry="9" fill="#3A2E25" opacity="0.06" />
      {/* fir sprig */}
      <path
        d="M40 170c20-26 44-44 76-54"
        stroke="#3E5245"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(${52 + i * 13} ${154 - i * 9}) rotate(${-30 + i * 2})`}>
          <path d="M0 0l-10-12M0 0l12-8" stroke="#3E5245" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ))}
      {/* parcel */}
      <rect x="112" y="82" width="104" height="90" rx="2" fill="#C9A77C" />
      <rect x="112" y="82" width="104" height="90" rx="2" fill="url(#kraft)" opacity="0.4" />
      <rect x="158" y="82" width="12" height="90" fill="#F4EDE1" />
      <rect x="112" y="120" width="104" height="10" fill="#F4EDE1" />
      <path
        d="M164 82c-18-22-40-16-30-4 6 6 20 5 30 4zM164 82c18-22 40-16 30-4-6 6-20 5-30 4z"
        fill="none"
        stroke="#F4EDE1"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <circle cx="140" cy="150" r="11" fill="#9C3B2E" />
      <path
        d="M140 143l2 4.2 4.6.6-3.3 3.2.8 4.5-4.1-2.2-4.1 2.2.8-4.5-3.3-3.2 4.6-.6z"
        fill="#F6EFE3"
      />
      {/* card */}
      <g transform="translate(212 112) rotate(8)">
        <rect width="70" height="52" rx="1.5" fill="#FBF8F1" stroke="#E3D9C8" />
        <path
          d="M12 20h40M12 28h30M12 36h36"
          stroke="#B9AE97"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>
      {/* sparkles */}
      {[
        [96, 58, 1],
        [236, 64, 0.8],
        [268, 96, 0.6],
        [76, 96, 0.7],
      ].map(([x, y, s], i) => (
        <path
          key={i}
          transform={`translate(${x} ${y}) scale(${s})`}
          d="M0-8v16M-8 0h16"
          stroke="#B08D57"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ))}
      <defs>
        <pattern id="kraft" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 6L6 0" stroke="#8A6A45" strokeWidth="0.5" opacity="0.4" />
        </pattern>
      </defs>
    </svg>
  );
}
