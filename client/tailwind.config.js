export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        murekkep: "#1C2420",
        zemin: "#F3F4F1",
        cizgi: "#D9DCD4",
        zeytin: "#3F5A2A",
        sizma: "#A9791C",
        para: "#A23B2A",
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        sans: ['"Source Sans 3"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
}
