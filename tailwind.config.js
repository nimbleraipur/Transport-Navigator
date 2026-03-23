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
          DEFAULT: '#000000',
          dark: '#000000',
          light: '#F3F4F6',
          glow: 'rgba(0, 0, 0, 0.05)',
        },
        accent: {
          DEFAULT: '#000000',
          dark: '#000000',
          glow: 'rgba(0, 0, 0, 0.03)',
        },
        navy: {
          dark: '#000000',
          mid: '#333333',
          DEFAULT: '#000000',
        },
        background: '#FFFFFF',
        surface: '#FFFFFF',
        text: {
          DEFAULT: '#000000',
          secondary: '#666666',
          tertiary: '#999999',
        },
        admin: {
          bg: '#000000',
          surface: '#111111',
          surface2: '#1a1a1a',
          text: '#ffffff',
          text2: 'rgba(255, 255, 255, 0.7)',
          text3: 'rgba(255, 255, 255, 0.45)',
          border: 'rgba(255, 255, 255, 0.1)',
          border2: 'rgba(255, 255, 255, 0.2)',
          primary: '#ffffff',
          teal: '#ffffff',
          green: '#ffffff',
          yellow: '#ffffff',
          red: '#ffffff',
          purple: '#ffffff',
          blue: '#ffffff',
        },
        success: '#000000',
        danger: '#000000',
      }
    },
  },
  plugins: [],
}
