import { useRequestsEmVoo } from "~/lib/loading";

//Faixa fina no topo que acende enquanto há alguma request em voo (grid,
//dashboard, troca de página lazy, polls em segundo plano). Sutil (2px) e
//indeterminada — não representa progresso real, só "algo está carregando".
export function TopProgress() {
  const emVoo = useRequestsEmVoo();
  if (emVoo === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[10002] h-0.5 overflow-hidden pointer-events-none"
    >
      <div className="h-full bg-primary animate-loading" />
      <span className="sr-only">Carregando</span>
    </div>
  );
}
