/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
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
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        inter: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'primary-glow': '0 0 16px var(--primary-glow)',
        'card': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'card-light': '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-elevated': '0 4px 16px rgba(0, 0, 0, 0.08), 0 12px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        'modal-light': '0 8px 24px rgba(0, 0, 0, 0.1), 0 24px 56px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 1)',
        'modal-dark': '0 10px 40px rgba(0, 0, 0, 0.1), 0 20px 50px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
