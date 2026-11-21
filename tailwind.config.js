const color = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
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
      fontSize: {
        caption: ['12px', '16px'],
        small: ['13px', '18px'],
        body: ['15px', '22px'],
        section: ['17px', '24px'],
        'title-phone': ['20px', '26px'],
        title: ['26px', '32px'],
        code: ['40px', '48px'],
      },
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
