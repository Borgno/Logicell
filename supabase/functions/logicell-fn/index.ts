declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Ler body
    let action = "stats";
    let pastaId: number | null = null;
    let filtros: any = {};
    try {
      const body = await req.json();
      action = body.action ?? "stats";
      pastaId = body.pastaId ?? null;
      filtros = body.filtros ?? {};
    } catch (_) { /* body vazio é ok */ }

    if (action === "list") {
      // ----------------------------------------------------
      // LISTAGEM DE OPERAÇÕES COM CACHE NA EDGE
      // ----------------------------------------------------
      const { search } = filtros;
      let query = supabase.from("Operacao").select("*", { count: "exact" });

      if (search) {
        query = query.or(`nm_agencia.ilike.%${search}%,cd_pessoa_pagador.ilike.%${search}%,nm_pessoa_pagador.ilike.%${search}%,nr_cpf_cnpj_raiz.ilike.%${search}%,nr_cpf_cnpj_pagador.ilike.%${search}%,nr_ctrc.ilike.%${search}%,status.ilike.%${search}%,comentarios.ilike.%${search}%,nm_pessoa_remetente.ilike.%${search}%,nm_cidade_origem.ilike.%${search}%,nm_pessoa_destinatario.ilike.%${search}%,nm_cidade_destino.ilike.%${search}%,nm_produto.ilike.%${search}%,nr_nf.ilike.%${search}%,ds_placa.ilike.%${search}%`);
      }

      if (filtros.nm_agencia) query = query.eq("nm_agencia", filtros.nm_agencia);
      if (filtros.nm_pessoa_pagador) query = query.ilike("nm_pessoa_pagador", `%${filtros.nm_pessoa_pagador}%`);
      if (filtros.nm_pessoa_remetente) query = query.ilike("nm_pessoa_remetente", `%${filtros.nm_pessoa_remetente}%`);
      if (filtros.nm_pessoa_destinatario) query = query.ilike("nm_pessoa_destinatario", `%${filtros.nm_pessoa_destinatario}%`);
      if (filtros.nm_produto) query = query.ilike("nm_produto", `%${filtros.nm_produto}%`);
      if (filtros.ds_placa) query = query.ilike("ds_placa", `%${filtros.ds_placa}%`);
      if (filtros.status) query = query.eq("status", filtros.status);
      if (filtros.min_peso) query = query.gte("vl_peso", Number(filtros.min_peso));
      if (filtros.max_peso) query = query.lte("vl_peso", Number(filtros.max_peso));
      if (filtros.min_total) query = query.gte("vl_total", Number(filtros.min_total));
      if (filtros.max_total) query = query.lte("vl_total", Number(filtros.max_total));

      if (pastaId !== null) {
        query = query.eq("pastaId", pastaId);
      } else {
        query = query.is("pastaId", null);
      }

      const p = Math.max(1, Number(filtros.page || 1));
      const l = Math.max(1, Number(filtros.limit || 100));
      const from = (p - 1) * l;
      const to = from + l - 1;

      query = query.order("id", { ascending: false }).range(from, to);

      // Buscar operações e agências únicas em paralelo
      const [opsRes, agenciasRes] = await Promise.all([
        query,
        supabase.from("Operacao").select("nm_agencia").limit(1000)
      ]);

      if (opsRes.error) throw opsRes.error;
      if (agenciasRes.error) throw agenciasRes.error;

      const uniqueAgencias = Array.from(new Set(agenciasRes.data?.map((d: any) => d.nm_agencia).filter(Boolean))).sort();

      const total = opsRes.count || 0;
      const result = {
        data: opsRes.data || [],
        meta: {
          total,
          page: p,
          limit: l,
          totalPages: Math.ceil(total / l)
        },
        agencias: uniqueAgencias
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          // Cache curto de 5s com revalidação tolerada por 30s na CDN
          "Cache-Control": "public, max-age=5, stale-while-revalidate=30",
        },
      });
    }

    // ----------------------------------------------------
    // ESTADO ATUAL (STATS)
    // ----------------------------------------------------
    const pastaFilter = pastaId !== null ? `pastaId.eq.${pastaId}` : "pastaId.is.null";

    const [
      statusRes,
      agenciaRes,
      produtoRes,
      origensRes,
      destinosRes,
      pastasRes,
      importacoesRes,
    ] = await Promise.all([
      // Agrupamento por status + pasta (para statusMap e detailedBreakdowns)
      supabase.rpc("get_status_counts", { p_pasta_id: pastaId }),
      // Top agências por faturamento
      supabase.from("Operacao")
        .select("nm_agencia, vl_total")
        .order("vl_total", { ascending: false })
        .limit(500),
      // Top produtos por volume
      supabase.from("Operacao")
        .select("nm_produto")
        .limit(1000),
      // Top origens
      supabase.from("Operacao")
        .select("nm_cidade_origem")
        .limit(1000),
      // Top destinos  
      supabase.from("Operacao")
        .select("nm_cidade_destino")
        .limit(1000),
      // Todas as pastas (para labels dos breakdowns)
      supabase.from("Pasta").select("id, nome"),
      // Últimas importações (só se não for sub-pasta)
      pastaId === null
        ? supabase.from("Importacao").select("*").order("createdAt", { ascending: false }).limit(50)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Processar agências
    const agenciaMap: Record<string, number> = {};
    for (const row of (agenciaRes.data ?? [])) {
      const ag = row.nm_agencia || "Outros";
      agenciaMap[ag] = (agenciaMap[ag] || 0) + Number(row.vl_total || 0);
    }
    const porAgencia = Object.entries(agenciaMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([nm_agencia, vl_total]) => ({ nm_agencia, _sum: { vl_total } }));

    // Processar produtos
    const produtoMap: Record<string, number> = {};
    for (const row of (produtoRes.data ?? [])) {
      const p = row.nm_produto || "Outros";
      produtoMap[p] = (produtoMap[p] || 0) + 1;
    }
    const porProduto = Object.entries(produtoMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([nm_produto, count]) => ({ nm_produto, _count: { id: count } }));

    // Processar origens
    const origenMap: Record<string, number> = {};
    for (const row of (origensRes.data ?? [])) {
      const c = row.nm_cidade_origem || "";
      if (c) origenMap[c] = (origenMap[c] || 0) + 1;
    }
    const topOrigens = Object.entries(origenMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nm_cidade_origem, count]) => ({ nm_cidade_origem, _count: { id: count } }));

    // Processar destinos
    const destinoMap: Record<string, number> = {};
    for (const row of (destinosRes.data ?? [])) {
      const c = row.nm_cidade_destino || "";
      if (c) destinoMap[c] = (destinoMap[c] || 0) + 1;
    }
    const topDestinos = Object.entries(destinoMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nm_cidade_destino, count]) => ({ nm_cidade_destino, _count: { id: count } }));

    // Processar statusMap e totais a partir da RPC (ou fallback manual)
    const todasPastas = pastasRes.data ?? [];
    let totalVal = 0, totalPeso = 0, totalCount = 0;
    const statusMap: Record<string, number> = {};
    const detailedBreakdowns: Record<string, { id: number | null; label: string; count: number }[]> = {};

    for (const item of (statusRes.data ?? [])) {
      const val = Number(item.vl_total || 0);
      const peso = Number(item.vl_peso || 0);
      const count = Number(item.count || 0);
      totalVal += val;
      totalPeso += peso;
      totalCount += count;

      if (item.status) {
        statusMap[item.status] = (statusMap[item.status] || 0) + count;
        if (!detailedBreakdowns[item.status]) detailedBreakdowns[item.status] = [];
        if (item.pasta_id === null) {
          detailedBreakdowns[item.status].push({ id: null, label: "Caixa de Entrada", count });
        } else {
          const pasta = todasPastas.find((p: any) => p.id === item.pasta_id);
          if (pasta) detailedBreakdowns[item.status].push({ id: pasta.id, label: pasta.nome, count });
        }
      }
    }

    const result = {
      totais: { _sum: { vl_total: totalVal, vl_peso: totalPeso }, _count: { id: totalCount }, statusMap },
      detailedBreakdowns,
      porAgencia,
      porProduto,
      topOrigens,
      topDestinos,
      ultimasImportacoes: importacoesRes.data ?? [],
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // Cache na CDN do Supabase por 60s — dashboard instantâneo para todos!
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

