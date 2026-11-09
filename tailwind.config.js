// Campus Green design tokens (light only). Colours come from the CSS variables in global.css;
// lib/theme.ts has the same values as hex for code that needs raw colours.
// No animation plugin, no shadows: see docs/redesign.md.
const color = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: color('bg'),
        surface: color('surface'),
        border: color('border'),
        text: color('text'),
        muted: color('muted'),
        primary: {
          DEFAULT: color('primary'),
          hover: color('primary-hover'),
          soft: color('primary-soft'),
        },
        present: color('present'),
        absent: {
          DEFAULT: color('absent'),
          soft: color('absent-soft'),
        },
        warn: {
          DEFAULT: color('warn'),
          ink: color('warn-ink'),
          soft: color('warn-soft'),
          border: color('warn-border'),
        },
        info: {
          DEFAULT: color('info'),
          soft: color('info-soft'),
        },
        track: color('track'),
      },
      // Text sizes are set by the Text component (components/ui/Text.tsx); these match it.
      fontSize: {
        caption: ['12px', '16px'],
        small: ['13px', '18px'],
        body: ['15px', '22px'],
        section: ['17px', '24px'],
        'title-phone': ['20px', '26px'],
        title: ['26px', '32px'],
        code: ['40px', '48px'],
      },
      // No font family / weight classes here: Public Sans needs one family name per weight on
      // Android, so the Text component picks the font (use its `weight` prop).
      borderRadius: {
        control: '8px',
        card: '10px',
        'card-phone': '12px',
        pill: '999px',
      },
      maxWidth: {
        page: '1200px',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
};
