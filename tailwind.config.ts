import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
      },
    },
    colors: {
      "waambat-pink": "#ff0080", // a bright pink you can tweak
    },
  },
  plugins: [],
} satisfies Config;
