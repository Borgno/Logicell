import type { Response } from "express";

//Header Server-Timing: mostra no DevTools quanto tempo cada etapa gastou no
//servidor (auth, db, app) sem precisar abrir o log do Dokploy. iniciarTiming
//roda cedo (middleware do router api); marcar registra uma etapa já medida
//por fora; aplicarServerTiming monta o header antes do res.json.
interface Marca { nome: string; dur: number }

export function iniciarTiming(res: Response): void {
  res.locals.timing = { t0: Date.now(), marcas: [] as Marca[] };
}

export function marcar(res: Response, nome: string, inicio: number): void {
  const timing = res.locals.timing;
  if (!timing) return;
  timing.marcas.push({ nome, dur: Date.now() - inicio });
}

export function aplicarServerTiming(res: Response): void {
  const timing = res.locals.timing;
  if (!timing) return;
  const partes = timing.marcas.map((m: Marca) => `${m.nome};dur=${m.dur}`);
  partes.push(`app;dur=${Date.now() - timing.t0}`);
  res.set("Server-Timing", partes.join(", "));
}
