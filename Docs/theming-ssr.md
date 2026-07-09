# Arquitetura de Theming SSR — Dark/Light Mode sem Flash

> Coloque este arquivo em `docs/theming-ssr.md`.
> Esta é a referência ÚNICA e obrigatória para implementar a troca de tema (Light/Dark) em qualquer projeto Remix / React Router (SSR).
> Sempre que for implementar theming, siga este documento à risca — ele existe para eliminar o "flash branco" no carregamento e manter o padrão consistente entre projetos.
>
> Este doc assume que o projeto já usa o `docs/design-system.md`, cujas variáveis CSS dependem da classe `.dark` no `<html>`.

---

## 0. Regras Inegociáveis

1. **Tema nunca é decidido no client antes do primeiro paint.** Se em algum ponto o código depende de `useEffect` para aplicar a classe `.dark`, está errado — isso é o que causa o flash.
2. **Cookie é a única fonte da verdade do tema no servidor.** Não usar `localStorage` como fonte de verdade (pode ser usado como cache local, mas quem decide o que o servidor renderiza é sempre o cookie).
3. **Sem fallback de `prefers-color-scheme`.** O padrão do sistema é sempre `light` na ausência de cookie. Não implementar detecção de preferência do SO.
4. **Sem sincronização entre abas em tempo real.** Se o usuário trocar o tema em uma aba, outras abas abertas só refletem a mudança em uma nova navegação/reload. Isso é esperado — não implementar `BroadcastChannel` ou `storage` events para isso.
5. **`suppressHydrationWarning` é obrigatório na tag `<html>`**, pois o React não tem como saber com certeza absoluta, na hidratação, que o valor calculado no client bate 100% com o atribuído pelo servidor — mesmo sendo o mesmo cookie.

---

## 1. Por que não usar `localStorage`

Fluxo problemático:
1. Servidor renderiza HTML com tema padrão (claro).
2. Navegador pinta a tela branca.
3. JS carrega, roda `useEffect`, lê `localStorage`, aplica `.dark`.
4. Tela "pisca" de branco para escuro.

Esse flash acontece porque o servidor não tem acesso ao `localStorage` — ele só existe no navegador, então o SSR não consegue saber qual tema usar antes de mandar o HTML.

## 2. A Solução: Cookie + SSR

Cookies são enviados no header da requisição, **antes** do servidor montar a página. Isso significa que o `loader` já sabe o tema do usuário antes de gerar qualquer HTML — o `<html class="dark">` já nasce correto, sem necessidade de JS rodar depois para corrigir.

---

## 3. Implementação — Passo a Passo

### Passo 1 — Cookie utilitário

```typescript
// app/services/config.server.ts
import { createCookie } from "react-router"; // ou @remix-run/node

export const themeCookie = createCookie("app_theme", {
  maxAge: 31536000, // 1 ano
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production", // exige HTTPS em produção
});
```

> `secure: true` em produção evita que o cookie seja rejeitado/reenviado de forma inconsistente em ambientes HTTPS estritos. Em desenvolvimento (`http://localhost`) precisa ficar `false`, por isso a condicional.

### Passo 2 — Ler o cookie no `loader` (root.tsx)

```typescript
// app/root.tsx
import { themeCookie } from "./services/config.server";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const theme = (await themeCookie.parse(cookieHeader)) || "light"; // padrão fixo: light

  return { theme };
}
```

Não há branch para preferência de sistema — ausência de cookie sempre resulta em `"light"`, propositalmente.

### Passo 3 — Injetar a classe no `<html>`

```tsx
// app/root.tsx
import { useLoaderData } from "react-router";

export default function App() {
  const { theme } = useLoaderData<typeof loader>();

  return (
    <html lang="pt-BR" className={theme === "dark" ? "dark" : ""} suppressHydrationWarning>
      <head>
        <Meta />
        <Links />
      </head>
      <body className="bg-bg text-text">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` fica **apenas** na tag `<html>` (nunca espalhar isso por outros elementos) — é o único ponto onde o valor pode, em teoria, divergir entre server e client por causa de timing de cookie, e o React não precisa nos avisar disso toda vez.

### Passo 4 — Toggle com feedback otimista

```tsx
// app/components/ThemeToggle.tsx
import { useFetcher } from "react-router";
import { useState } from "react";

export function ThemeToggle({ initialTheme }: { initialTheme: "light" | "dark" }) {
  const fetcher = useFetcher();
  const [isDark, setIsDark] = useState(initialTheme === "dark");

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";

    // 1. Feedback visual imediato — não espera o servidor responder
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark", !isDark);

    // 2. Persiste no servidor em background
    fetcher.submit(
      { intent: "setTheme", theme: newTheme },
      { method: "post", action: "/api/config" }
    );
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-lg bg-surface border border-glass-border
        text-text-muted flex items-center justify-center transition-all
        hover:bg-primary hover:border-primary hover:text-white"
      aria-label="Alternar tema"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
```

> Nota sobre o passo 1 do toggle: além de mudar o `useState`, aplicamos a classe direto no `document.documentElement` para o feedback ser instantâneo sem esperar re-render do `loader`. O `useState` aqui serve só para controlar o ícone (sol/lua) do próprio botão.

### Passo 5 — Rota de API para persistir o cookie

```typescript
// app/routes/api.config.ts
import type { ActionFunctionArgs } from "react-router";
import { themeCookie } from "~/services/config.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "setTheme") {
    const theme = formData.get("theme") === "dark" ? "dark" : "light";

    return new Response(null, {
      headers: {
        "Set-Cookie": await themeCookie.serialize(theme),
      },
    });
  }

  return new Response(null, { status: 400 });
}
```

---

## 4. Integração com o Design System (Tailwind + CSS Variables)

Este passo já deve estar coberto se o projeto segue `docs/design-system.md`. Resumo do que precisa existir em `app/styles/globals.css`:

```css
:root {
  --bg: #f0f2f5;
  --text: #0d1117;
  /* ...demais tokens do design-system.md */
}

.dark {
  --bg: #090b0e;
  --text: #f3f5f8;
  /* ...demais tokens do design-system.md */
}
```

No JSX, nunca escrever `dark:bg-slate-900` — sempre usar a classe semântica (`bg-bg`, `text-text`). A troca de `.dark` no `<html>` já propaga a mudança sozinha, sem nenhuma lógica condicional no componente.

---

## 5. Limitações Aceitas (por design, não são bugs)

| Limitação | Por quê é aceitável |
|---|---|
| Sem detecção de `prefers-color-scheme` | Decisão de produto: o padrão é sempre `light` até o usuário escolher explicitamente. |
| Múltiplas abas não sincronizam em tempo real | Baixo impacto — o usuário raramente troca tema com múltiplas abas abertas simultaneamente. Sincronizar exigiria `BroadcastChannel`/`storage` events, complexidade desnecessária para o ganho. |
| 1 render pode divergir do cookie em edge cases (ex: cookie expirado no meio da sessão) | Coberto por `suppressHydrationWarning` no `<html>`, sem gerar warning no console. |

---

## 6. Checklist antes de considerar o theming pronto

- [ ] Cookie é lido no `loader`, nunca em `useEffect`
- [ ] `<html>` recebe a classe `.dark` já no primeiro HTML enviado pelo servidor (verificar via "view source", não só devtools)
- [ ] `suppressHydrationWarning` presente apenas na tag `<html>`
- [ ] Cookie configurado com `secure: true` em produção
- [ ] Nenhuma classe `dark:` usada nos componentes — só classes semânticas do design system
- [ ] Toggle aplica a classe no DOM imediatamente (feedback otimista) além de persistir via fetcher
- [ ] Testado com JS desabilitado: o tema correto ainda deve aparecer no primeiro carregamento (prova de que é 100% SSR-driven)
