/** @type {import('tailwindcss').Config} */
export default {
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
