import { Check, ChevronLeft, ChevronRight, Filter, Plus, X } from "lucide-react";
import { useState } from "react";
import type { SelectOption } from "~/components/patterns/SearchableSelect";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { FILTRO_VAZIO } from "../_lib/cubo";
import type { Filtros, Opcoes } from "../_hooks/dashboard.queries";

type CampoLista = "faturista" | "pasta" | "cliente" | "status" | "tipo" | "tipoCte" | "agencia";
type Campo = "periodo" | CampoLista;

export type FiltrosPatch = Partial<Record<keyof Filtros, string | null>>;

// Os valores "sem", "inbox" e de vazio entram no fim de cada lista, como no sistema antigo.
const CAMPOS_LISTA: {
  campo: CampoLista;
  label: string;
  opcoes: (o: Opcoes, gestor: boolean) => SelectOption[];
  soGestor?: boolean;
}[] = [
  {
    campo: "faturista",
    label: "Faturista",
    soGestor: true,
    opcoes: (o) => [
      ...o.faturistas.map((f) => ({ value: f.id, label: f.nome })),
      { value: "sem", label: "Sem faturista" },
    ],
  },
  {
    campo: "pasta",
    label: "Pasta",
    // Supervisor e admin veem a Caixa de Entrada; o usuário comum só as pastas dele.
    opcoes: (o, gestor) => [
      ...o.pastas.map((p) => ({ value: String(p.id), label: p.nome })),
      ...(gestor ? [{ value: "inbox", label: "Caixa de Entrada" }] : []),
    ],
  },
  {
    campo: "cliente",
    label: "Cliente",
    opcoes: (o) => o.clientes.map((c) => ({ value: c, label: c })),
  },
  {
    campo: "status",
    label: "Status",
    opcoes: (o) => [
      ...o.status.map((s) => ({ value: s, label: s })),
      { value: FILTRO_VAZIO, label: "Sem status" },
    ],
  },
  {
    campo: "tipo",
    label: "Tipo",
    opcoes: (o) => [
      ...o.tipos.map((t) => ({ value: t, label: t })),
      { value: FILTRO_VAZIO, label: "Não informado" },
    ],
  },
  {
    campo: "tipoCte",
    label: "Tipo de CTe",
    opcoes: (o) => [
      ...o.tiposCte.map((t) => ({ value: t, label: t })),
      { value: FILTRO_VAZIO, label: "Não informado" },
    ],
  },
  {
    campo: "agencia",
    label: "Agência",
    opcoes: (o) => [
      ...o.agencias.map((a) => ({ value: a, label: a })),
      { value: FILTRO_VAZIO, label: "Sem agência" },
    ],
  },
];

const LABEL_PERIODO = "Período de emissão";

// Listas grandes (cliente passa de milhares) travam o menu se renderizadas inteiras; a busca refina.
const MAX_OPCOES = 200;

const isoParaBr = (iso: string) => iso.split("-").reverse().join("/");

function rotuloPeriodo(de?: string, ate?: string): string {
  if (de && ate) return de === ate ? isoParaBr(de) : `${isoParaBr(de)} a ${isoParaBr(ate)}`;
  return de ? `a partir de ${isoParaBr(de)}` : `até ${isoParaBr(ate ?? "")}`;
}

// As datas só valem no "Aplicar": cada troca dispara a consulta do dashboard, e o input de data
// muda a cada dígito digitado no ano.
function PainelPeriodo({
  de: deInicial = "",
  ate: ateInicial = "",
  onAplicar,
}: {
  de?: string;
  ate?: string;
  onAplicar: (de: string, ate: string) => void;
}) {
  const [de, setDe] = useState(deInicial);
  const [ate, setAte] = useState(ateInicial);
  const invalido = !!de && !!ate && de > ate;

  return (
    <div className="flex flex-col gap-3 p-3">
      <label className="flex flex-col gap-1.5 text-xs font-bold text-muted-foreground">
        De
        <Input
          type="date"
          value={de}
          max={ate || undefined}
          onChange={(e) => setDe(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-bold text-muted-foreground">
        Até
        <Input
          type="date"
          value={ate}
          min={de || undefined}
          onChange={(e) => setAte(e.target.value)}
        />
      </label>
      {invalido && <p className="text-xs text-destructive">A data inicial é depois da final.</p>}
      <Button size="sm" disabled={invalido || (!de && !ate)} onClick={() => onAplicar(de, ate)}>
        Aplicar
      </Button>
    </div>
  );
}

type MenuProps = {
  campos: typeof CAMPOS_LISTA;
  campoInicial: Campo | null;
  filtros: Filtros;
  opcoes: Opcoes | undefined;
  gestor: boolean;
  onAplicar: (patch: FiltrosPatch) => void;
};

// Primeiro a lista de campos; escolhido o campo, as opções dele com busca, ou as datas do período.
function MenuFiltro({ campos, campoInicial, filtros, opcoes, gestor, onAplicar }: MenuProps) {
  const [campo, setCampo] = useState<Campo | null>(campoInicial);
  const def = campos.find((c) => c.campo === campo);

  if (campo === null) {
    return (
      <div className="p-1.5">
        <p className="px-2.5 pt-1.5 pb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          Filtrar por
        </p>
        {[{ campo: "periodo" as const, label: LABEL_PERIODO }, ...campos].map((c) => {
          const ativo = c.campo === "periodo" ? !!(filtros.de || filtros.ate) : !!filtros[c.campo];
          return (
            <button
              key={c.campo}
              type="button"
              onClick={() => setCampo(c.campo)}
              className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm font-bold transition-colors hover:bg-muted"
            >
              {c.label}
              <span className="flex items-center gap-1.5">
                {ativo && <span className="size-1.5 rounded-full bg-primary" />}
                <ChevronRight size={14} className="text-muted-foreground" />
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const voltar = (
    <button
      type="button"
      onClick={() => setCampo(null)}
      aria-label="Voltar"
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ChevronLeft size={14} />
    </button>
  );

  if (campo === "periodo") {
    return (
      <div>
        <div className="flex items-center gap-2 border-b px-2 py-2">
          {voltar}
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            {LABEL_PERIODO}
          </span>
        </div>
        <PainelPeriodo
          de={filtros.de}
          ate={filtros.ate}
          onAplicar={(de, ate) => onAplicar({ de: de || null, ate: ate || null })}
        />
      </div>
    );
  }

  const lista = def && opcoes ? def.opcoes(opcoes, gestor) : [];
  const atual = filtros[campo];
  return (
    <Command>
      <div className="flex items-center gap-1 border-b pb-1 pl-1 [&_[data-slot=command-input-wrapper]]:flex-1">
        {voltar}
        <CommandInput
          autoFocus
          placeholder={`Buscar ${def?.label.toLowerCase()}...`}
          aria-label={`Buscar ${def?.label.toLowerCase()}`}
        />
      </div>
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup>
          {lista.slice(0, MAX_OPCOES).map((o) => (
            <CommandItem
              key={o.value}
              value={`${o.label} ${o.value}`}
              onSelect={() => onAplicar({ [campo]: o.value === atual ? null : o.value })}
            >
              <Check className={cn("size-4", o.value === atual ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{o.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {lista.length > MAX_OPCOES && (
          <p className="px-2.5 py-2 text-center text-xs text-muted-foreground">
            Mostrando {MAX_OPCOES} de {lista.length}. Refine a busca.
          </p>
        )}
      </CommandList>
    </Command>
  );
}

type FiltrosBarProps = {
  filtros: Filtros;
  opcoes: Opcoes | undefined;
  // Supervisor e admin filtram por faturista e veem a Caixa de Entrada; o usuário comum só as dele.
  gestor: boolean;
  onChange: (patch: FiltrosPatch) => void;
  onLimpar: () => void;
};

// Barra no padrão do sistema antigo: só o "Adicionar filtro", e cada filtro escolhido vira um chip
// que reabre o menu no próprio campo.
export function FiltrosBar({ filtros, opcoes, gestor, onChange, onLimpar }: FiltrosBarProps) {
  // null = menu fechado; "novo" = abre na lista de campos; campo = edita o chip.
  const [menu, setMenu] = useState<Campo | "novo" | null>(null);
  const campos = CAMPOS_LISTA.filter((c) => gestor || !c.soGestor);
  const soAntigas = filtros.antigas === "true";
  const temFiltro = Object.keys(filtros).length > 0;

  const aplicar = (patch: FiltrosPatch) => {
    onChange(patch);
    setMenu(null);
  };

  const chips: { campo: Campo; label: string; valor: string }[] = [];
  if (filtros.de || filtros.ate) {
    chips.push({
      campo: "periodo",
      label: LABEL_PERIODO,
      valor: rotuloPeriodo(filtros.de, filtros.ate),
    });
  }
  for (const c of campos) {
    const valor = filtros[c.campo];
    if (!valor) continue;
    const label = opcoes
      ? c.opcoes(opcoes, gestor).find((o) => o.value === valor)?.label
      : undefined;
    chips.push({ campo: c.campo, label: c.label, valor: label ?? valor });
  }

  const conteudo = (campoInicial: Campo | null) => (
    <PopoverContent align="start" collisionPadding={16} className="w-72 gap-0 p-0">
      <MenuFiltro
        campos={campos}
        campoInicial={campoInicial}
        filtros={filtros}
        opcoes={opcoes}
        gestor={gestor}
        onAplicar={aplicar}
      />
    </PopoverContent>
  );

  return (
    <section
      aria-label="Filtros"
      className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border bg-card px-4 py-3 shadow-card"
    >
      {chips.map((chip) => (
        <Popover
          key={chip.campo}
          open={menu === chip.campo}
          onOpenChange={(open) => setMenu(open ? chip.campo : null)}
        >
          <div className="flex h-8 items-center overflow-hidden rounded-lg bg-primary/10 text-xs">
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-full max-w-[260px] items-center gap-1 pr-1.5 pl-2.5 transition-opacity hover:opacity-80"
              >
                <span className="text-muted-foreground">{chip.label}:</span>
                <span className="truncate font-bold text-primary">{chip.valor}</span>
              </button>
            </PopoverTrigger>
            <button
              type="button"
              aria-label={`Remover filtro ${chip.label}`}
              onClick={() =>
                onChange(
                  chip.campo === "periodo" ? { de: null, ate: null } : { [chip.campo]: null },
                )
              }
              className="h-full px-1.5 text-primary opacity-70 transition-opacity hover:opacity-100"
            >
              <X size={13} />
            </button>
          </div>
          {menu === chip.campo && conteudo(chip.campo)}
        </Popover>
      ))}

      <Popover open={menu === "novo"} onOpenChange={(open) => setMenu(open ? "novo" : null)}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="border-dashed">
            <Filter />
            {chips.length === 0 ? "Adicionar filtro" : "Filtro"}
            <Plus />
          </Button>
        </PopoverTrigger>
        {menu === "novo" && conteudo(null)}
      </Popover>

      {temFiltro && (
        <Button variant="ghost" size="sm" onClick={onLimpar}>
          Limpar
        </Button>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={soAntigas}
        onClick={() => onChange({ antigas: soAntigas ? null : "true" })}
        className={cn(
          "ml-auto flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors",
          soAntigas
            ? "border-transparent bg-warning/15 text-warning"
            : "bg-muted text-muted-foreground hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "relative h-4 w-7 rounded-full transition-colors",
            soAntigas ? "bg-warning" : "bg-muted-foreground",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-3 rounded-full bg-white shadow transition-transform",
              soAntigas && "translate-x-3",
            )}
          />
        </span>
        Só emissões antigas
      </button>
    </section>
  );
}
