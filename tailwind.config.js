/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        court: {
          bg:     "#09070f",
          panel:  "#131020",
          panel2: "#1c1830",
          gold:   "#c9a227",
          danger: "#dc3535",
          mid:    "#f0a500",
          low:    "#3dab42",
          muted:  "#6b6882",
        },
      },
      fontFamily: {
        serif: ['"Shippori Mincho"', "serif"],
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-8px)" },
          "40%, 80%": { transform: "translateX(8px)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        shake: "shake 0.4s ease-in-out",
        flicker: "flicker 1.2s infinite",
      },
    },
  },
  plugins: [],
};
