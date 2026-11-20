/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");

// One calm accent ("blue" is remapped to a muted navy) and warm neutrals
// ("gray" is remapped to stone). Purple/indigo/pink map to the accent too, so
// the UI can't drift into rainbow gradients again.
const accent = {
  50: "#eef3f8",
  100: "#d9e4ef",
  200: "#b4c8dd",
  300: "#87a6c6",
  400: "#5b84ad",
  500: "#3d6994",
  600: "#2c5480",
  700: "#234469",
  800: "#1c3654",
  900: "#152841",
  950: "#0d1a2b",
};

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gray: colors.stone,
        blue: accent,
        indigo: accent,
        purple: accent,
        violet: accent,
        sky: accent,
        cyan: accent,
        pink: accent,
        green: colors.emerald,
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
