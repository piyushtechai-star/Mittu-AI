// Production server: serves the built app (dist/) plus the /api routes.
//   npm run build && npm start
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApiMiddleware } from './api.js'

try {
  process.loadEnvFile?.()
} catch {
  /* no .env file — fine */
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const api = createApiMiddleware(process.env)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

http
  .createServer((req, res) => {
    api(req, res, () => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      let file = path.join(root, urlPath)
      if (!file.startsWith(root)) {
        res.statusCode = 403
        return res.end()
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html')
      res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream')
      if (urlPath.startsWith('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      fs.createReadStream(file).pipe(res)
    })
  })
  .listen(process.env.PORT || 4173, () => console.log(`Mittu AI on http://localhost:${process.env.PORT || 4173}`))
