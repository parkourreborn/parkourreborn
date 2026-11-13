import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  darkMode: 'selector',
  theme: {
    extend: {
      borderRadius: {
        sm: 'var(--radius)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius)',
        lg: 'var(--radius)',
        xl: 'var(--radius)',
        '2xl': 'var(--radius)',
        '3xl': 'var(--radius)',
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: 'var(--destructive)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        hub: {
          bg: 'var(--hub-bg)',
          panel: 'var(--hub-panel)',
          soft: 'var(--hub-panel-soft)',
          line: 'var(--hub-line)',
          accent: 'var(--hub-blue)',
          text: 'var(--hub-text)',
          muted: 'var(--hub-muted)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
