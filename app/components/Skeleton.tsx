import type { HTMLAttributes } from "react";
import { cn } from "~/utils/cn";

//Bloco cinza pulsando com a forma do conteúdo que vai aparecer — usado em vez
//de um texto de carregamento, para o conteúdo nunca "sumir" da tela.
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-xl bg-skeleton", className)} {...props} />;
}
