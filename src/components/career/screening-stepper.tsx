import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Skrining Umum",
  "Pertanyaan AI",
  "Jawab Detail",
  "Proses AI",
  "Hasil",
];

/** `current` is 1-based, following the user flow in the spec. */
export function ScreeningStepper({ current }: { current: number }) {
  return (
    <ol className="flex w-full items-start" aria-label="Tahapan skrining">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li
            key={label}
            className="relative flex flex-1 flex-col items-center gap-2 text-center"
            aria-current={active ? "step" : undefined}
          >
            {index > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2",
                  step <= current ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary bg-background text-primary",
                !done && !active && "border-border bg-background text-muted-foreground",
              )}
            >
              {done ? <Check className="size-4" /> : step}
            </span>
            <span
              className={cn(
                "hidden text-xs sm:block",
                active ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
