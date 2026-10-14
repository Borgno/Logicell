import { useQuery } from "@tanstack/react-query";
import type { SelectOption } from "~/components/patterns/SearchableSelect";
import type { User } from "~/types/user";
import { NO_SUPERVISOR } from "../_components/userForm";
import { supervisorsQuery } from "./users.queries";

// Opções do select de supervisor: "Sem supervisor" e os gestores ativos. O supervisor atual entra
// mesmo que tenha saído da lista, para o select não ficar em branco.
export function useSupervisorOptions(enabled: boolean, current?: User["supervisor"]) {
  const { data = [] } = useQuery({ ...supervisorsQuery, enabled });
  const options: SelectOption[] = [{ value: NO_SUPERVISOR, label: "Sem supervisor" }, ...data];
  if (current && !data.some((option) => option.value === current.id)) {
    options.push({ value: current.id, label: current.fullName });
  }
  return options;
}
