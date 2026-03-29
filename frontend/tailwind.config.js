/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      colors: {
        neon: {
          cyan: "#00e7ff",
          purple: "#9b5cff",
          green: "#1dff8c",
          red: "#ff4d7e",
        },
      },
      boxShadow: {
        neon: "0 0 20px rgba(0, 231, 255, 0.45)",
        card: "0 16px 40px rgba(2, 8, 23, 0.45)",
      },
      backgroundImage: {
        "app-gradient": "radial-gradient(circle at 15% 20%, rgba(0, 231, 255, 0.25), transparent 28%), radial-gradient(circle at 80% 5%, rgba(155, 92, 255, 0.35), transparent 25%), linear-gradient(135deg, #050817 0%, #0c1240 45%, #280b45 100%)",
      },
    },
  },
  plugins: [],
};
