/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crm: {
          bg: '#020617',
          surface: '#0F172A',
          card: '#1E293B',
          cardHover: '#273549',
          border: '#334155',
          borderSubtle: '#1E293B',
          textMuted: '#94A3B8',
          textPrimary: '#F8FAFC',
          primary: '#2563EB',
          primaryHover: '#1D4ED8',
          accent: '#06B6D4',
          accentHover: '#0891B2',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444'
        }
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif']
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-primary': '0 0 20px -5px rgba(37, 99, 235, 0.4)',
        'glow-accent': '0 0 20px -5px rgba(6, 182, 212, 0.4)'
      }
    },
  },
  plugins: [],
}
