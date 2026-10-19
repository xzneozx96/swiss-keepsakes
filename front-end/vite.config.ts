import { defineConfig } from "vite";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
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
    // React Compiler: memoizes every component and hook at build time, so no hand-written
    // memo is needed. The react-hooks lint rules keep the code compilable.
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
});
