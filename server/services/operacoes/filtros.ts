import { Prisma } from "../../db/generated/client";
import { ApiProblem } from "../../lib/problem";
import { colunaPorKey, type Coluna } from "./colunas";

// Filtros da grid, montados como SQL parametrizado. O nome da coluna só entra no SQL vindo da lista
// de COLUNAS; o valor digitado vai sempre como parâmetro.

export const TIPOS_FILTRO = [
  "contains",
  "equals",
  "blank",
  "notBlank",
  "period",
  "antigos",
  "duplicados",
] as const;
export type TipoFiltro = (typeof TIPOS_FILTRO)[number];

export type Filtro = { coluna: Coluna; tipo: TipoFiltro; valor: string };

// Escopo da lista: a Caixa de Entrada (operações sem pasta) ou uma pasta.
export type Escopo = "inbox" | number;

// Toda query de operação usa o alias "o" e este FROM: o prazo do cliente vem da tabela de exceções.
export const FROM = Prisma.sql`"Operacao" o LEFT JOIN "PrazoCliente" pc ON pc.cliente = UPPER(BTRIM(o.nm_pessoa_pagador))`;

// Emissão antiga: emitida antes de agora menos o prazo do cliente, ou o padrão sem exceção.
export const EMISSAO_ANTIGA = Prisma.sql`(o.dt_emissao_ IS NOT NULL AND o.dt_emissao_ < now() - make_interval(days => COALESCE(pc."prazoDias", (SELECT c."prazoPadraoDias" FROM "Configuracao" c WHERE c.id = 1), 10)))`;

// Placa que aparece em outra operação do mesmo escopo (a mesma pasta, ou a Caixa de Entrada). Com o
// escopo conhecido, as placas repetidas são calculadas uma vez e comparadas por hash; a versão por
// linha (EXISTS) custava 380 ms numa pasta de 726 operações.
const PLACA = Prisma.sql`UPPER(BTRIM(o.ds_placa))`;

function noEscopo(alias: string, escopo: Escopo) {
  const col = Prisma.raw(`${alias}."pastaId"`);
  return escopo === "inbox" ? Prisma.sql`${col} IS NULL` : Prisma.sql`${col} = ${escopo}`;
}

export function placaDuplicada(escopo: Escopo) {
  return Prisma.sql`(o.ds_placa IS NOT NULL AND ${PLACA} IN (
    SELECT UPPER(BTRIM(d.ds_placa)) FROM "Operacao" d
     WHERE ${noEscopo("d", escopo)} AND d.ds_placa IS NOT NULL AND BTRIM(d.ds_placa) <> ''
     GROUP BY 1 HAVING COUNT(*) > 1))`;
}

// Para uma linha só, sem escopo na mão: a mesma regra, pela pasta da própria operação.
export const PLACA_DUPLICADA_DA_LINHA = Prisma.sql`(o.ds_placa IS NOT NULL AND BTRIM(o.ds_placa) <> '' AND EXISTS (
  SELECT 1 FROM "Operacao" d
   WHERE d."pastaId" IS NOT DISTINCT FROM o."pastaId"
     AND d.id <> o.id
     AND d.ds_placa IS NOT NULL
     AND UPPER(BTRIM(d.ds_placa)) = ${PLACA}))`;

const invalido = (detail: string) =>
  new ApiProblem(422, "VALIDATION_FAILED", detail, {
    errors: [{ field: "filtro", message: detail }],
  });

// "coluna:tipo:valor", com o valor podendo ter ":" (o resto da string).
export function parseFiltro(raw: string): Filtro {
  const [key = "", tipo = "", ...resto] = raw.split(":");
  const coluna = colunaPorKey(key);
  if (!coluna) throw invalido(`Coluna desconhecida no filtro: ${key}.`);
  if (!(TIPOS_FILTRO as readonly string[]).includes(tipo)) {
    throw invalido(`Tipo de filtro desconhecido: ${tipo}.`);
  }
  if (tipo === "period" && coluna.tipo !== "data") throw invalido("Período só vale para datas.");
  if (tipo === "antigos" && coluna.key !== "dataEmissao") {
    throw invalido("Antigos só vale para a data de emissão.");
  }
  if (tipo === "duplicados" && coluna.key !== "placa") {
    throw invalido("Duplicados só vale para a placa.");
  }
  return { coluna, tipo: tipo as TipoFiltro, valor: resto.join(":") };
}

const DATA_BR = /^\d{2}\/\d{2}\/\d{4}$/;

function valores(valor: string) {
  return valor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function condicao({ coluna, tipo, valor }: Filtro, escopo: Escopo): Prisma.Sql | null {
  const col = Prisma.raw(`o."${coluna.db}"`);
  const comoTexto =
    coluna.tipo === "data" ? Prisma.sql`TO_CHAR(${col}, 'DD/MM/YYYY')` : Prisma.sql`${col}::text`;

  switch (tipo) {
    case "blank":
      return Prisma.sql`(${col} IS NULL OR ${col}::text = '')`;
    case "notBlank":
      return Prisma.sql`(${col} IS NOT NULL AND ${col}::text <> '')`;
    case "antigos":
      return EMISSAO_ANTIGA;
    case "duplicados":
      return placaDuplicada(escopo);
    case "period": {
      const [de = "", ate = ""] = valor.split(";");
      const partes: Prisma.Sql[] = [];
      if (DATA_BR.test(de)) partes.push(Prisma.sql`${col} >= to_date(${de}, 'DD/MM/YYYY')`);
      if (DATA_BR.test(ate)) {
        partes.push(Prisma.sql`${col} < to_date(${ate}, 'DD/MM/YYYY') + interval '1 day'`);
      }
      return partes.length ? Prisma.sql`(${Prisma.join(partes, " AND ")})` : null;
    }
    case "equals": {
      const lista = valores(valor);
      if (lista.length === 0) return null;
      if (lista.length > 1) return Prisma.sql`${comoTexto} IN (${Prisma.join(lista)})`;
      const [unico] = lista;
      // Data igual vira intervalo do dia, que usa o índice: as datas são meia-noite UTC.
      if (coluna.tipo === "data") {
        if (!DATA_BR.test(unico)) throw invalido("Use a data no formato DD/MM/AAAA.");
        return Prisma.sql`(${col} >= to_date(${unico}, 'DD/MM/YYYY') AND ${col} < to_date(${unico}, 'DD/MM/YYYY') + interval '1 day')`;
      }
      if (coluna.exato) return Prisma.sql`${col} = ${unico}`;
      return Prisma.sql`${comoTexto} ILIKE ${unico}`;
    }
    case "contains": {
      const lista = valores(valor);
      if (lista.length === 0) return null;
      const partes = lista.map((item) => Prisma.sql`${comoTexto} ILIKE ${`%${item}%`}`);
      return Prisma.sql`(${Prisma.join(partes, " OR ")})`;
    }
  }
}

// Busca livre nos campos que a equipe mais procura.
const BUSCA = [
  "nr_ctrc",
  "nr_nf",
  "nm_pessoa_pagador",
  "ds_placa",
  "nm_pessoa_remetente",
  "nm_pessoa_destinatario",
];

export function montarWhere(input: {
  escopo: Escopo;
  filtros: Filtro[];
  search?: string;
  excluidos?: number[];
}): Prisma.Sql {
  const partes: Prisma.Sql[] = [noEscopo("o", input.escopo)];
  for (const filtro of input.filtros) {
    const sql = condicao(filtro, input.escopo);
    if (sql) partes.push(sql);
  }
  const search = input.search?.trim();
  if (search) {
    const termo = `%${search}%`;
    partes.push(
      Prisma.sql`(${Prisma.join(
        BUSCA.map((db) => Prisma.sql`${Prisma.raw(`o."${db}"`)} ILIKE ${termo}`),
        " OR ",
      )})`,
    );
  }
  if (input.excluidos?.length)
    partes.push(Prisma.sql`o.id NOT IN (${Prisma.join(input.excluidos)})`);
  return Prisma.sql`WHERE ${Prisma.join(partes, " AND ")}`;
}
