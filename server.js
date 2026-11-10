// Production server for nms.fyi.
// Infomaniak's Node.js hosting runs `npm start`, which serves the Vite build in dist/.
// Build first with `npm run build`. The port comes from $PORT (falls back to 3000).
import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, 'dist');
const app = express();

app.disable('x-powered-by');

// Hashed build assets never change, so cache them hard. HTML must always revalidate.
app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }));
app.use(express.static(dist, {
  maxAge: '1h',
  index: 'index.html',
  // The page itself must never be served stale after a deploy (it names the new hashed assets).
  setHeaders: (res, file) => { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); },
}));

app.get('/healthz', (_req, res) => res.type('text').send('ok'));

// Single-page app: unknown paths fall back to index.html.
app.use((req, res) => {
  if (req.method !== 'GET') return res.status(404).end();
  res.sendFile(path.join(dist, 'index.html'));
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`nms.fyi listening on :${port}`));
