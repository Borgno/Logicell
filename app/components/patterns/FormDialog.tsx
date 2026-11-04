import { Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  // lg para formulário com muitos campos: mais largo, e o corpo rola dentro da tela.
  size?: "md" | "lg";
  children: React.ReactNode;
};

// Formulário curto em modal (criar um registro). Esc e clique fora fecham, exceto durante o envio.
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  isPending,
  onSubmit,
  size = "md",
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent
        className={cn(
          "rounded-3xl p-8",
          size === "md" ? "sm:max-w-md" : "max-h-[92vh] overflow-y-auto sm:max-w-2xl",
        )}
      >
        {/* min-w-0: o DialogContent é grid, e sem isso um texto com truncate alarga o form além do
            modal no celular. */}
        <form onSubmit={onSubmit} noValidate className="min-w-0 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4">{children}</div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="solid" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
