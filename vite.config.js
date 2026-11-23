/* Apex Dash · configuração do Vite
 *   npm run dev       desenvolve com recarga automática, em http://localhost:5173 e na rede (para o celular)
 *   npm run preview   gera a versão final (dist/) e a serve em http://localhost:4173, como ficará na Vercel
 * O backend (/api/sala) roda dentro do próprio Vite, pelo plugin abaixo.
 */
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { apiMiddleware } from "./lib/api-middleware.js";

function apexApi() {
  return {
    name: "apex-dash-api",
    // middlewares registrados aqui rodam antes dos do Vite, então /api/* nunca cai no index.html
    configureServer(server) { server.middlewares.use(apiMiddleware()); },
    configurePreviewServer(server) { server.middlewares.use(apiMiddleware()); }
  };
}

export default defineConfig(({ mode }) => {
  // .env.local (opcional) pode trazer o Redis da Upstash para testar igual à Vercel
  const env = loadEnv(mode, process.cwd(), "");
  for (const k of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"])
    if (env[k] && !process.env[k]) process.env[k] = env[k];

  return {
    plugins: [apexApi()],
    server: { host: true, port: 5173 },   // host: true → o celular no mesmo Wi-Fi consegue abrir
    preview: { host: true, port: 4173 },
    build: {
      rollupOptions: {
        input: {
          painel: fileURLToPath(new URL("./index.html", import.meta.url)),
          controle: fileURLToPath(new URL("./controle.html", import.meta.url))
        }
      }
    }
  };
});
