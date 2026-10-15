import { useQuery } from "@tanstack/react-query";
import { FolderInput, Inbox } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { DEFAULT_PASTA_COLOR, pastasQuery } from "~/lib/pastas";
import type { Escopo } from "../_hooks/operacoes.queries";

type MoverMenuProps = {
  escopo: Escopo;
  disabled: boolean;
  onMove: (destino: { pastaId: number | null; nome: string }) => void;
};

// Destinos do "Mover para": a Caixa de Entrada e todas as pastas, menos onde as operações já estão.
export function MoverMenu({ escopo, disabled, onMove }: MoverMenuProps) {
  const [open, setOpen] = useState(false);
  const { data: pastas = [] } = useQuery({ ...pastasQuery, enabled: open });

  function choose(destino: { pastaId: number | null; nome: string }) {
    setOpen(false);
    onMove(destino);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <FolderInput />
          Mover para
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Buscar pasta..." />
          <CommandList>
            <CommandEmpty>Nenhuma pasta encontrada.</CommandEmpty>
            <CommandGroup>
              {escopo !== "inbox" && (
                <CommandItem
                  value="Caixa de Entrada"
                  onSelect={() => choose({ pastaId: null, nome: "Caixa de Entrada" })}
                >
                  <Inbox />
                  Caixa de Entrada
                </CommandItem>
              )}
              {pastas
                .filter((pasta) => pasta.id !== escopo)
                .map((pasta) => (
                  <CommandItem
                    key={pasta.id}
                    value={pasta.nome}
                    onSelect={() => choose({ pastaId: pasta.id, nome: pasta.nome })}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: pasta.cor ?? DEFAULT_PASTA_COLOR }}
                    />
                    {pasta.nome}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
