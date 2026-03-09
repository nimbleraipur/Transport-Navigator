/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
      },
      colors: {
        primary: {
          DEFAULT: '#1B6EF3',
          dark: '#0D4EBF',
          light: '#E8F0FE',
          glow: 'rgba(27, 110, 243, 0.25)',
        },
        accent: {
          DEFAULT: '#00C9A7',
          dark: '#00A88A',
          glow: 'rgba(0, 201, 167, 0.2)',
        },
        navy: {
          dark: '#0A1628',
          mid: '#1C2B4A',
          DEFAULT: '#132743',
        },
        background: '#F5F7FA',
        surface: '#FFFFFF',
        text: {
          DEFAULT: '#1A1D26',
          secondary: '#6B7280',
          tertiary: '#9CA3AF',
        },
        admin: {
          bg: '#0A1628',
          surface: '#0F1D32',
          surface2: '#152238',
          text: '#ffffff',
          text2: 'rgba(255, 255, 255, 0.7)',
          text3: 'rgba(255, 255, 255, 0.45)',
          border: 'rgba(255, 255, 255, 0.06)',
          border2: 'rgba(255, 255, 255, 0.1)',
          primary: '#1B6EF3',
          teal: '#00C9A7',
          green: '#22c55e',
          yellow: '#f59e0b',
          red: '#ef4444',
          purple: '#8b5cf6',
          blue: '#3b82f6',
        },
        success: '#10B981',
        danger: '#EF4444',
      }
    },
  },
  plugins: [],
}
