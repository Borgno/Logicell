import { PASTA_COLORS } from "~/lib/pastas";
import { cn } from "~/lib/utils";

type ColorFilterProps = {
  id?: string;
  value: string | null;
  onChange: (color: string | null) => void;
  className?: string;
};

// Bolinhas das cores de pasta. Clicar filtra por aquela cor; clicar de novo desliga.
export function ColorFilter({ id, value, onChange, className }: ColorFilterProps) {
  return (
    <div
      id={id}
      role="group"
      aria-label="Filtrar pastas por cor"
      className={cn("flex items-center gap-1.5", className)}
    >
      {PASTA_COLORS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          aria-pressed={value === option.value}
          title={option.label}
          onClick={() => onChange(value === option.value ? null : option.value)}
          className={cn(
            "size-4 shrink-0 rounded-full border-2 transition-transform duration-200 ease-ui",
            value === option.value
              ? "scale-125 border-foreground"
              : "border-transparent hover:scale-110",
          )}
          style={{ backgroundColor: option.value }}
        />
      ))}
    </div>
  );
}
