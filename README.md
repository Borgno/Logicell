# Logicell

[![React Router](https://img.shields.io/badge/React_Router-v7-CA4245?logo=react-router)](https://reactrouter.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase)](https://supabase.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

O **Logicell** é uma plataforma corporativa para gerenciamento de operações logísticas. O sistema centraliza o processamento de planilhas complexas, organização em pastas e filtros avançados.

---

## ✨ Funcionalidades Principais

- **Autenticação e Sessão (Supabase):** Integração com Supabase para login e proteção de rotas via Server-Side Rendering (SSR).
- **Importação de Planilhas:** Processamento server-side com suporte a dois modos distintos: **Substituir**, que removendo operações antigas, e o modo **Apenas Adicionar**, que agrega novos dados preservando as operações antigas.
- **Sistema Anti-Duplicidade:** Prevenção contra linhas repetidas através da geração de uma `hash_assinatura` exclusiva para cada operação e restrições (`skipDuplicates`), ignorando as repetidas automaticamente.
- **Exportação de Planilhas:** Botão para exportar as operações das pastas em planilhas XLSX.
- **Organização em Pastas:** Criação de pastas personalizadas para categorizar as operações, organizando as operações fora da Caixa de Entrada.
- **Regras de Triagem:** Sistema para criação de regras automáticas que direcionam operações recém-importadas para pastas específicas com base em atributos como Agência e Cliente.
- **Tabela Interativa:** Renderização de dados utilizando React Data Grid, com suporte a paginação assíncrona, fixação de colunas e gerenciamento de estado global no cliente via Zustand.
- **Interações:** Seleções complexas de células (clique e arraste, `Shift + Clique` para intervalos e `Ctrl + Clique` para células avulsas), atalhos de cópia (`Ctrl+C`) mantendo a formatação de tabela
- **Personalização de Visualização:** Reordenação de colunas e redimensionamento persistente, permitindo que a grid seja ajustada sob medida.
- **Produtividade estilo Excel:** Recurso avançado que permite preenchimento em massa ao arrastar o marcador no canto inferior da célula selecionada.
- **Mecanismo de Pesquisa e Filtros:** Lógica de busca dinâmica (*Query Builder*) no backend via Prisma. Garantindo performance em buscas textuais parciais através de índices **GIN** (`pg_trgm`) nativos do PostgreSQL.

---

## 🛠️ Tech Stack

| Categoria | Tecnologia |
| :--- | :--- |
| **Framework** | React Router v7 (Framework Mode) |
| **Auth & Backend** | Supabase (SSR Auth & Storage) |
| **Linguagem** | TypeScript |
| **Banco de Dados** | PostgreSQL |
| **ORM** | Prisma |
| **Estado Global** | Zustand |
| **Estilização** | Tailwind CSS |
| **Componentes e Ícones**| React Data Grid, Lucide React |

---

## 📂 Estrutura Arquitetural

```text
├── app/
│   ├── components/        # Componentes UI reutilizáveis
│   ├── context/           # Provedores de Estado e AuthProvider (Supabase Context)
│   ├── hooks/             # Custom Hooks da aplicação
│   ├── lib/               # Bibliotecas, configurações e utilitários
│   ├── routes/            # Controladores de rota
│   ├── services/          # SSR Services (Supabase, Operação, Sessão)
│   ├── store/             # Gerenciamento de estado global (Zustand)
│   ├── styles/            # Arquivos de estilo e configurações do Tailwind
│   ├── utils/             # Helpers p/ parser Excel, formatações (Data, Moeda)
│   ├── views/             # Telas e views principais (OperacoesView, LoginView, etc.)
│   ├── root.tsx           # Layout Global e UI Context
│   ├── routes.ts          # Definição estrutural das rotas (React Router v7)
│   ├── entry.client.tsx   # Ponto de entrada no cliente
│   └── entry.server.tsx   # Ponto de entrada no servidor
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
   npm install
   ```

2. **Configure o Ambiente**
   Crie ou renomeie o arquivo `.env` baseando-se no `.env.example` e declare suas variáveis correspondentes de acesso ao Supabase (URL e chaves) e Banco de Dados (`DATABASE_URL`).

3. **Gere os Tipos e Migre o Banco de Dados**
   ```bash
   npm run generate
   npm run migrate
   ```

4. **Inicie o Servidor de Desenvolvimento**
   ```bash
   npm run dev
   ```

---