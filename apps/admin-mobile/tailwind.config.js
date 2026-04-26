/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Mirror tokens from web admin so design system stays cohesive.
        primary: '#0a0a0a',
        background: '#ffffff',
        foreground: '#0a0a0a',
        muted: '#737373',
        border: '#e5e5e5',
        success: '#16a34a',
        danger: '#dc2626',
        warning: '#ea580c',
      },
    },
  },
  plugins: [],
};
