import { useSyncExternalStore } from "react";

//Contador de requests em voo. A grid faz api.get manual (fora do React
//Query), então useIsFetching() sozinho não bastaria para acender a faixa do
//topo — request() em lib/api.ts chama iniciar()/terminar() em toda chamada,
//React Query ou manual, e useRequestsEmVoo() expõe o valor via
//useSyncExternalStore.
let emVoo = 0;
const listeners = new Set<() => void>();

function emitir() {
  for (const listener of listeners) listener();
}

export function iniciar(): void {
  emVoo += 1;
  emitir();
}

export function terminar(): void {
  emVoo = Math.max(0, emVoo - 1);
  emitir();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): number {
  return emVoo;
}

export function useRequestsEmVoo(): number {
  return useSyncExternalStore(subscribe, getSnapshot);
}
