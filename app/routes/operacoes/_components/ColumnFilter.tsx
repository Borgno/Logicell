import { Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { SearchableSelect } from "~/components/patterns/SearchableSelect";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { cn } from "~/lib/utils";
import type { ColunaGrid } from "../_lib/colunas";
import { filtroAtivo, type FiltroColuna, type TipoFiltro } from "../_hooks/useGridParams";

const TIPOS: { value: TipoFiltro; label: string; so?: (coluna: ColunaGrid) => boolean }[] = [
  { value: "contains", label: "Contém" },
  { value: "equals", label: "É igual a" },
  { value: "blank", label: "Vazio" },
  { value: "notBlank", label: "Não vazio" },
  { value: "period", label: "Período", so: (coluna) => coluna.tipo === "data" },
  { value: "antigos", label: "Emissão antiga", so: (coluna) => coluna.key === "dataEmissao" },
  { value: "duplicados", label: "Placa duplicada", so: (coluna) => coluna.key === "placa" },
];

const SEM_VALOR: TipoFiltro[] = ["blank", "notBlank", "antigos", "duplicados"];

// DD/MM/AAAA da URL e da API <-> AAAA-MM-DD do input de data.
const brParaInput = (br: string) => {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};
const inputParaBr = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

type ColumnFilterProps = {
  coluna: ColunaGrid;
  filtro: FiltroColuna | undefined;
  onChange: (filtro: FiltroColuna | null) => void;
};

function FilterForm({ coluna, filtro, onChange }: ColumnFilterProps) {
  const [tipo, setTipo] = useState<TipoFiltro>(filtro?.tipo ?? "contains");
  const [valor, setValor] = useState(filtro?.valor ?? "");
  // O texto digitado vai para a URL (e para a API) depois de uma pausa, não a cada tecla.
  const debounced = useDebouncedValue(valor);

  useEffect(() => {
    const next = { tipo, valor: SEM_VALOR.includes(tipo) ? "" : debounced };
    if (filtroAtivo(next)) {
      if (next.tipo !== filtro?.tipo || next.valor !== filtro?.valor) onChange(next);
    } else if (filtro) {
      onChange(null);
    }
  }, [tipo, debounced, filtro, onChange]);

  const [de = "", ate = ""] = tipo === "period" ? valor.split(";") : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          Filtrar {coluna.label}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            setValor("");
            setTipo("contains");
            onChange(null);
          }}
        >
          Limpar
        </Button>
      </div>
      <SearchableSelect
        aria-label="Tipo de filtro"
        value={tipo}
        onChange={(value) => {
          setTipo(value as TipoFiltro);
          if (value === "period" || tipo === "period") setValor("");
        }}
        options={TIPOS.filter((item) => !item.so || item.so(coluna))}
        searchPlaceholder="Buscar tipo..."
      />
      {tipo === "period" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs font-bold">
            De
            <Input
              type="date"
              value={brParaInput(de)}
              onChange={(event) => setValor(`${inputParaBr(event.target.value)};${ate}`)}
            />
          </label>
          <label className="space-y-1 text-xs font-bold">
            Até
            <Input
              type="date"
              value={brParaInput(ate)}
              onChange={(event) => setValor(`${de};${inputParaBr(event.target.value)}`)}
            />
          </label>
        </div>
      ) : (
        !SEM_VALOR.includes(tipo) && (
          <>
            <Input
              autoFocus
              aria-label="Valor do filtro"
              placeholder={coluna.tipo === "data" ? "DD/MM/AAAA" : "Digite o valor"}
              value={valor}
              onChange={(event) => setValor(event.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Separe por vírgula para buscar mais de um valor.
            </p>
          </>
        )
      )}
    </div>
  );
}

// Botão de filtro no cabeçalho da coluna: discreto até passar o mouse, marcado quando há filtro.
export function ColumnFilter(props: ColumnFilterProps) {
  const active = filtroAtivo(props.filtro);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filtrar ${props.coluna.label}`}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          className={cn(
            "shrink-0 rounded-md p-1 transition-colors duration-200 ease-ui",
            active
              ? "bg-primary/15 text-primary"
              : "text-transparent group-hover/header:text-muted-foreground hover:bg-accent focus-visible:text-muted-foreground",
          )}
        >
          <Filter size={13} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72" onClick={(event) => event.stopPropagation()}>
        <FilterForm {...props} />
      </PopoverContent>
    </Popover>
  );
}
