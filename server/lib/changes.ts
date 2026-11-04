// Campos que mudaram, como { campo: { from, to } }, para o audit da edição. Campo undefined no
// `after` não entrou na edição e fica de fora.
export function changedFields<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [field, value] of Object.entries(after)) {
    if (value !== undefined && value !== before[field]) {
      changes[field] = { from: before[field] ?? null, to: value };
    }
  }
  return changes;
}
