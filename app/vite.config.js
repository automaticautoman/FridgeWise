import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const root = fileURLToPath(new URL('.', import.meta.url));

// Runs the Vercel functions in api/ inside the Vite dev server, so
// `npm run dev` works without the Vercel CLI. On Vercel, the same files
// are deployed as serverless functions.
function localApi() {
  return {
    name: 'fridgewise-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();
        const route = url.pathname.replace(/\/$/, '');
        if (!/^\/api\/[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(route) || route.includes('/_')) return next();
        if (!existsSync(root + route.slice(1) + '.js')) return next();

        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf8');
        try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
        req.query = Object.fromEntries(url.searchParams);
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); return res; };
        try {
          const mod = await server.ssrLoadModule(route + '.js');
          await mod.default(req, res);
        } catch (err) {
          console.error(err);
          if (!res.headersSent) res.status(500).json({ error: 'server-error' });
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // Make .env, .env.local and .env.[mode] values (including non-VITE_ server
  // ones like SMTP_*) visible to the local API. Only VITE_* reach the browser.
  const env = loadEnv(mode, root, '');
  for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v;

  return {
    plugins: [
      react(),
      localApi(),
      // The service worker caches the app shell so a signed-in user can open
      // FridgeWise with no connection (F02: session persists, including offline).
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'FridgeWise',
          short_name: 'FridgeWise',
          description: 'Track what is in your shared kitchen and use it before it expires.',
          theme_color: '#FF7F79',
          background_color: '#FFF9F0',
          display: 'standalone',
          start_url: '/',
          icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
        },
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
        }
      })
    ],
    server: { port: 5173 },
    // Only for runs without the Firestore emulator (no Java), and the automated
    // end-to-end test. Never set in production.
    resolve: process.env.E2E_FAKE_FIRESTORE === 'true'
      ? { alias: { 'firebase/firestore': fileURLToPath(new URL('./tests/e2e/fake-firestore.js', import.meta.url)) } }
      : {}
  };
});
