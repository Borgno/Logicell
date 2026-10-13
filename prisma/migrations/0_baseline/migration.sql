-- Baseline: o schema public de produção como estava em 2026-10-13, tirado com
-- pg_dump --schema-only --schema=public --no-owner --no-privileges.
-- Em produção esta migration é marcada como aplicada (prisma migrate resolve --applied 0_baseline)
-- e não roda. Em banco vazio (dev, teste, CI) ela cria o schema inteiro.
-- Removidos do dump: SET e set_config de sessão, CREATE SCHEMA public e a tabela _prisma_migrations.

-- O pg_dump com --schema=public não leva extensão. Em produção o pg_trgm está no schema public.
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA public;

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

--
-- Name: Configuracao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Configuracao" (
    id integer DEFAULT 1 NOT NULL,
    "prazoPadraoDias" integer DEFAULT 10 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: Importacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Importacao" (
    id integer NOT NULL,
    "nomeArquivo" text NOT NULL,
    usuario text NOT NULL,
    "qtdRegistros" integer NOT NULL,
    "hashArquivo" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: Importacao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Importacao_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: Importacao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Importacao_id_seq" OWNED BY public."Importacao".id;

--
-- Name: Operacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Operacao" (
    id integer NOT NULL,
    nm_agencia text NOT NULL,
    cd_pessoa_pagador text,
    nm_pessoa_pagador text,
    nr_cpf_cnpj_raiz text,
    nr_cpf_cnpj_pagador text,
    nr_ctrc text NOT NULL,
    id_tipo_documento text,
    nm_pessoa_remetente text,
    nm_cidade_origem text,
    ds_sigla_origem text,
    nm_pessoa_destinatario text,
    nm_cidade_destino text,
    ds_sigla_destino text,
    nm_produto text,
    vl_peso numeric(18,4),
    vl_tarifa numeric(18,2),
    vl_total numeric(18,2),
    nr_nf text,
    ds_placa text,
    nm_pessoa_matriz text,
    nr_contrato text,
    nr_chave_acesso text,
    nm_pessoa_usuario_lancamento text,
    id_tipo_ctrc text,
    nm_proprietario_posse_cavalo text,
    nm_motorista text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    dt_emissao_ timestamp(3) without time zone,
    "importacaoId" integer,
    "pastaId" integer,
    comentarios text,
    status text,
    hash_assinatura text,
    data_status timestamp(3) without time zone,
    id_solicitacao text,
    dt_quitacao_saldo timestamp(3) without time zone
);

--
-- Name: Operacao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Operacao_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: Operacao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Operacao_id_seq" OWNED BY public."Operacao".id;

--
-- Name: OrdemColunas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrdemColunas" (
    id integer NOT NULL,
    ordem text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: OrdemColunas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."OrdemColunas_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: OrdemColunas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."OrdemColunas_id_seq" OWNED BY public."OrdemColunas".id;

--
-- Name: Pasta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Pasta" (
    id integer NOT NULL,
    nome text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    cor text,
    "faturistaId" text
);

--
-- Name: Pasta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Pasta_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: Pasta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Pasta_id_seq" OWNED BY public."Pasta".id;

--
-- Name: PrazoCliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PrazoCliente" (
    id integer NOT NULL,
    cliente text NOT NULL,
    "prazoDias" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

--
-- Name: PrazoCliente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PrazoCliente_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: PrazoCliente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PrazoCliente_id_seq" OWNED BY public."PrazoCliente".id;

--
-- Name: RegraAutomacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RegraAutomacao" (
    id integer NOT NULL,
    "pastaId" integer NOT NULL,
    agencia text,
    cliente text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    produto text
);

--
-- Name: RegraAutomacao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RegraAutomacao_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: RegraAutomacao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RegraAutomacao_id_seq" OWNED BY public."RegraAutomacao".id;

--
-- Name: SnapshotImportacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SnapshotImportacao" (
    id integer NOT NULL,
    "importacaoId" integer NOT NULL,
    pastas jsonb NOT NULL,
    operacoes jsonb NOT NULL,
    regras jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: SnapshotImportacao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."SnapshotImportacao_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: SnapshotImportacao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."SnapshotImportacao_id_seq" OWNED BY public."SnapshotImportacao".id;

--
-- Name: Importacao id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Importacao" ALTER COLUMN id SET DEFAULT nextval('public."Importacao_id_seq"'::regclass);

--
-- Name: Operacao id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Operacao" ALTER COLUMN id SET DEFAULT nextval('public."Operacao_id_seq"'::regclass);

--
-- Name: OrdemColunas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrdemColunas" ALTER COLUMN id SET DEFAULT nextval('public."OrdemColunas_id_seq"'::regclass);

--
-- Name: Pasta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Pasta" ALTER COLUMN id SET DEFAULT nextval('public."Pasta_id_seq"'::regclass);

--
-- Name: PrazoCliente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PrazoCliente" ALTER COLUMN id SET DEFAULT nextval('public."PrazoCliente_id_seq"'::regclass);

--
-- Name: RegraAutomacao id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegraAutomacao" ALTER COLUMN id SET DEFAULT nextval('public."RegraAutomacao_id_seq"'::regclass);

--
-- Name: SnapshotImportacao id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SnapshotImportacao" ALTER COLUMN id SET DEFAULT nextval('public."SnapshotImportacao_id_seq"'::regclass);

--
-- Name: Configuracao Configuracao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Configuracao"
    ADD CONSTRAINT "Configuracao_pkey" PRIMARY KEY (id);

--
-- Name: Importacao Importacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Importacao"
    ADD CONSTRAINT "Importacao_pkey" PRIMARY KEY (id);

--
-- Name: Operacao Operacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Operacao"
    ADD CONSTRAINT "Operacao_pkey" PRIMARY KEY (id);

--
-- Name: OrdemColunas OrdemColunas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrdemColunas"
    ADD CONSTRAINT "OrdemColunas_pkey" PRIMARY KEY (id);

--
-- Name: Pasta Pasta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Pasta"
    ADD CONSTRAINT "Pasta_pkey" PRIMARY KEY (id);

--
-- Name: PrazoCliente PrazoCliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PrazoCliente"
    ADD CONSTRAINT "PrazoCliente_pkey" PRIMARY KEY (id);

--
-- Name: RegraAutomacao RegraAutomacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegraAutomacao"
    ADD CONSTRAINT "RegraAutomacao_pkey" PRIMARY KEY (id);

--
-- Name: SnapshotImportacao SnapshotImportacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SnapshotImportacao"
    ADD CONSTRAINT "SnapshotImportacao_pkey" PRIMARY KEY (id);

--
-- Name: Importacao_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Importacao_createdAt_idx" ON public."Importacao" USING btree ("createdAt" DESC);

--
-- Name: Operacao_comentarios_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_comentarios_gin_idx" ON public."Operacao" USING gin (comentarios public.gin_trgm_ops);

--
-- Name: Operacao_ds_placa_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_ds_placa_gin_idx" ON public."Operacao" USING gin (ds_placa public.gin_trgm_ops);

--
-- Name: Operacao_ds_placa_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_ds_placa_idx" ON public."Operacao" USING gin (ds_placa public.gin_trgm_ops);

--
-- Name: Operacao_dt_emissao__idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_dt_emissao__idx" ON public."Operacao" USING btree (dt_emissao_);

--
-- Name: Operacao_hash_assinatura_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Operacao_hash_assinatura_key" ON public."Operacao" USING btree (hash_assinatura);

--
-- Name: Operacao_id_solicitacao_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_id_solicitacao_gin_idx" ON public."Operacao" USING gin (id_solicitacao public.gin_trgm_ops);

--
-- Name: Operacao_nm_agencia_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_agencia_gin_idx" ON public."Operacao" USING gin (nm_agencia public.gin_trgm_ops);

--
-- Name: Operacao_nm_agencia_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_agencia_idx" ON public."Operacao" USING btree (nm_agencia);

--
-- Name: Operacao_nm_agencia_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_agencia_status_idx" ON public."Operacao" USING btree (nm_agencia, status);

--
-- Name: Operacao_nm_cidade_destino_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_cidade_destino_gin_idx" ON public."Operacao" USING gin (nm_cidade_destino public.gin_trgm_ops);

--
-- Name: Operacao_nm_cidade_origem_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_cidade_origem_gin_idx" ON public."Operacao" USING gin (nm_cidade_origem public.gin_trgm_ops);

--
-- Name: Operacao_nm_motorista_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_motorista_gin_idx" ON public."Operacao" USING gin (nm_motorista public.gin_trgm_ops);

--
-- Name: Operacao_nm_motorista_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_motorista_idx" ON public."Operacao" USING btree (nm_motorista);

--
-- Name: Operacao_nm_pessoa_destinatario_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_pessoa_destinatario_gin_idx" ON public."Operacao" USING gin (nm_pessoa_destinatario public.gin_trgm_ops);

--
-- Name: Operacao_nm_pessoa_destinatario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_pessoa_destinatario_idx" ON public."Operacao" USING btree (nm_pessoa_destinatario);

--
-- Name: Operacao_nm_pessoa_matriz_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_pessoa_matriz_gin_idx" ON public."Operacao" USING gin (nm_pessoa_matriz public.gin_trgm_ops);

--
-- Name: Operacao_nm_pessoa_matriz_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_pessoa_matriz_idx" ON public."Operacao" USING btree (nm_pessoa_matriz);

--
-- Name: Operacao_nm_pessoa_pagador_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_pessoa_pagador_gin_idx" ON public."Operacao" USING gin (nm_pessoa_pagador public.gin_trgm_ops);

--
-- Name: Operacao_nm_pessoa_pagador_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_pessoa_pagador_idx" ON public."Operacao" USING gin (nm_pessoa_pagador public.gin_trgm_ops);

--
-- Name: Operacao_nm_pessoa_remetente_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_pessoa_remetente_gin_idx" ON public."Operacao" USING gin (nm_pessoa_remetente public.gin_trgm_ops);

--
-- Name: Operacao_nm_pessoa_remetente_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_pessoa_remetente_idx" ON public."Operacao" USING btree (nm_pessoa_remetente);

--
-- Name: Operacao_nm_pessoa_usuario_lancamento_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_pessoa_usuario_lancamento_gin_idx" ON public."Operacao" USING gin (nm_pessoa_usuario_lancamento public.gin_trgm_ops);

--
-- Name: Operacao_nm_produto_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_produto_gin_idx" ON public."Operacao" USING gin (nm_produto public.gin_trgm_ops);

--
-- Name: Operacao_nm_produto_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_produto_idx" ON public."Operacao" USING gin (nm_produto public.gin_trgm_ops);

--
-- Name: Operacao_nm_proprietario_posse_cavalo_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nm_proprietario_posse_cavalo_gin_idx" ON public."Operacao" USING gin (nm_proprietario_posse_cavalo public.gin_trgm_ops);

--
-- Name: Operacao_nr_chave_acesso_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nr_chave_acesso_gin_idx" ON public."Operacao" USING gin (nr_chave_acesso public.gin_trgm_ops);

--
-- Name: Operacao_nr_chave_acesso_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nr_chave_acesso_idx" ON public."Operacao" USING btree (nr_chave_acesso);

--
-- Name: Operacao_nr_contrato_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nr_contrato_gin_idx" ON public."Operacao" USING gin (nr_contrato public.gin_trgm_ops);

--
-- Name: Operacao_nr_contrato_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nr_contrato_idx" ON public."Operacao" USING btree (nr_contrato);

--
-- Name: Operacao_nr_ctrc_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nr_ctrc_gin_idx" ON public."Operacao" USING gin (nr_ctrc public.gin_trgm_ops);

--
-- Name: Operacao_nr_ctrc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nr_ctrc_idx" ON public."Operacao" USING gin (nr_ctrc public.gin_trgm_ops);

--
-- Name: Operacao_nr_nf_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nr_nf_gin_idx" ON public."Operacao" USING gin (nr_nf public.gin_trgm_ops);

--
-- Name: Operacao_nr_nf_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_nr_nf_idx" ON public."Operacao" USING btree (nr_nf);

--
-- Name: Operacao_pastaId_data_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_pastaId_data_status_idx" ON public."Operacao" USING btree ("pastaId", data_status DESC);

--
-- Name: Operacao_pastaId_dt_emissao__idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_pastaId_dt_emissao__idx" ON public."Operacao" USING btree ("pastaId", dt_emissao_ DESC);

--
-- Name: Operacao_pastaId_dt_quitacao_saldo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_pastaId_dt_quitacao_saldo_idx" ON public."Operacao" USING btree ("pastaId", dt_quitacao_saldo DESC);

--
-- Name: Operacao_pastaId_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_pastaId_id_idx" ON public."Operacao" USING btree ("pastaId", id DESC);

--
-- Name: Operacao_pastaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_pastaId_idx" ON public."Operacao" USING btree ("pastaId");

--
-- Name: Operacao_pastaId_vl_peso_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_pastaId_vl_peso_idx" ON public."Operacao" USING btree ("pastaId", vl_peso DESC);

--
-- Name: Operacao_pastaId_vl_tarifa_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_pastaId_vl_tarifa_idx" ON public."Operacao" USING btree ("pastaId", vl_tarifa DESC);

--
-- Name: Operacao_pastaId_vl_total_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_pastaId_vl_total_idx" ON public."Operacao" USING btree ("pastaId", vl_total DESC);

--
-- Name: Operacao_status_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_status_gin_idx" ON public."Operacao" USING gin (status public.gin_trgm_ops);

--
-- Name: Operacao_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_status_idx" ON public."Operacao" USING btree (status);

--
-- Name: Operacao_upper_cd_pessoa_pagador_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_cd_pessoa_pagador_idx" ON public."Operacao" USING btree (upper(cd_pessoa_pagador));

--
-- Name: Operacao_upper_comentarios_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_comentarios_idx" ON public."Operacao" USING btree (upper(comentarios));

--
-- Name: Operacao_upper_ds_placa_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_ds_placa_idx" ON public."Operacao" USING btree (upper(ds_placa));

--
-- Name: Operacao_upper_ds_sigla_destino_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_ds_sigla_destino_idx" ON public."Operacao" USING btree (upper(ds_sigla_destino));

--
-- Name: Operacao_upper_ds_sigla_origem_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_ds_sigla_origem_idx" ON public."Operacao" USING btree (upper(ds_sigla_origem));

--
-- Name: Operacao_upper_id_solicitacao_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_id_solicitacao_idx" ON public."Operacao" USING btree (upper(id_solicitacao));

--
-- Name: Operacao_upper_id_tipo_ctrc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_id_tipo_ctrc_idx" ON public."Operacao" USING btree (upper(id_tipo_ctrc));

--
-- Name: Operacao_upper_id_tipo_documento_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_id_tipo_documento_idx" ON public."Operacao" USING btree (upper(id_tipo_documento));

--
-- Name: Operacao_upper_nm_agencia_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nm_agencia_idx" ON public."Operacao" USING btree (upper(nm_agencia));

--
-- Name: Operacao_upper_nm_cidade_destino_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nm_cidade_destino_idx" ON public."Operacao" USING btree (upper(nm_cidade_destino));

--
-- Name: Operacao_upper_nm_cidade_origem_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nm_cidade_origem_idx" ON public."Operacao" USING btree (upper(nm_cidade_origem));

--
-- Name: Operacao_upper_nm_motorista_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nm_motorista_idx" ON public."Operacao" USING btree (upper(nm_motorista));

--
-- Name: Operacao_upper_nm_pessoa_destinatario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nm_pessoa_destinatario_idx" ON public."Operacao" USING btree (upper(nm_pessoa_destinatario));

--
-- Name: Operacao_upper_nm_pessoa_matriz_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nm_pessoa_matriz_idx" ON public."Operacao" USING btree (upper(nm_pessoa_matriz));

--
-- Name: Operacao_upper_nm_pessoa_pagador_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nm_pessoa_pagador_idx" ON public."Operacao" USING btree (upper(nm_pessoa_pagador));

--
-- Name: Operacao_upper_nm_pessoa_remetente_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nm_pessoa_remetente_idx" ON public."Operacao" USING btree (upper(nm_pessoa_remetente));

--
-- Name: Operacao_upper_nm_pessoa_usuario_lancamento_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nm_pessoa_usuario_lancamento_idx" ON public."Operacao" USING btree (upper(nm_pessoa_usuario_lancamento));

--
-- Name: Operacao_upper_nm_produto_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nm_produto_idx" ON public."Operacao" USING btree (upper(nm_produto));

--
-- Name: Operacao_upper_nm_proprietario_posse_cavalo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nm_proprietario_posse_cavalo_idx" ON public."Operacao" USING btree (upper(nm_proprietario_posse_cavalo));

--
-- Name: Operacao_upper_nr_chave_acesso_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nr_chave_acesso_idx" ON public."Operacao" USING btree (upper(nr_chave_acesso));

--
-- Name: Operacao_upper_nr_contrato_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nr_contrato_idx" ON public."Operacao" USING btree (upper(nr_contrato));

--
-- Name: Operacao_upper_nr_cpf_cnpj_pagador_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nr_cpf_cnpj_pagador_idx" ON public."Operacao" USING btree (upper(nr_cpf_cnpj_pagador));

--
-- Name: Operacao_upper_nr_cpf_cnpj_raiz_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nr_cpf_cnpj_raiz_idx" ON public."Operacao" USING btree (upper(nr_cpf_cnpj_raiz));

--
-- Name: Operacao_upper_nr_ctrc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_nr_ctrc_idx" ON public."Operacao" USING btree (upper(nr_ctrc));

--
-- Name: Operacao_upper_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_status_idx" ON public."Operacao" USING btree (upper(status));

--
-- Name: Operacao_upper_trim_pagador_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Operacao_upper_trim_pagador_trgm_idx" ON public."Operacao" USING gin (upper(TRIM(BOTH FROM nm_pessoa_pagador)) public.gin_trgm_ops);

--
-- Name: Pasta_nome_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Pasta_nome_key" ON public."Pasta" USING btree (nome);

--
-- Name: PrazoCliente_cliente_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PrazoCliente_cliente_key" ON public."PrazoCliente" USING btree (cliente);

--
-- Name: RegraAutomacao_pastaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RegraAutomacao_pastaId_idx" ON public."RegraAutomacao" USING btree ("pastaId");

--
-- Name: SnapshotImportacao_importacaoId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SnapshotImportacao_importacaoId_key" ON public."SnapshotImportacao" USING btree ("importacaoId");

--
-- Name: Operacao Operacao_importacaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Operacao"
    ADD CONSTRAINT "Operacao_importacaoId_fkey" FOREIGN KEY ("importacaoId") REFERENCES public."Importacao"(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: Operacao Operacao_pastaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Operacao"
    ADD CONSTRAINT "Operacao_pastaId_fkey" FOREIGN KEY ("pastaId") REFERENCES public."Pasta"(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: RegraAutomacao RegraAutomacao_pastaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RegraAutomacao"
    ADD CONSTRAINT "RegraAutomacao_pastaId_fkey" FOREIGN KEY ("pastaId") REFERENCES public."Pasta"(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: SnapshotImportacao SnapshotImportacao_importacaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SnapshotImportacao"
    ADD CONSTRAINT "SnapshotImportacao_importacaoId_fkey" FOREIGN KEY ("importacaoId") REFERENCES public."Importacao"(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

