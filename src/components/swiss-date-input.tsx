/**
 * Date field that always shows DD.MM.YYYY (native date inputs follow the
 * browser locale). Stores ISO YYYY-MM-DD; typing and a calendar both work.
 */
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatSwissDate, useI18n } from "@/lib/i18n";

export function parseSwissDate(value: string): string | null {
  const match = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(value);
  if (!match) return null;
  const [, d, mo, y] = match;
  const iso = `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso;
}

const toDate = (iso: string) => (iso ? new Date(`${iso}T12:00:00`) : undefined);
const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function SwissDateInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  invalidMessage,
}: {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalidMessage?: (message: string | null) => void;
}) {
  const { m, lang } = useI18n();
  const [text, setText] = useState(formatSwissDate(value) === "–" ? "" : formatSwissDate(value));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const formatted = value ? formatSwissDate(value) : "";
    setText((current) => (parseSwissDate(current) === value ? current : formatted));
  }, [value]);

  return (
    <div className="relative sm:max-w-xs">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder={m.date.placeholder}
        value={text}
        disabled={disabled}
        className="pr-12"
        onChange={(event) => {
          setText(event.target.value);
          const iso = parseSwissDate(event.target.value);
          if (iso) {
            invalidMessage?.(null);
            onChange(iso);
          }
        }}
        onBlur={() => {
          if (text.trim() === "") onChange("");
          else if (!parseSwissDate(text)) invalidMessage?.(m.date.invalid);
          onBlur?.();
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={m.date.open}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <CalendarDays className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            weekStartsOn={1}
            lang={lang}
            {...(value ? { selected: toDate(value)!, defaultMonth: toDate(value)! } : {})}
            onSelect={(date) => {
              if (!date) return;
              onChange(toIso(date));
              setText(formatSwissDate(toIso(date)));
              invalidMessage?.(null);
              setOpen(false);
            }}
            formatters={{
              formatCaption: (date) =>
                date.toLocaleDateString(lang === "de" ? "de-CH" : "en-GB", {
                  month: "long",
                  year: "numeric",
                }),
              formatWeekdayName: (date) =>
                date
                  .toLocaleDateString(lang === "de" ? "de-CH" : "en-GB", { weekday: "short" })
                  .slice(0, 2),
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
