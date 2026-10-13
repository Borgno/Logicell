import pg from "pg";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../test/db";
import { prisma } from "./client";

// Contra o banco de teste, criado pelo 0_baseline: confere o que o Logicell depende do Postgres e do
// adapter do Prisma 7.
const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
// O admin derruba a sessão do client; o erro de volta não pode derrubar o processo do teste.
admin.on("error", () => {});
await admin.connect();

beforeEach(resetDatabase);
afterAll(() => admin.end());

describe("baseline", () => {
  it("cria o pg_trgm e os índices de expressão que o schema não declara", async () => {
    const { rows: extensions } = await admin.query(
      "SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'",
    );
    expect(extensions).toHaveLength(1);

    const { rows: indexes } = await admin.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'",
    );
    const names = indexes.map(({ indexname }) => indexname);
    expect(names).toContain("Operacao_upper_trim_pagador_trgm_idx");
    expect(names).toContain("Operacao_hash_assinatura_key");
    expect(names.filter((name) => name.startsWith("Operacao_upper_"))).toHaveLength(26);
  });
});

describe("adapter", () => {
  it("grava e lê timestamp sem fuso como UTC", async () => {
    const emissao = new Date("2026-01-15T12:34:56.789Z");
    const { id } = await prisma.operacao.create({
      data: { nm_agencia: "A - SP", nr_ctrc: "1", dt_emissao_: emissao },
    });

    const lida = await prisma.operacao.findUniqueOrThrow({ where: { id } });
    expect(lida.dt_emissao_?.toISOString()).toBe(emissao.toISOString());

    const { rows } = await admin.query<{ texto: string }>(
      `SELECT dt_emissao_::text AS texto FROM "Operacao" WHERE id = $1`,
      [id],
    );
    expect(rows[0].texto).toBe("2026-01-15 12:34:56.789");
  });

  it("passa JSON e array de texto para o SQL cru da importação", async () => {
    const linhas = [
      { nm_agencia: "A - SP", nr_ctrc: "1", hash_assinatura: "h1" },
      { nm_agencia: "B - RS", nr_ctrc: "2", hash_assinatura: "h2" },
      { nm_agencia: "B - RS", nr_ctrc: "2", hash_assinatura: "h2" },
    ];
    const inseridas = await prisma.$executeRawUnsafe(
      `INSERT INTO "Operacao" (nm_agencia, nr_ctrc, hash_assinatura, "createdAt", "updatedAt")
       SELECT nm_agencia, nr_ctrc, hash_assinatura, now(), now()
       FROM json_populate_recordset(NULL::"Operacao", $1::json)
       ON CONFLICT DO NOTHING`,
      JSON.stringify(linhas),
    );
    expect(inseridas).toBe(2);

    const apagadas = await prisma.$executeRawUnsafe(
      `DELETE FROM "Operacao" WHERE hash_assinatura IS NOT NULL AND NOT (hash_assinatura = ANY($1::text[]))`,
      ["h1"],
    );
    expect(apagadas).toBe(1);
  });

  it("refaz a leitura quando o servidor encerra a sessão no meio da query", async () => {
    await prisma.operacao.create({ data: { nm_agencia: "A - SP", nr_ctrc: "1" } });

    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});

    // A tabela travada segura o findMany: a única sessão esperando lock é a dele.
    const trava = new pg.Client({ connectionString: process.env.DATABASE_URL });
    trava.on("error", () => {});
    await trava.connect();
    await trava.query(`BEGIN; LOCK TABLE "Operacao" IN ACCESS EXCLUSIVE MODE`);
    try {
      // A promise do Prisma só executa no then: o catch dispara a query sem esperar por ela.
      const leitura = prisma.operacao.findMany();
      leitura.catch(() => {});
      await expect
        .poll(async () => {
          const { rows } = await admin.query<{ pid: number }>(
            `SELECT pid FROM pg_stat_activity
             WHERE datname = current_database() AND wait_event_type = 'Lock'`,
          );
          return rows[0]?.pid;
        })
        .toBeDefined();
      await admin.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
         WHERE datname = current_database() AND wait_event_type = 'Lock'`,
      );
      await trava.query("ROLLBACK");

      await expect(leitura).resolves.toHaveLength(1);
      expect(aviso).toHaveBeenCalledWith(expect.stringContaining("refazendo Operacao.findMany"));
    } finally {
      aviso.mockRestore();
      await trava.end();
    }
  });
});
