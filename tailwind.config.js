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
        primary: '#08090A',
        ink2: '#2A2D31',
        ink3: '#5C6068',
        action: '#2E5BFF',
        success: '#0E8E63',
        warning: '#B8740F',
        danger: '#C2362F',
        surface: '#FFFFFF',
        border: '#E4E6EA',
        borderSoft: '#EFF1F4',
        muted: '#9097A0',
        fill: '#F5F6F8',
        fill2: '#ECEEF1',
        canvas: '#F2F0EB',
        actionSoft: '#EAF0FF',
        successSoft: '#E1F4EC',
        warningSoft: '#FBEDD3',
        dangerSoft: '#FBE2E0',
      },
    },
  },
  plugins: [],
};
