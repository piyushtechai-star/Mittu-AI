import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createApiMiddleware } from './server/api.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const mittuApi = {
    name: 'mittu-api',
    configureServer(server) {
      server.middlewares.use(createApiMiddleware(env))
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApiMiddleware(env))
    },
  }
  return {
    plugins: [react(), tailwindcss(), mittuApi],
    server: { host: true },
  }
})
