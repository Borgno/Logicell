import { PrazoService, type PrazoRegras } from "./prazo.server";
import { PastaService } from "./pasta.server";

const MILIS_DIA = 24 * 60 * 60 * 1000;

// Colunas com filtro e destaque de "Duplicados". Nomes fixos: entram direto no SQL.
export const COLUNAS_DUPLICADOS = ["nr_nf", "nr_ctrc"] as const;
export type ColunaDuplicados = (typeof COLUNAS_DUPLICADOS)[number];

export class OperacaoQueryBuilder {
  // Resolve o identificador da pasta: pastaNome (rota de pasta, cacheada via
  // PastaService) tem prioridade sobre pastaId; nome inexistente vira 404.
  static async resolverPastaId(pastaId: any, filtros: any): Promise<number | null> {
    if (filtros?.pastaNome) {
      const pasta = await PastaService.buscarPorNome(String(filtros.pastaNome));
      if (!pasta) {
        const err: any = new Error("Pasta não encontrada.");
        err.status = 404;
        throw err;
      }
      return pasta.id;
    }
    return pastaId && pastaId !== "null" ? Number(pastaId) : null;
  }

  // Condição SQL de "emissão antiga": fora do prazo padrão ou do prazo
  // específico da pasta (Pasta.prazoDias). Compartilhada com
  // `emissoesAntigasPorPasta` para que o filtro e os contadores batam.
  static construirCondicaoAntigas(regras: PrazoRegras, params: any[], alias = "o"): string {
    const agora = Date.now();
    // Caixa de Entrada (pastaId vazio) vira 0, que não é id de pasta: sem o
    // COALESCE, o NOT abaixo daria NULL e ela nunca teria emissão antiga.
    const pastaExpr = `COALESCE(${alias}."pastaId", 0)`;

    // Agrupa as exceções pelo mesmo número de dias para reduzir condições no SQL
    const buckets = new Map<number, number[]>();
    for (const [pastaId, dias] of Object.entries(regras.porPasta)) {
      const lista = buckets.get(dias) ?? [];
      lista.push(Number(pastaId));
      buckets.set(dias, lista);
    }

    const todasExcecoes = Object.keys(regras.porPasta).map(Number);
    const filters: string[] = [];

    // Pastas sem exceção e a Caixa de Entrada usam o prazo padrão
    params.push(todasExcecoes);
    params.push(new Date(agora - regras.padraoDias * MILIS_DIA));
    filters.push(
      `(NOT (${pastaExpr} = ANY($${params.length - 1}::int[]))
        AND ${alias}.dt_emissao_ < $${params.length})`
    );

    // Cada exceção usa o seu próprio prazo
    for (const [dias, pastas] of buckets.entries()) {
      params.push(pastas);
      params.push(new Date(agora - dias * MILIS_DIA));
      filters.push(
        `(${pastaExpr} = ANY($${params.length - 1}::int[])
          AND ${alias}.dt_emissao_ < $${params.length})`
      );
    }

    return `(${filters.join(" OR ")})`;
  }

  // Verifica se um filtro de coluna (ex.: colFilter_nr_nf) tem o tipo informado.
  private static temFiltro(filtros: any, colName: string, type: string): boolean {
    const val = filtros?.[`colFilter_${colName}`];
    if (typeof val !== "string") return false;
    const sep = val.indexOf(":");
    return (sep > -1 ? val.substring(0, sep) : val) === type;
  }

  // Expressão SQL das colunas calculadas no navegador, para o filtro enxergar o mesmo
  // número da tela: a data de hoje é a do Brasil, e a Vencida usa o prazo da pasta aberta.
  private static async expressoesCalculadas(filtros: any, pid: number | null) {
    const dias = `GREATEST(0, (now() AT TIME ZONE 'America/Sao_Paulo')::date - "dt_emissao_"::date)`;
    const expressoes: Record<string, string> = { dias_em_aberto: dias };
    if (filtros?.colFilter_dias_vencida) {
      const regras = await PrazoService.regras();
      const prazo = (pid !== null ? regras.porPasta[pid] : undefined) ?? regras.padraoDias;
      expressoes.dias_vencida = `GREATEST(0, ${dias} - ${Number(prazo)})`;
      expressoes.dias_alem_do_prazo = `(${dias} - ${Number(prazo)})`;
    }
    return expressoes;
  }

  static processarFiltrosDinamicos(filtros: any, whereAnd: string[], params: any[], calculadas: Record<string, string>) {
    const colunasValidas = [
      "nm_agencia", "cd_pessoa_pagador", "nm_pessoa_pagador", "nr_cpf_cnpj_raiz", 
      "nr_cpf_cnpj_pagador", "nr_ctrc", "status", "comentarios", "id_tipo_documento",
      "nm_pessoa_remetente", "nm_cidade_origem", "ds_sigla_origem", "nm_pessoa_destinatario",
      "nm_cidade_destino", "ds_sigla_destino", "nm_produto", "nr_nf", "ds_placa",
      "nm_pessoa_matriz", "nr_contrato", "nr_chave_acesso", "nm_pessoa_usuario_lancamento",
      "id_tipo_ctrc", "nm_proprietario_posse_cavalo", "nm_motorista", "dt_emissao_",
      "data_status", "id_solicitacao", "dt_quitacao_saldo", "vl_peso", "vl_tarifa", "vl_total",
      "dias_em_aberto", "dias_vencida"
    ];

    for (const [key, val] of Object.entries(filtros)) {
      if (key.startsWith("colFilter_") && typeof val === 'string') {
        const colName = key.replace("colFilter_", "");
        if (colunasValidas.includes(colName)) {
          const separatorIdx = val.indexOf(":");
          if (separatorIdx > -1) {
              const type = val.substring(0, separatorIdx);
              const value = val.substring(separatorIdx + 1);
              const expressao = calculadas[colName] ?? `"${colName}"`;
              const isNumeric = colName.startsWith("vl_") || colName in calculadas;
              
              if (type === "blank") {
                whereAnd.push(`(${expressao} IS NULL OR ${expressao}::TEXT = '')`);
              } else if (type === "notBlank") {
                whereAnd.push(`(${expressao} IS NOT NULL AND ${expressao}::TEXT <> '')`);
              } else if (type === "equals" && value !== "") {
                const values = value.split(',').map(v => v.trim()).filter(Boolean);
                if (values.length > 1) {
                  const placeholders = values.map(v => {
                    params.push(v);
                    return `$${params.length}`;
                  });
                  if (colName === "dt_emissao_" || colName === "data_status" || colName === "dt_quitacao_saldo") {
                    whereAnd.push(`TO_CHAR(${expressao}, 'DD/MM/YYYY') IN (${placeholders.join(', ')})`);
                  } else {
                    whereAnd.push(`${expressao}::TEXT IN (${placeholders.join(', ')})`);
                  }
                } else if (values.length === 1) {
                  const singleValue = values[0];
                  params.push(singleValue);
                  const exatos = ["nr_nf", "nr_chave_acesso", "nr_contrato"];
                  if (colName === "dt_emissao_" || colName === "data_status" || colName === "dt_quitacao_saldo") {
                      // Igual a data: vira range (indexável), já que as datas são meia-noite UTC
                      whereAnd.push(`(${expressao} >= to_date($${params.length}, 'DD/MM/YYYY') AND ${expressao} < to_date($${params.length}, 'DD/MM/YYYY') + interval '1 day')`);
                  } else if (exatos.includes(colName)) {
                      whereAnd.push(`${expressao} = $${params.length}`);
                  } else if (isNumeric) {
                      whereAnd.push(`${expressao}::TEXT ILIKE $${params.length}`);
                  } else {
                      whereAnd.push(`${expressao} ILIKE $${params.length}`);
                  }
                }
              } else if (type === "contains" && value !== "") {
                const values = value.split(',').map(v => v.trim()).filter(Boolean);
                if (values.length > 1) {
                  const orClauses = values.map(v => {
                    params.push(`%${v}%`);
                    if (colName === "dt_emissao_" || colName === "data_status" || colName === "dt_quitacao_saldo") {
                      return `TO_CHAR(${expressao}, 'DD/MM/YYYY') ILIKE $${params.length}`;
                    } else {
                      return `${expressao}::TEXT ILIKE $${params.length}`;
                    }
                  });
                  whereAnd.push(`(${orClauses.join(' OR ')})`);
                } else if (values.length === 1) {
                  params.push(`%${values[0]}%`);
                  if (colName === "dt_emissao_" || colName === "data_status" || colName === "dt_quitacao_saldo") {
                      whereAnd.push(`TO_CHAR(${expressao}, 'DD/MM/YYYY') ILIKE $${params.length}`);
                  } else {
                      whereAnd.push(`${expressao}::TEXT ILIKE $${params.length}`);
                  }
                }
              } else if (type === "period" && (colName === "dt_emissao_" || colName === "data_status" || colName === "dt_quitacao_saldo")) {
                const [deStr, ateStr] = value.split(";");
                const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
                if (deStr && dateRegex.test(deStr)) {
                  params.push(deStr);
                  whereAnd.push(`${expressao} >= to_date($${params.length}, 'DD/MM/YYYY')`);
                }
                if (ateStr && dateRegex.test(ateStr)) {
                  params.push(ateStr);
                  whereAnd.push(`${expressao} < to_date($${params.length}, 'DD/MM/YYYY') + interval '1 day'`);
                }
              }
          }
        }
      }
    }
  }

  static async construirWhere(pastaId: any, filtros: any, excludedIds: number[] = []) {
    const whereAnd: string[] = [];
    const params: any[] = [];

    const addFilter = (condition: string, value: any) => {
      params.push(value);
      whereAnd.push(`${condition} $${params.length}`);
    };

    const pid = await this.resolverPastaId(pastaId, filtros);
    const calculadas = await this.expressoesCalculadas(filtros, pid);
    this.processarFiltrosDinamicos(filtros, whereAnd, params, calculadas);

    // Filtros especiais por coluna (sem valor digitado, baseados em regra de negócio)
    if (this.temFiltro(filtros, "dt_emissao_", "antigos")) {
      const regras = await PrazoService.regras();
      whereAnd.push(`(o.dt_emissao_ IS NOT NULL AND ${this.construirCondicaoAntigas(regras, params)})`);
    }
    // Seguem as cores da coluna Vencida: vermelho já passou do prazo, laranja é o último dia.
    if (this.temFiltro(filtros, "dias_vencida", "vencidas")) {
      whereAnd.push(`${calculadas.dias_alem_do_prazo} > 0`);
    }
    if (this.temFiltro(filtros, "dias_vencida", "vencidasHoje")) {
      whereAnd.push(`${calculadas.dias_alem_do_prazo} = 0`);
    }
    for (const coluna of COLUNAS_DUPLICADOS) {
      if (!this.temFiltro(filtros, coluna, "duplicados")) continue;
      params.push(pid);
      whereAnd.push(
        `(o.${coluna} IS NOT NULL AND BTRIM(o.${coluna}) <> '' AND UPPER(BTRIM(o.${coluna})) IN (
           SELECT UPPER(BTRIM(d.${coluna}))
           FROM "Operacao" d
           WHERE d.${coluna} IS NOT NULL AND BTRIM(d.${coluna}) <> ''
             AND d."pastaId" IS NOT DISTINCT FROM $${params.length}
           GROUP BY UPPER(BTRIM(d.${coluna}))
           HAVING COUNT(*) > 1
         ))`
      );
    }

    if (pid !== null) { 
      addFilter(`"pastaId" =`, pid); 
    } else { 
      whereAnd.push(`"pastaId" IS NULL`); 
    }

    if (excludedIds && excludedIds.length > 0) {
      const placeholders = excludedIds.map((id) => {
        params.push(id);
        return `$${params.length}`;
      });
      whereAnd.push(`id NOT IN (${placeholders.join(", ")})`);
    }

    return { sql: whereAnd.length > 0 ? `WHERE ${whereAnd.join(" AND ")}` : "", params };
  }
}
