import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "url"

export default defineConfig({
  plugins: [
    {
      name: "stock-app:config",
      config() {
        return {
          resolve: {
            alias: {
              "@": fileURLToPath(new URL("./src", import.meta.url)),
            },
          },
        }
      },
    },
    tailwindcss(),
    solidPlugin(),
  ],
  server: {
    host: "0.0.0.0",
    port: 4097,
  },
  build: {
    target: "esnext",
  },
})
