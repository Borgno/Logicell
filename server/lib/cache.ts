//Cache em memória com TTL para dados que mudam pouco (usuários do Supabase,
//ordem de colunas, regras de prazo). Uma instância só: sem Redis por ora.
interface Entry { value: unknown; expiresAt: number }
const store = new Map<string, Entry>();

export async function getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.value as T;
  const value = await loader();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function invalidate(prefix?: string): void {
  if (!prefix) { store.clear(); return; }
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

//Renova um valor sem janela vazia: só troca o que está guardado depois que o
//loader termina (diferente de invalidate+getOrSet, que deixaria uma request
//no meio pagando o loader de novo). Erro do loader propaga: quem chama decide
//se tenta de novo depois; o valor antigo continua servindo até então.
export async function renovar<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const value = await loader();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
