module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#0A0A0A',
        action: '#1A56FF',
        success: '#00C896',
        warning: '#F59E0B',
        danger: '#EF4444',
        surface: '#FFFFFF',
        border: '#EBEBEB',
        muted: '#8A8A8A',
      },
    },
  },
  plugins: [],
};
