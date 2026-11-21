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
        sidebar: {
          bg: color('sidebar-bg'),
          border: color('sidebar-border'),
          text: color('sidebar-text'),
          muted: color('sidebar-muted'),
          'btn-hover': color('sidebar-btn-hover'),
          'btn-active-bg': color('sidebar-btn-active-bg'),
          'btn-active-text': color('sidebar-btn-active-text'),
        },
        btn: {
          'primary-bg': color('btn-primary-bg'),
          'primary-hover': color('btn-primary-hover'),
          'primary-text': color('btn-primary-text'),
          'secondary-bg': color('btn-secondary-bg'),
          'secondary-border': color('btn-secondary-border'),
          'secondary-hover': color('btn-secondary-hover'),
          'secondary-text': color('btn-secondary-text'),
          'quiet-hover': color('btn-quiet-hover'),
          'quiet-text': color('btn-quiet-text'),
          'danger-bg': color('btn-danger-bg'),
          'danger-text': color('btn-danger-text'),
        },
        card: {
          bg: color('card-bg'),
          border: color('card-border'),
        },
        font: {
          main: color('font-main'),
          muted: color('font-muted'),
          accent: color('font-accent'),
        },
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
