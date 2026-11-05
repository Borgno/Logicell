//Utilitários de formatação de dados para a UI brasileira.
//Instância única: criar um Intl.NumberFormat por chamada é caro e a grid/dashboard
//formatam muitos valores por render.
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarMoeda = (val: any) => {
  if (val === null || val === undefined) return "-";
  return BRL.format(Number(val));
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

// Dias corridos da data até hoje, no fuso de quem está vendo (a data não tem hora).
// Aceita ISO e dd/mm/aaaa. Data vazia ou inválida vira null, e data futura vira 0.
export const diasEmAberto = (val: any): number | null => {
  const texto = String(val ?? "");
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!iso && !br) return null;
  const [ano, mes, dia] = iso ? [iso[1], iso[2], iso[3]] : [br![3], br![2], br![1]];
  const agora = new Date();
  const hoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
  return Math.max(0, Math.round((hoje - Date.UTC(+ano, +mes - 1, +dia)) / 86_400_000));
};

// Dias além do prazo. O mínimo é 0: dentro do prazo e no dia do vencimento dá 0.
export const diasVencida = (dias: number | null, prazoDias: number | null | undefined): number | null => {
  if (dias === null || prazoDias === null || prazoDias === undefined) return null;
  return Math.max(0, dias - prazoDias);
};


export function buscarNomeUsuario(email: string, metadataNome?: string): string {
  if (!email) return "Usuário";
  return metadataNome || email;
}

// Minúsculas e sem acentos, para buscas por nome ("aco" encontra "AÇO CEARENSE").
export const normalizarBusca = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
