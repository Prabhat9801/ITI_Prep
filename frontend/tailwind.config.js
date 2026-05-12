/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          hover: 'var(--secondary-hover)',
        },
        background: 'var(--background)',
        surface: {
          DEFAULT: 'var(--surface)',
          light: 'var(--surface-light)',
        },
        text: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
        },
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        border: 'var(--border)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
