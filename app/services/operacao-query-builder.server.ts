export class OperacaoQueryBuilder {
  static processarFiltrosDinamicos(filtros: any, whereAnd: string[], params: any[]) {
    const colunasValidas = [
      "nm_agencia", "cd_pessoa_pagador", "nm_pessoa_pagador", "nr_cpf_cnpj_raiz", 
      "nr_cpf_cnpj_pagador", "nr_ctrc", "status", "comentarios", "id_tipo_documento",
      "nm_pessoa_remetente", "nm_cidade_origem", "ds_sigla_origem", "nm_pessoa_destinatario",
      "nm_cidade_destino", "ds_sigla_destino", "nm_produto", "nr_nf", "ds_placa",
      "nm_pessoa_matriz", "nr_contrato", "nr_chave_acesso", "nm_pessoa_usuario_lancamento",
      "id_tipo_ctrc", "nm_proprietario_posse_cavalo", "nm_motorista", "dt_emissao_",
      "vl_peso", "vl_tarifa", "vl_total"
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
                params.push(value);
                const exatos = ["nr_nf", "nr_chave_acesso", "nr_contrato"];
                if (colName === "dt_emissao_") {
                    whereAnd.push(`TO_CHAR("${colName}", 'DD/MM/YYYY') ILIKE $${params.length}`);
                } else if (exatos.includes(colName)) {
                    whereAnd.push(`"${colName}" = $${params.length}`);
                } else if (isNumeric) {
                    whereAnd.push(`"${colName}"::TEXT ILIKE $${params.length}`);
                } else {
                    whereAnd.push(`"${colName}" ILIKE $${params.length}`);
                }
              } else if (type === "contains" && value !== "") {
                params.push(`%${value}%`);
                if (colName === "dt_emissao_") {
                    whereAnd.push(`TO_CHAR("${colName}", 'DD/MM/YYYY') ILIKE $${params.length}`);
                } else {
                    whereAnd.push(`"${colName}"::TEXT ILIKE $${params.length}`);
                }
              }
          }
        }
      }
    }
  }

  static construirWhere(pastaId: any, filtros: any, excludedIds: number[] = []) {
    const whereAnd: string[] = [];
    const params: any[] = [];

    this.processarFiltrosDinamicos(filtros, whereAnd, params);

    const addFilter = (condition: string, value: any) => {
      params.push(value);
      whereAnd.push(`${condition} $${params.length}`);
    };

    if (filtros.nm_agencia) addFilter(`nm_agencia =`, filtros.nm_agencia);
    if (filtros.nm_pessoa_pagador) addFilter(`nm_pessoa_pagador ILIKE`, `%${filtros.nm_pessoa_pagador}%`);
    if (filtros.nm_pessoa_remetente) addFilter(`nm_pessoa_remetente ILIKE`, `%${filtros.nm_pessoa_remetente}%`);
    if (filtros.nm_pessoa_destinatario) addFilter(`nm_pessoa_destinatario ILIKE`, `%${filtros.nm_pessoa_destinatario}%`);
    if (filtros.nm_produto) addFilter(`nm_produto ILIKE`, `%${filtros.nm_produto}%`);
    if (filtros.ds_placa) addFilter(`ds_placa ILIKE`, `%${filtros.ds_placa}%`);
    if (filtros.min_peso) addFilter(`vl_peso >=`, Number(filtros.min_peso));
    if (filtros.max_peso) addFilter(`vl_peso <=`, Number(filtros.max_peso));
    if (filtros.min_total) addFilter(`vl_total >=`, Number(filtros.min_total));
    if (filtros.max_total) addFilter(`vl_total <=`, Number(filtros.max_total));
    if (filtros.status) addFilter(`status =`, filtros.status);

    if (pastaId && pastaId !== "null") { 
      addFilter(`"pastaId" =`, Number(pastaId)); 
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
