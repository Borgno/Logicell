import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    reactRouter(),
    tsconfigPaths(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Divide as bibliotecas pesadas em chunks separados
        // O browser faz cache delas independentemente do código da aplicação
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router"],
          "vendor-charts": ["recharts"],
          "vendor-grid": ["react-data-grid"],
          "vendor-icons": ["lucide-react"],
          "vendor-auth": ["@supabase/supabase-js", "@supabase/ssr"],
        }
      }
    }
  }
});
