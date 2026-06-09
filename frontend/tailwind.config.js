/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: theme('colors.gray.800'),
            a: { color: theme('colors.indigo.600') },
            'h1,h2,h3,h4': { fontWeight: '700' },
          },
        },
        dark: {
          css: {
            color: theme('colors.gray.200'),
            a: { color: theme('colors.indigo.400') },
            'h1,h2,h3,h4': { color: theme('colors.white') },
            blockquote: { color: theme('colors.gray.300') },
            code: { color: theme('colors.pink.400') },
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
