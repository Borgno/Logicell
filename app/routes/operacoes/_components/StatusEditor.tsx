import { Check } from "lucide-react";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

const SEM_STATUS = "";

type StatusEditorProps = {
  value: string;
  // Opções ativas, na ordem cadastrada.
  opcoes: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
};

// Editor da célula de status: a lista fechada, com busca, já aberta. Escolher grava; Esc ou clicar
// fora fecha sem gravar. Status fora da lista (gravado antes dela ou de opção desativada) aparece no
// topo, só para mostrar o que estava, e não pode ser escolhido de novo.
export function StatusEditor({ value, opcoes, onSelect, onClose }: StatusEditorProps) {
  const [open, setOpen] = useState(true);
  const legado = value !== SEM_STATUS && !opcoes.includes(value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onClose();
      }}
    >
      <PopoverAnchor asChild>
        <div className="h-full w-full border-2 border-primary bg-card px-2 text-xs leading-[30px]">
          {value || "(sem status)"}
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-64 p-0">
        {/* O cmdk nomeia o campo pelo label do Command (aria-labelledby), não pelo aria-label. */}
        <Command label="Buscar status">
          <CommandInput placeholder="Buscar status..." />
          <CommandList>
            <CommandEmpty>Nenhum status.</CommandEmpty>
            <CommandGroup>
              {legado && (
                <CommandItem disabled value={`atual ${value}`}>
                  <span className="truncate">{value}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">fora da lista</span>
                </CommandItem>
              )}
              <CommandItem value="(sem status)" onSelect={() => onSelect(SEM_STATUS)}>
                <span className="text-muted-foreground">(sem status)</span>
              </CommandItem>
              {opcoes.map((opcao) => (
                <CommandItem key={opcao} value={opcao} onSelect={() => onSelect(opcao)}>
                  <span className="truncate">{opcao}</span>
                  <Check
                    size={14}
                    className={cn("ml-auto", opcao === value ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
