// Ordenação da query (?sort=-nome): o campo sem o sinal e a direção no formato do orderBy do Prisma.
export function parseSort(sort: string) {
  const direction: "asc" | "desc" = sort.startsWith("-") ? "desc" : "asc";
  return { field: sort.replace(/^-/, ""), direction };
}
