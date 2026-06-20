/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        court: {
          bg: "#0d0b14", // 法廷の闇
          panel: "#1a1626",
          gold: "#d4af37", // 木槌・判決の金
          danger: "#e23636", // 重刑の赤
          mid: "#f5b301", // 中刑の黄
          low: "#4caf50", // 軽刑の緑
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
