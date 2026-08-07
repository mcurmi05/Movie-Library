import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Cloudflare refuses the Letterboxd scrapes from a laptop IP (the deploy's IPs
// get through), so when one of those endpoints fails here the deploy answers
// instead. Dev only - the deployed functions never load this file.
const FALLBACK_ORIGIN =
  process.env.DEV_API_FALLBACK_ORIGIN || 'https://media-library-mcurmi05.vercel.app'

// Dev-only middleware that mounts the /api/* serverless functions so
// `npm run dev` behaves like the Vercel deploy. Routes /api/<name> to
// the default export of /api/<name>.js.
const devApi = () => ({
  name: 'dev-api',
  configureServer(server) {
    server.middlewares.use('/api', async (req, res, next) => {
      const fullUrl = new URL(req.url, 'http://localhost')
      const name = fullUrl.pathname.replace(/^\/+/, '').split('/')[0]
      if (!name) return next()

      // Buffered rather than written straight out, so a failure can still be
      // swapped for the deploy's answer below.
      let status = 200
      const headers = { 'Content-Type': 'application/json' }
      let payload = ''
      try {
        const { default: handler } = await server.ssrLoadModule(`/api/${name}.ts`)
        req.query = Object.fromEntries(fullUrl.searchParams)
        const proxy = {
          status(code) { status = code; return this },
          setHeader(k, v) { headers[k] = v; return this },
          json(body) { payload = JSON.stringify(body) },
        }
        // Node-style handlers write through `proxy`; edge ones return a
        // Response instead, so pipe that back out.
        const result = await handler(req, proxy)
        if (result instanceof Response) {
          status = result.status
          result.headers.forEach((v, k) => { headers[k] = v })
          payload = await result.text()
        }
      } catch (err) {
        status = 500
        payload = JSON.stringify({ error: 'Dev API error', details: err?.message })
      }

      if (status >= 400 && name.startsWith('letterboxd')) {
        try {
          const proxied = await fetch(`${FALLBACK_ORIGIN}/api${req.url}`)
          status = proxied.status
          payload = await proxied.text()
          headers['Content-Type'] = 'application/json'
        } catch {
          // Offline: keep the local failure.
        }
      }

      res.statusCode = status
      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
      res.end(payload)
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Mirror Vercel: expose non-VITE_ env vars (e.g. IMDB_API_KEY) to the
  // dev API handlers through process.env. They are never bundled into the
  // client; only VITE_-prefixed vars are.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) {
    if (!(k in process.env)) process.env[k] = v
  }

  return {
    plugins: [react(), tailwindcss(), devApi()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Bind to all interfaces so the dev server is reachable from other
    // devices on the LAN (e.g. testing on a phone at http://<your-ip>:5173).
    server: {
      host: true,
    },
    optimizeDeps: {
      exclude: ['chunk-3HWLUFA5', 'chunk-JSO3YDVX'],
    },
  }
})
