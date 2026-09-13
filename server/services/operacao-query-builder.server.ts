import { PrazoService, type PrazoRegras } from "./prazo.server";
import { PastaService } from "./pasta.server";

const MILIS_DIA = 24 * 60 * 60 * 1000;

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
  // específico do cliente (nm_pessoa_pagador). Compartilhada com
  // `emissoesAntigasPorPasta` para que o filtro e os contadores batam.
  static construirCondicaoAntigas(regras: PrazoRegras, params: any[], alias = "o"): string {
    const agora = Date.now();
    const clienteExpr = `UPPER(COALESCE(BTRIM(${alias}.nm_pessoa_pagador), ''))`;

    // Agrupa as exceções pelo mesmo número de dias para reduzir condições no SQL
    const buckets = new Map<number, string[]>();
    for (const [cliente, dias] of Object.entries(regras.porCliente)) {
      const lista = buckets.get(dias) ?? [];
      lista.push(cliente);
      buckets.set(dias, lista);
    }

    const todasExcecoes = [...Object.keys(regras.porCliente)];
    const filters: string[] = [];

    // Clientes sem exceção (ou sem cliente) usam o prazo padrão
    params.push(todasExcecoes);
    params.push(new Date(agora - regras.padraoDias * MILIS_DIA));
    filters.push(
      `(NOT (${clienteExpr} = ANY($${params.length - 1}::text[]))
        AND ${alias}.dt_emissao_ < $${params.length})`
    );

    // Cada exceção usa o seu próprio prazo
    for (const [dias, clientes] of buckets.entries()) {
      params.push(clientes);
      params.push(new Date(agora - dias * MILIS_DIA));
      filters.push(
        `(${clienteExpr} = ANY($${params.length - 1}::text[])
          AND ${alias}.dt_emissao_ < $${params.length})`
      );
    }

    return `(${filters.join(" OR ")})`;
  }

  // Verifica se um filtro de coluna (ex.: colFilter_ds_placa) tem o tipo informado.
  private static temFiltro(filtros: any, colName: string, type: string): boolean {
    const val = filtros?.[`colFilter_${colName}`];
    if (typeof val !== "string") return false;
    const sep = val.indexOf(":");
    return (sep > -1 ? val.substring(0, sep) : val) === type;
  }

  static processarFiltrosDinamicos(filtros: any, whereAnd: string[], params: any[]) {
    const colunasValidas = [
      "nm_agencia", "cd_pessoa_pagador", "nm_pessoa_pagador", "nr_cpf_cnpj_raiz", 
      "nr_cpf_cnpj_pagador", "nr_ctrc", "status", "comentarios", "id_tipo_documento",
      "nm_pessoa_remetente", "nm_cidade_origem", "ds_sigla_origem", "nm_pessoa_destinatario",
      "nm_cidade_destino", "ds_sigla_destino", "nm_produto", "nr_nf", "ds_placa",
      "nm_pessoa_matriz", "nr_contrato", "nr_chave_acesso", "nm_pessoa_usuario_lancamento",
      "id_tipo_ctrc", "nm_proprietario_posse_cavalo", "nm_motorista", "dt_emissao_",
      "data_status", "id_solicitacao", "dt_quitacao_saldo", "vl_peso", "vl_tarifa", "vl_total"
    ];

    for (const [key, val] of Object.entries(filtros)) {
      if (key.startsWith("colFilter_") && typeof val === 'string') {
        const colName = key.replace("colFilter_", "");
        if (colunasValidas.includes(colName)) {
          const separatorIdx = val.indexOf(":");
          if (separatorIdx > -1) {
              const type = val.substring(0, separatorIdx);
              const value = val.substring(separatorIdx + 1);
              const isNumeric = colName.startsWith("vl_");
              
              if (type === "blank") {
                whereAnd.push(`("${colName}" IS NULL OR "${colName}"::TEXT = '')`);
              } else if (type === "notBlank") {
                whereAnd.push(`("${colName}" IS NOT NULL AND "${colName}"::TEXT <> '')`);
              } else if (type === "equals" && value !== "") {
                const values = value.split(',').map(v => v.trim()).filter(Boolean);
                if (values.length > 1) {
                  const placeholders = values.map(v => {
                    params.push(v);
                    return `$${params.length}`;
                  });
                  if (colName === "dt_emissao_" || colName === "data_status" || colName === "dt_quitacao_saldo") {
                    whereAnd.push(`TO_CHAR("${colName}", 'DD/MM/YYYY') IN (${placeholders.join(', ')})`);
                  } else {
                    whereAnd.push(`"${colName}"::TEXT IN (${placeholders.join(', ')})`);
                  }
                } else if (values.length === 1) {
                  const singleValue = values[0];
                  params.push(singleValue);
                  const exatos = ["nr_nf", "nr_chave_acesso", "nr_contrato"];
                  if (colName === "dt_emissao_" || colName === "data_status" || colName === "dt_quitacao_saldo") {
                      // Igual a data: vira range (indexável), já que as datas são meia-noite UTC
                      whereAnd.push(`("${colName}" >= to_date($${params.length}, 'DD/MM/YYYY') AND "${colName}" < to_date($${params.length}, 'DD/MM/YYYY') + interval '1 day')`);
                  } else if (exatos.includes(colName)) {
                      whereAnd.push(`"${colName}" = $${params.length}`);
                  } else if (isNumeric) {
                      whereAnd.push(`"${colName}"::TEXT ILIKE $${params.length}`);
                  } else {
                      whereAnd.push(`"${colName}" ILIKE $${params.length}`);
                  }
                }
              } else if (type === "contains" && value !== "") {
                const values = value.split(',').map(v => v.trim()).filter(Boolean);
                if (values.length > 1) {
                  const orClauses = values.map(v => {
                    params.push(`%${v}%`);
                    if (colName === "dt_emissao_" || colName === "data_status" || colName === "dt_quitacao_saldo") {
                      return `TO_CHAR("${colName}", 'DD/MM/YYYY') ILIKE $${params.length}`;
                    } else {
                      return `"${colName}"::TEXT ILIKE $${params.length}`;
                    }
                  });
                  whereAnd.push(`(${orClauses.join(' OR ')})`);
                } else if (values.length === 1) {
                  params.push(`%${values[0]}%`);
                  if (colName === "dt_emissao_" || colName === "data_status" || colName === "dt_quitacao_saldo") {
                      whereAnd.push(`TO_CHAR("${colName}", 'DD/MM/YYYY') ILIKE $${params.length}`);
                  } else {
                      whereAnd.push(`"${colName}"::TEXT ILIKE $${params.length}`);
                  }
                }
              } else if (type === "period" && (colName === "dt_emissao_" || colName === "data_status" || colName === "dt_quitacao_saldo")) {
                const [deStr, ateStr] = value.split(";");
                const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
                if (deStr && dateRegex.test(deStr)) {
                  params.push(deStr);
                  whereAnd.push(`"${colName}" >= to_date($${params.length}, 'DD/MM/YYYY')`);
                }
                if (ateStr && dateRegex.test(ateStr)) {
                  params.push(ateStr);
                  whereAnd.push(`"${colName}" < to_date($${params.length}, 'DD/MM/YYYY') + interval '1 day'`);
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

    this.processarFiltrosDinamicos(filtros, whereAnd, params);

    const addFilter = (condition: string, value: any) => {
      params.push(value);
      whereAnd.push(`${condition} $${params.length}`);
    };

    const pid = await this.resolverPastaId(pastaId, filtros);

    // Filtros especiais por coluna (sem valor digitado, baseados em regra de negócio)
    if (this.temFiltro(filtros, "dt_emissao_", "antigos")) {
      const regras = await PrazoService.regras();
      whereAnd.push(`(o.dt_emissao_ IS NOT NULL AND ${this.construirCondicaoAntigas(regras, params)})`);
    }
    if (this.temFiltro(filtros, "ds_placa", "duplicados")) {
      params.push(pid);
      whereAnd.push(
        `(o.ds_placa IS NOT NULL AND BTRIM(o.ds_placa) <> '' AND UPPER(BTRIM(o.ds_placa)) IN (
           SELECT UPPER(BTRIM(d.ds_placa))
           FROM "Operacao" d
           WHERE d.ds_placa IS NOT NULL AND BTRIM(d.ds_placa) <> ''
             AND d."pastaId" IS NOT DISTINCT FROM $${params.length}
           GROUP BY UPPER(BTRIM(d.ds_placa))
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
