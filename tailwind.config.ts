import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2721",
        palm: "#2d5a4a",
        sage: "#7f9786",
        mist: "#f5f6f2",
        paper: "#fffdf7",
        line: "#e4e5da",
      },
      boxShadow: {
        soft: "0 18px 40px rgba(31, 39, 33, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
