export class OperacaoQueryBuilder {
  static processarFiltrosDinamicos(filtros: any, whereAnd: string[], params: any[]) {
    const colunasValidas = [
      "nm_agencia", "cd_pessoa_pagador", "nm_pessoa_pagador", "nr_cpf_cnpj_raiz", 
      "nr_cpf_cnpj_pagador", "nr_ctrc", "status", "comentarios", "id_tipo_documento",
      "nm_pessoa_remetente", "nm_cidade_origem", "ds_sigla_origem", "nm_pessoa_destinatario",
      "nm_cidade_destino", "ds_sigla_destino", "nm_produto", "nr_nf", "ds_placa",
      "nm_pessoa_matriz", "nr_contrato", "nr_chave_acesso", "nm_pessoa_usuario_lancamento",
      "id_tipo_ctrc", "nm_proprietario_posse_cavalo", "nm_motorista", "dt_emissao_",
      "data_status", "id_solicitacao", "vl_peso", "vl_tarifa", "vl_total"
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
                  if (colName === "dt_emissao_" || colName === "data_status") {
                    whereAnd.push(`TO_CHAR("${colName}", 'DD/MM/YYYY') IN (${placeholders.join(', ')})`);
                  } else {
                    whereAnd.push(`"${colName}"::TEXT IN (${placeholders.join(', ')})`);
                  }
                } else if (values.length === 1) {
                  const singleValue = values[0];
                  params.push(singleValue);
                  const exatos = ["nr_nf", "nr_chave_acesso", "nr_contrato"];
                  if (colName === "dt_emissao_" || colName === "data_status") {
                      whereAnd.push(`TO_CHAR("${colName}", 'DD/MM/YYYY') ILIKE $${params.length}`);
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
                    if (colName === "dt_emissao_" || colName === "data_status") {
                      return `TO_CHAR("${colName}", 'DD/MM/YYYY') ILIKE $${params.length}`;
                    } else {
                      return `"${colName}"::TEXT ILIKE $${params.length}`;
                    }
                  });
                  whereAnd.push(`(${orClauses.join(' OR ')})`);
                } else if (values.length === 1) {
                  params.push(`%${values[0]}%`);
                  if (colName === "dt_emissao_" || colName === "data_status") {
                      whereAnd.push(`TO_CHAR("${colName}", 'DD/MM/YYYY') ILIKE $${params.length}`);
                  } else {
                      whereAnd.push(`"${colName}"::TEXT ILIKE $${params.length}`);
                  }
                }
              } else if (type === "period" && (colName === "dt_emissao_" || colName === "data_status")) {
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

  static construirWhere(pastaId: any, filtros: any, excludedIds: number[] = []) {
    const whereAnd: string[] = [];
    const params: any[] = [];

    this.processarFiltrosDinamicos(filtros, whereAnd, params);

    const addFilter = (condition: string, value: any) => {
      params.push(value);
      whereAnd.push(`${condition} $${params.length}`);
    };


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
