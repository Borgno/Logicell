import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

//Junta classes condicionais (clsx) e resolve conflitos do Tailwind (twMerge).
//Vários arquivos já redeclaram essa função localmente; não refatorar os
//outros para usar esta.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
