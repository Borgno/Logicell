# Huashu Design System — Chronos Mono Blue (Tailwind)

> Coloque este arquivo em `docs/design-system.md`.
> Esta é a referência ÚNICA e obrigatória de design para qualquer tela, componente ou feature nova do projeto.
> Sempre que for construir uma UI, siga este documento à risca — ele existe para que o resultado visual seja **sempre o mesmo**, independente de quem (ou qual IA) está construindo.
>
> Não é decorativo — cada decisão existe para tornar dados legíveis e ações claras. Suporta tema Light e Dark via classe `.dark` no `<html>`.

---

## 0. Regras Inegociáveis (ler antes de tudo)

1. **Nunca hardcode cor.** Nunca usar `bg-white`, `text-gray-900`, `dark:bg-slate-900`, `#0066ff` direto no JSX. Sempre usar as classes semânticas deste doc (`bg-card-bg`, `text-text`, `bg-primary`).
2. **Um único acento.** `primary` é a única cor de "ação/ativo" do sistema. `success` é o **mesmo azul do primary** — não existe verde no sistema. Apenas `error` (vermelho) e `warning` (âmbar) têm cor própria, e só são usados para status, nunca para ação.
3. **Tipografia dupla.** Texto de UI = `font-sans` (Plus Jakarta Sans). Corpo/parágrafo = `font-inter`. Qualquer número, valor monetário, código ou métrica = `font-mono` (JetBrains Mono), sem exceção.
4. **Sem `dark:` classes.** O tema é resolvido pelas variáveis CSS (`.dark` no `<html>`), então a mesma classe Tailwind (`bg-card-bg`) já se adapta sozinha. Se você está escrevendo `dark:algumacoisa`, está fazendo errado — pare e use uma variável semântica.
5. **Botão primário é outline por padrão**, preenche só no hover ou em ações de prioridade máxima (login, confirmar exclusão).
6. **Bordas finas, sombra faz o trabalho de profundidade** — principalmente no light mode.

---

## 1. Setup — Tailwind Config

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // tema alternado via class="dark" no <html>
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        inter: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        bg: 'var(--bg)',
        'card-bg': 'var(--card-bg)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-dim': 'var(--text-dim)',
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
        'glass-border': 'var(--glass-border)',
        'border-focus': 'var(--border-focus)',
        surface: 'var(--surface)',
        'surface-light': 'var(--surface-light)',
        'badge-primary-text': 'var(--badge-primary-text)',
        'badge-primary-bg': 'var(--badge-primary-bg)',
        'badge-error-text': 'var(--badge-error-text)',
        'badge-error-bg': 'var(--badge-error-bg)',
        'badge-warning-text': 'var(--badge-warning-text)',
        'badge-warning-bg': 'var(--badge-warning-bg)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-elevated': 'var(--shadow-card-elevated)',
        modal: 'var(--shadow-modal)',
        'primary-glow': 'var(--shadow-primary-glow)',
      },
      spacing: {
        // escala 8pt — usar sempre estes em vez de valores arbitrários
        '1u': '8px',
        '2u': '16px',
        '3u': '24px',
        '4u': '32px',
        '5u': '40px',
        '6u': '48px',
        '8u': '64px',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionTimingFunction: {
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // modais, cards de auth
        layout: 'cubic-bezier(0.4, 0, 0.2, 1)',       // sidebar, transições de página
        ui: 'cubic-bezier(0.16, 1, 0.3, 1)',           // botões, inputs, hovers
      },
      keyframes: {
        modalIn: {
          '0%': { opacity: 0, transform: 'translateY(20px) scale(0.98)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      animation: {
        modalIn: 'modalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        fadeIn: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
```

## 2. Setup — CSS Variables

```css
/* app/styles/globals.css — importar ANTES do @tailwind base */

:root {
  /* ---- LIGHT (default) ---- */
  --primary: #0066ff;
  --primary-glow: rgba(0, 102, 255, 0.08);
  --secondary: #0044cc;

  --bg: #f0f2f5;
  --card-bg: #ffffff;

  --text: #0d1117;
  --text-muted: #5a6472;
  --text-dim: #9aa3ad;

  --success: #0066ff; /* igual ao primary — fidelidade à regra do único acento */
  --error: #e03048;
  --warning: #d97706;

  --glass-border: rgba(0, 0, 0, 0.08);
  --border-focus: rgba(0, 102, 255, 0.4);
  --surface: rgba(0, 0, 0, 0.03);
  --surface-light: rgba(0, 0, 0, 0.05);

  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-card-elevated: 0 4px 16px rgba(0, 0, 0, 0.08), 0 12px 32px rgba(0, 0, 0, 0.06);
  --shadow-modal: 0 8px 24px rgba(0, 0, 0, 0.1), 0 24px 56px rgba(0, 0, 0, 0.14);
  --shadow-primary-glow: 0 4px 12px var(--primary-glow);

  --badge-primary-text: #0050cc;
  --badge-primary-bg: rgba(0, 102, 255, 0.1);
  --badge-error-text: #b02030;
  --badge-error-bg: rgba(224, 48, 72, 0.1);
  --badge-warning-text: #92580a;
  --badge-warning-bg: rgba(217, 119, 6, 0.1);
}

.dark {
  /* ---- DARK ---- */
  --primary: #0066ff;
  --primary-glow: rgba(0, 102, 255, 0.12);
  --secondary: #0044cc;

  --bg: #090b0e;
  --card-bg: #0f1217;

  --text: #f3f5f8;
  --text-muted: #8e99a7;
  --text-dim: #556070;

  --success: #0066ff;
  --error: #ff4a5a;
  --warning: #ffb700;

  --glass-border: rgba(255, 255, 255, 0.08);
  --border-focus: rgba(0, 102, 255, 0.4);
  --surface: rgba(255, 255, 255, 0.03);
  --surface-light: rgba(255, 255, 255, 0.06);

  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-card-elevated: 0 10px 40px rgba(0, 0, 0, 0.1), 0 20px 50px rgba(0, 0, 0, 0.45);
  --shadow-modal: 0 10px 40px rgba(0, 0, 0, 0.1), 0 20px 50px rgba(0, 0, 0, 0.45);
  --shadow-primary-glow: 0 0 16px var(--primary-glow);

  --badge-primary-text: var(--primary);
  --badge-primary-bg: rgba(0, 102, 255, 0.12);
  --badge-error-text: var(--error);
  --badge-error-bg: rgba(255, 74, 90, 0.12);
  --badge-warning-text: var(--warning);
  --badge-warning-bg: rgba(255, 183, 0, 0.12);
}

body { background-color: var(--bg); color: var(--text); }

/* Ruído — opcional, aplicar .bg-noise no <body> se quiser a textura do original */
.bg-noise::before {
  content: "";
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.015'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 9999; opacity: 0.25;
}
.dark .bg-noise::before { opacity: 0.5; }
@media (max-width: 800px) { .bg-noise::before { display: none; } }
```

---

## 3. Tipografia

| Papel | Classes | Uso |
|---|---|---|
| Título de UI | `font-sans font-bold` | `h1`, `h2`, headers, botões, modais |
| Corpo / parágrafo | `font-inter font-normal` | Descrições, textos longos |
| Label de campo | `font-sans text-xs font-bold uppercase tracking-widest text-text-muted` | Labels de form, seções |
| **Dado numérico** | `font-mono font-bold` | Valores, IDs, moeda, métricas — **sempre**, sem exceção |

Escala de headings:
- `h1`: `text-3xl font-medium leading-tight` (hero/página centralizada) ou `text-2xl font-bold uppercase tracking-tight` (topbar)
- `h2`: `text-xl font-bold` (título de modal/card)
- `h3`: `text-lg font-semibold`

---

## 4. Layout

### 4.1 Page Shell + Topbar

```tsx
<div className="flex h-screen w-screen bg-bg text-text overflow-hidden">
  <Sidebar />
  <div className="flex-1 flex flex-col h-full overflow-hidden pl-[72px]">
    <header className="shrink-0 flex justify-between items-center px-8 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold uppercase tracking-tight text-text">Operações</h1>
        <p className="text-sm font-inter text-text-muted">Gerencie as operações ativas</p>
      </div>
      <div className="flex items-center gap-4">{/* ações */}</div>
    </header>
    <main className="flex-1 overflow-y-auto px-8 pb-8">{children}</main>
  </div>
</div>
```

### 4.2 Sidebar (colapsável, expande no clique)

```tsx
<aside className="fixed left-0 top-0 h-screen w-[72px] hover:w-[240px] group
  bg-card-bg border-r border-glass-border shadow-[2px_0_12px_rgba(0,0,0,0.06)] dark:shadow-none
  flex flex-col justify-between py-10 pb-8 z-[1000] overflow-hidden
  transition-all duration-300 ease-layout">

  <div className="flex flex-col gap-1">
    <button className="w-11 h-11 mx-auto mb-3 rounded-lg flex items-center justify-center
      text-text-muted hover:bg-surface-light hover:text-text transition-colors">
      <Menu size={20} />
    </button>
    <nav className="flex flex-col gap-1">
      <a href="/" className="relative mx-auto group-hover:mx-3.5 flex items-center h-11
        px-0 group-hover:px-2.5 rounded-lg text-primary bg-transparent dark:bg-transparent
        [.group:hover_&]:bg-primary/[0.06] transition-all">
        <Home size={20} className="shrink-0" />
        <span className="ml-4 text-sm font-medium opacity-0 group-hover:opacity-100
          whitespace-nowrap transition-opacity delay-100">Início</span>
        {/* indicador ativo */}
        <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r
          bg-primary" />
      </a>
    </nav>
  </div>

  <div className="flex flex-col border-t border-glass-border pt-6">
    {/* perfil / logout */}
  </div>
</aside>
```

> Nota: o original usa um botão de toggle controlado por estado (click), não `hover`. Se preferir fiel ao original, controle `expanded` via `useState` e aplique `w-[240px]` condicionalmente em vez de `group-hover`.

### 4.3 Sidebar Mobile (bottom nav — abaixo de 800px)

```tsx
<aside className="md:hidden fixed bottom-0 left-0 right-0 flex flex-row items-center
  justify-between px-4 py-2.5 pb-[calc(10px+env(safe-area-inset-bottom))]
  bg-card-bg border-t border-glass-border z-[1000]">
  <nav className="flex-1 flex justify-around">
    <a href="/" className="relative w-11 h-11 flex items-center justify-center text-primary">
      <Home size={20} />
      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-b bg-primary" />
    </a>
  </nav>
</aside>
```

---

## 5. Componentes

### 5.1 Card

```tsx
{/* Padrão */}
<div className="bg-card-bg border border-glass-border rounded-xl p-8 shadow-card flex flex-col">
  <h2 className="text-xs font-bold text-text-dim uppercase tracking-widest border-b border-glass-border pb-2 mb-4">
    Título da Seção
  </h2>
  {children}
</div>

{/* Centrado — telas de formulário único */}
<div className="w-full max-w-[580px] h-fit ...">...</div>

{/* Elevado — dark usa glass, light usa sombra profunda */}
<div className="bg-card-bg/75 dark:backdrop-blur-2xl dark:saturate-150 shadow-card-elevated
  border border-glass-border rounded-xl p-8">
  ...
</div>
```

> A única exceção justificada à regra "sem `dark:`" é o `backdrop-blur`, porque glassmorphism só existe no dark (no light ele é substituído por sombra, conforme o design original). Fora isso, não usar `dark:`.

### 5.2 Botões

```tsx
{/* Primário — outline → fill no hover */}
<button className="border border-primary text-primary bg-transparent font-bold uppercase
  tracking-wide text-sm px-5 py-3 rounded-lg transition-all duration-200 ease-ui
  hover:bg-primary hover:text-white hover:shadow-primary-glow active:scale-[0.98]">
  Confirmar
</button>

{/* Sólido — ações de prioridade máxima (login, exclusão definitiva) */}
<button className="bg-primary text-white font-bold uppercase tracking-wide text-sm
  px-5 py-3 rounded-lg shadow-primary-glow transition-all hover:brightness-110
  hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0">
  Entrar
</button>

{/* Ghost — baixa prioridade */}
<button className="bg-surface-light border border-glass-border text-text font-bold
  px-5 py-3 rounded-lg transition-all hover:bg-surface-light/80 hover:border-glass-border">
  Cancelar
</button>

{/* Destrutivo */}
<button className="border border-error text-error font-bold px-5 py-3 rounded-lg
  transition-all hover:bg-error hover:text-white">
  Excluir
</button>

{/* Ícone isolado */}
<button className="w-10 h-10 rounded-lg bg-surface border border-glass-border
  text-text-muted flex items-center justify-center transition-all
  hover:bg-primary hover:border-primary hover:text-white hover:-translate-y-0.5">
  <Plus size={18} />
</button>

{/* Adicionar — borda tracejada */}
<button className="w-full p-3 border border-dashed border-glass-border rounded-lg
  text-text-muted text-sm font-bold flex items-center justify-center gap-2
  transition-all hover:border-primary hover:text-primary">
  <Plus size={16} /> Adicionar item
</button>
```

### 5.3 Formulários

```tsx
<div className="flex flex-col gap-2">
  <label className="text-xs font-bold uppercase tracking-widest text-text-muted">
    Nome do Cliente
  </label>
  <input
    type="text"
    placeholder="Ex: Coca-Cola"
    className="h-11 w-full bg-surface border border-glass-border rounded-lg px-4
      text-sm text-text placeholder:text-text-dim placeholder:font-normal
      focus:border-primary focus:ring-1 focus:ring-primary/40 outline-none transition-all"
  />
</div>

{/* Input com ícone prefixado */}
<div className="relative flex items-center">
  <Search size={16} className="absolute left-4 text-text-muted peer-focus:text-primary" />
  <input className="h-11 w-full bg-surface border border-glass-border rounded-lg
    pl-11 pr-4 text-sm text-text focus:border-primary focus:ring-1 focus:ring-primary/40
    outline-none transition-all peer" />
</div>
```

### 5.4 Métricas / Dados

```tsx
<div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
  <div className="bg-surface border border-glass-border rounded-lg p-4 flex flex-col gap-1.5
    transition-all hover:bg-surface-light hover:-translate-y-0.5">
    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Receita</span>
    <span className="font-mono text-xl font-bold text-text tracking-tight">R$ 24.500</span>
  </div>
</div>

{/* Valor hero — glow no dark, cor sólida no light */}
<span className="font-mono font-bold text-4xl text-text dark:[text-shadow:0_0_20px_var(--primary-glow)]">
  R$ 128.900
</span>

{/* Variantes de cor */}
<span className="font-mono font-bold text-success">+12%</span>
<span className="font-mono font-bold text-error">-4%</span>
```

### 5.5 Badges

```tsx
<span className="bg-badge-primary-bg text-badge-primary-text border border-primary/20
  text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
  Aprovado
</span>
<span className="bg-badge-error-bg text-badge-error-text border border-error/20
  text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
  Rejeitado
</span>
<span className="bg-badge-warning-bg text-badge-warning-text border border-warning/20
  text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
  Pendente
</span>
<span className="border border-glass-border text-text-dim text-[10px] font-bold
  uppercase tracking-widest px-2.5 py-1 rounded-full">
  Neutro
</span>

{/* Tag de valor numérico — sempre font-mono */}
<span className="font-mono font-bold text-sm bg-badge-primary-bg text-badge-primary-text
  border border-primary/20 px-2.5 py-1 rounded-md">+R$ 320,00</span>
```

### 5.6 Info Box

```tsx
<div className="bg-surface border border-glass-border rounded-lg p-4 flex flex-col gap-1
  transition-all hover:bg-surface-light hover:border-glass-border hover:-translate-y-0.5">
  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">CNPJ</span>
  <span className="font-mono text-lg font-bold text-text">12.345.678/0001-99</span>
</div>
```

### 5.7 Callout

```tsx
<div className="pl-5 pr-5 py-4 bg-black/[0.015] dark:bg-white/[0.015] border-l-[3px]
  border-primary rounded-r-lg border-y border-r border-glass-border">
  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Observação</p>
  <p className="text-sm text-text-muted leading-relaxed font-inter">
    Este cliente possui pendências financeiras em aberto.
  </p>
</div>
{/* variantes: border-warning / border-error / border-success(=primary) */}
```

### 5.8 Banners de Feedback

```tsx
<div className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-inter
  bg-error/10 border border-error/20 text-error animate-fadeIn">
  <AlertCircle size={16} /> Erro ao salvar as alterações.
</div>
<div className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-inter
  bg-primary/10 border border-primary/20 text-primary animate-fadeIn">
  <CheckCircle size={16} /> Operação concluída com sucesso.
</div>
<div className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-inter
  bg-warning/10 border border-warning/20 text-warning animate-fadeIn">
  <AlertTriangle size={16} /> Verifique os dados antes de continuar.
</div>
```

### 5.9 Modal

```tsx
<div className="fixed inset-0 bg-black/40 dark:bg-black/55 backdrop-blur-md flex
  items-center justify-center p-5 z-[1000] animate-fadeIn">
  <div className="w-full max-w-[480px] max-h-[calc(100vh-40px)] overflow-y-auto
    bg-card-bg dark:bg-card-bg/75 dark:backdrop-blur-2xl dark:saturate-150
    border border-glass-border rounded-2xl p-8 shadow-modal
    animate-modalIn relative">

    <button className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface-light
      border border-glass-border text-text-muted flex items-center justify-center
      transition-all duration-200 ease-ui hover:bg-error/10 hover:text-error
      hover:border-error/25 hover:rotate-90">
      <X size={16} />
    </button>

    <div className="mb-6">
      <h2 className="text-xl font-bold text-text flex items-center gap-3">Título do Modal</h2>
    </div>

    {children}
  </div>
</div>
```

Fullscreen no mobile (≤600px): trocar `max-w-[480px]` → `max-w-full`, `rounded-2xl` → `rounded-none`, `p-8` → `pt-16 px-4 pb-6`, remover `backdrop-blur`/`shadow-modal`, usar `h-dvh bg-bg`.

### 5.10 Auth / Login

```tsx
<div className="min-h-screen w-full flex items-center justify-center p-5 bg-bg">
  <div className="w-full max-w-[420px] bg-card-bg border border-glass-border rounded-2xl
    p-10 shadow-card-elevated animate-modalIn">

    <div className="text-center mb-10">
      <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center
        mx-auto mb-5 text-white shadow-primary-glow">
        <Lock size={28} />
      </div>
      <h1 className="text-3xl font-medium text-text mb-2">Bem-vindo</h1>
      <p className="text-sm text-text-muted font-inter">Entre com suas credenciais</p>
    </div>

    <form className="flex flex-col gap-5">
      {/* inputs padrão da seção 5.3 */}
      <button className="h-14 bg-primary text-white font-bold uppercase tracking-wide
        rounded-lg shadow-primary-glow flex items-center justify-center gap-3 mt-2
        transition-all hover:brightness-110 hover:-translate-y-0.5
        disabled:opacity-60 disabled:cursor-not-allowed">
        Entrar
      </button>
    </form>

    <div className="text-center mt-8">
      <button className="text-sm text-text-muted hover:text-primary hover:underline transition-colors">
        Esqueci minha senha
      </button>
    </div>
  </div>
</div>
```

---

## 6. Animações

Já registradas no `tailwind.config.js` (seção 1): `animate-fadeIn`, `animate-modalIn`.
Timing functions: `ease-bounce` (entrada com impacto — modais, auth), `ease-layout` (sidebar, transições estruturais), `ease-ui` (hover/foco rápido, padrão para a maioria das interações).

---

## 7. Responsivo

Breakpoint principal: `800px` → usar `md:` do Tailwind (default 768px, ajustar config se quiser exato 800px) para trocar sidebar lateral por bottom nav.
Breakpoint de modal fullscreen: `600px` → usar `sm:` customizado se necessário.

Regras:
- Sidebar: lateral no desktop, bottom nav no mobile (ver 4.3). Toggle e labels desaparecem no mobile.
- Card: mantém `rounded-xl` e sombra leve no mobile (light) — no dark original perdia borda/radius, mas manter consistência é aceitável já que sombra/radius sutis não pesam performance.
- Textura de ruído (`.bg-noise`) e `backdrop-blur` pesados: remover em telas `max-width: 800px` (já no CSS global da seção 2).
- `metrics-grid`: `grid-cols-2` no mobile.

---

## 8. Checklist antes de considerar um componente pronto

- [ ] Nenhuma classe `dark:` usada (exceto glassmorphism/blur, que é a única exceção documentada)
- [ ] Nenhuma cor hardcoded (`#`, `bg-gray-*`, `bg-white`, `text-black`)
- [ ] Números/valores estão em `font-mono`
- [ ] Botão de ação principal é outline, preenche só no hover (a menos que seja login/ação crítica)
- [ ] Toda superfície interativa tem `transition-all` + estado de hover
- [ ] Bordas usam `border-glass-border`, nunca cor de borda literal
- [ ] Componente testado visualmente nos dois temas (`.dark` on/off)
