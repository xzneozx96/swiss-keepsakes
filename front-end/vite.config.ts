import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  // Relative asset paths so the static build runs from any folder or host.
  base: "./",
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    // TanStack Router's plugin must come before @vitejs/plugin-react.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
});
