import { X } from "lucide-react";
import { SearchableSelect, type SelectOption } from "~/components/patterns/SearchableSelect";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { FILTRO_VAZIO } from "../_lib/cubo";
import type { Filtros, Opcoes } from "../_hooks/dashboard.queries";

type Campo = "faturista" | "pasta" | "cliente" | "status" | "tipo" | "tipoCte" | "agencia";

// Os valores "sem", "inbox" e de vazio entram no fim de cada lista, como no sistema antigo.
const CAMPOS: {
  campo: Campo;
  label: string;
  todos: string;
  opcoes: (o: Opcoes) => SelectOption[];
  soGestor?: boolean;
}[] = [
  {
    campo: "faturista",
    label: "Faturista",
    todos: "Todos os faturistas",
    soGestor: true,
    opcoes: (o) => [
      ...o.faturistas.map((f) => ({ value: f.id, label: f.nome })),
      { value: "sem", label: "Sem faturista" },
    ],
  },
  {
    campo: "pasta",
    label: "Pasta",
    todos: "Todas as pastas",
    opcoes: (o) => o.pastas.map((p) => ({ value: String(p.id), label: p.nome })),
  },
  {
    campo: "cliente",
    label: "Cliente",
    todos: "Todos os clientes",
    opcoes: (o) => o.clientes.map((c) => ({ value: c, label: c })),
  },
  {
    campo: "status",
    label: "Status",
    todos: "Todos os status",
    opcoes: (o) => [
      ...o.status.map((s) => ({ value: s, label: s })),
      { value: FILTRO_VAZIO, label: "Sem status" },
    ],
  },
  {
    campo: "tipo",
    label: "Tipo",
    todos: "Todos os tipos",
    opcoes: (o) => [
      ...o.tipos.map((t) => ({ value: t, label: t })),
      { value: FILTRO_VAZIO, label: "Não informado" },
    ],
  },
  {
    campo: "tipoCte",
    label: "Tipo de CTe",
    todos: "Todos os tipos de CTe",
    opcoes: (o) => [
      ...o.tiposCte.map((t) => ({ value: t, label: t })),
      { value: FILTRO_VAZIO, label: "Não informado" },
    ],
  },
  {
    campo: "agencia",
    label: "Agência",
    todos: "Todas as agências",
    opcoes: (o) => [
      ...o.agencias.map((a) => ({ value: a, label: a })),
      { value: FILTRO_VAZIO, label: "Sem agência" },
    ],
  },
];

const TODOS = "__todos__";

type FiltrosBarProps = {
  filtros: Filtros;
  opcoes: Opcoes | undefined;
  // Supervisor e admin filtram por faturista e veem a Caixa de Entrada; o usuário comum só as dele.
  gestor: boolean;
  onChange: (campo: keyof Filtros, valor: string | null) => void;
  onLimpar: () => void;
};

export function FiltrosBar({ filtros, opcoes, gestor, onChange, onLimpar }: FiltrosBarProps) {
  const ativos = Object.keys(filtros).length > 0;
  return (
    <section aria-label="Filtros" className="mb-6 rounded-2xl border bg-card p-4 shadow-card">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CAMPOS.filter((item) => gestor || !item.soGestor).map((item) => {
          const lista = opcoes ? item.opcoes(opcoes) : [];
          const comInbox =
            item.campo === "pasta" && gestor
              ? [...lista, { value: "inbox", label: "Caixa de Entrada" }]
              : lista;
          return (
            <SearchableSelect
              key={item.campo}
              aria-label={item.label}
              value={filtros[item.campo] ?? TODOS}
              onChange={(value) => onChange(item.campo, value === TODOS ? null : value)}
              options={[{ value: TODOS, label: item.todos }, ...comInbox]}
              searchPlaceholder={`Buscar ${item.label.toLowerCase()}...`}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="grid w-full grid-cols-[auto_1fr_auto_1fr] items-center gap-2 text-xs font-bold sm:flex sm:w-auto">
          <span>Emissão de</span>
          <Input
            type="date"
            aria-label="Emissão a partir de"
            className="h-9 min-w-0 sm:w-40"
            value={filtros.de ?? ""}
            onChange={(event) => onChange("de", event.target.value || null)}
          />
          <span>até</span>
          <Input
            type="date"
            aria-label="Emissão até"
            className="h-9 min-w-0 sm:w-40"
            value={filtros.ate ?? ""}
            onChange={(event) => onChange("ate", event.target.value || null)}
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold">
          <input
            type="checkbox"
            className="accent-primary"
            checked={filtros.antigas === "true"}
            onChange={(event) => onChange("antigas", event.target.checked ? "true" : null)}
          />
          Só emissões antigas
        </label>
        {ativos && (
          <Button variant="ghost" size="sm" onClick={onLimpar}>
            <X />
            Limpar filtros
          </Button>
        )}
      </div>
    </section>
  );
}
