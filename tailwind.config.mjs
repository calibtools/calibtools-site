/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
          text: 'rgb(var(--color-brand-text) / <alpha-value>)',
          dark: 'rgb(var(--color-brand-dark) / <alpha-value>)',
          tint: 'var(--color-brand-tint)',
        },
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          muted: 'rgb(var(--color-ink-muted) / <alpha-value>)',
          soft: 'rgb(var(--color-ink-soft) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--color-line) / <alpha-value>)',
          strong: 'rgb(var(--color-line-strong) / <alpha-value>)',
          soft: 'rgb(var(--color-line-soft) / <alpha-value>)',
        },
        ground: {
          DEFAULT: 'rgb(var(--color-ground) / <alpha-value>)',
          alt: 'rgb(var(--color-ground-alt) / <alpha-value>)',
          panel: 'rgb(var(--color-ground-panel) / <alpha-value>)',
        },
        collection: {
          brand: '#E60012',
          'slate-blue': '#475C8A',
          amber: '#D97706',
          grey: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Geist Fallback', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        pixel: ['Geist Pixel', 'Geist Mono', 'monospace'],
      },
      borderRadius: { DEFAULT: '6px', lg: '10px', xl: '12px' },
    },
  },
  plugins: [],
};
