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
        ink: "#102033",
        cloud: "#f6f9fc",
        mist: "#dfe8f0",
        signal: "#0f9f8f",
        skywise: "#1d9bf0",
        sunbeam: "#f7b731",
        amberline: "#d97706",
        berry: "#be123c",
        violetline: "#6d5dfc",
      },
      boxShadow: {
        panel: "0 22px 60px rgba(16, 32, 51, 0.12)",
        lift: "0 16px 36px rgba(16, 32, 51, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
