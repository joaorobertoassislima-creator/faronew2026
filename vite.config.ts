import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Permite usar variaveis com prefixo VITE_ ou SUPABASE_ no arquivo .env
  envPrefix: ["VITE_", "SUPABASE_"],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
