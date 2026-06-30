//Utilitários de formatação de dados para a UI brasileira.


export const formatarMoeda = (val: any) => {
  if (val === null || val === undefined) return "-";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
};

export const formatarData = (val: any) => {
  if (!val) return "-";
  
  let dataStr = typeof val === 'string' ? val : val instanceof Date ? val.toISOString() : String(val);
  
  // Extrai apenas a parte da data YYYY-MM-DD ignorando o fuso se for ISO
  const match = dataStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  // Fallback seguro
  try {
    return new Date(val).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return val;
  }
};

export const formatarNumero = (val: any) => {
  if (val === null || val === undefined) return "-";
  return new Intl.NumberFormat('pt-BR').format(Number(val));
};

export function buscarNomeUsuario(email: string, metadataNome?: string): string {
  if (!email) return "Usuário";
  return metadataNome || email;
}
