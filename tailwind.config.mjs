/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#E60012', dark: '#B3000E', tint: '#FBE9EA' },
        ink: { DEFAULT: '#1A1A1A', muted: '#4A4A4A', soft: '#6B6B6B' },
        line: { DEFAULT: '#E6E6E6', light: '#ECECEC' },
        ground: { DEFAULT: '#FFFFFF', alt: '#FAFAFA', panel: '#F5F5F5' },
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
