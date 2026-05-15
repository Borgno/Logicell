# Logicell

[![React Router](https://img.shields.io/badge/React_Router-v7-CA4245?logo=react-router)](https://reactrouter.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase)](https://supabase.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Zod](https://img.shields.io/badge/Zod-Validation-3068b7?logo=zod)](https://zod.dev)

O **Logicell** é uma plataforma corporativa premium para gerenciamento de operações logísticas. O sistema centraliza o processamento de planilhas complexas, organização em pastas, filtros avançados e análise financeira avançada através de Dashboards de alta densidade.

---

## ✨ Funcionalidades Principais

- **🔐 Autenticação Segura (Supabase):** Sistema de login corporativo com proteção de rotas via Server-Side Auth.
- **📦 Importação Inteligente (Excel):** Mapeamento automático e tolerante a falhas de 29 colunas técnicas com múltiplos *aliases*. Validação estrita de dados em tempo real utilizando Zod e feedback claro para o usuário sobre linhas inconsistentes. Sincronização inteligente da Caixa de Entrada e pastas com exclusão automática de itens órfãos e preservação de itens duplicados.
- **🛡️ Integridade de Dados e Prevenção:** Bloqueio robusto de duplicatas via chave única composta e verificação MD5 do arquivo base. Validação automatizada para pastas com nomes idênticos e operações já existentes.
- **📂 Workflow em Pastas:** Gerenciamento dinâmico de itens transitando entre a Caixa de Entrada e Pastas personalizadas, com movimentação em lote e seleção individual.
- **🔍 Busca Universal Avançada:** Sistema de pesquisa integrado e otimizado cobrindo atributos chaves em todas as listagens: *ID da operação, Agência, Filial, Lote, Placa, CT-e, Nota Fiscal (NF), entre outros*.
- **🕵️ Sistema de Auditoria & Rastreabilidade Premium:** Registro forense de operações mantendo o contexto (Agência, CTe, NF, Valor, Emissão) acessível mesmo depois da exclusão lógica ou física do item. Interface unificada para ações individuais e em lote.
- **📊 Dashboard Multi-Nível com Analytics:** Painéis estratégicos detalhados tanto em nível Global quanto em nível de Pasta individual. Inclui o **Fluxo Operacional** (grade de status interativa), Análise de Distribuição por Agência, Mix de Produtos e Fluxos Geográficos de Origem/Destino.
- **⚡ Navegação Direta via Dashboard:** Integração inteligente onde o clique em métricas de status no dashboard fecha o modal e aplica automaticamente o filtro correspondente na tabela de operações, eliminando passos intermediários.
- **👤 Padronização de Identidade (Nicknames):** Mapeamento centralizado e fixo de usuários corporativos, substituindo identificadores longos (e-mails) por apelidos padronizados em todo o ecossistema (Sidebar, Auditoria, Histórico de Importação).
- **🛠️ Edição Inline Premium:** Edição interativa diretamente nas células da tabela. Validação local, formatação automática (`R$`, Numérico, Data), seleção suspensa para "Status" e salvamento assíncrono com feedback visual silencioso (sem recarregar a página).
- **📋 Seleção de celulas e Extração:** 
   - Sistema de seleção de celulas, seleção múltipla não-contígua (`Ctrl + Clique`) e seleção em massa (arrastar e soltar ou `Shift + Clique`).
   - Sistema de cópia (`Ctrl+C`) que formata os dados selecionados mantendo a formatação de planilha.
---

## 🛠️ Tech Stack

| Categoria | Tecnologia |
| :--- | :--- |
| **Framework** | React Router v7 (Framework Mode) |
| **Auth & Backend** | Supabase (SSR Auth & Storage) |
| **Linguagem** | TypeScript |
| **Validação** | Zod |
| **Banco de Dados** | PostgreSQL |
| **ORM** | Prisma |
| **Estilização** | Tailwind CSS (Utilitários avançados, twMerge, clsx) |
| **Componentes e Ícones**| Recharts (Gráficos), Lucide React (Ícones) |

---

## 📂 Estrutura Arquitetural

```text
├── app/
│   ├── components/        # Componentes UI reutilizáveis (Ex: EditableCell, StatsView)
│   │   └── dashboard/     # Componentes modulares do Dashboard (StatusGrid, AnalyticsSection, etc.)
│   ├── constants/         # Centralização de Regras de Negócio e Mapeamentos (Usuarios, Operacoes)
│   ├── context/           # Provedores de Estado e AuthProvider (Supabase Context)
│   ├── routes/            # Rotas Full-stack via React Router v7 (Dashboard, Inbox, Login, Pastas)
│   ├── services/          # SSR Services (Supabase, Operação, Sessão, Dashboard)
│   ├── utils/             # Helpers p/ parser Excel, formatações (Data, Moeda) e DateParser
│   ├── root.tsx           # Layout Global e UI Context
│   └── entry.server.tsx
├── prisma/
│   ├── schema.prisma      # Modelagem ORM (Operacao, Pasta, Auditoria, Importacao)
│   └── migrations/        # Versionamento do Banco de Dados
├── .env.example           # Template de Variáveis de Ambiente
└── bun.lock               # Gerenciamento determinístico de pacotes do Bun
```

---

## 🏁 Primeiros Passos

### Pré-requisitos
- Projeto e chaves criadas no **[Supabase](https://supabase.com/)**.
- Banco de Dados PostgreSQL configurado.

### Instalação e Execução

1. **Instale as dependências**
   ```bash
   bun install
   ```

2. **Configure o Ambiente**
   Crie ou renomeie o arquivo `.env` baseando-se no `.env.example` e declare suas variáveis correspondentes de acesso ao Supabase (URL e chaves) e Banco de Dados (`DATABASE_URL`).

3. **Gere os Tipos e Migre o Banco de Dados**
   ```bash
   bun run generate
   bun run migrate
   ```

4. **Inicie o Servidor de Desenvolvimento**
   ```bash
   bun run dev
   ```

---