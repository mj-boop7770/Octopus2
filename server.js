// Serveur local léger sans dépendance, compatible avec les handlers API du déploiement Vercel.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ico': 'image/x-icon'
};

function makeResponse(res) {
  return {
    setHeader: (...args) => { res.setHeader(...args); return this; },
    status(code) { res.statusCode = code; return this; },
    json(value) { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); return this; },
    send(value) { res.end(value); return this; },
    end() { res.end(); return this; }
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/chat' || url.pathname === '/api/music') {
    const handler = require(path.join(ROOT, url.pathname === '/api/chat' ? 'api/chat.js' : 'api/music.js'));
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      let rawBody = '';
      for await (const chunk of req) {
        rawBody += chunk;
        if (rawBody.length > 10 * 1024 * 1024) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Requête trop volumineuse.' }));
        }
      }
      try { req.body = rawBody ? JSON.parse(rawBody) : {}; }
      catch (_) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'JSON invalide.' })); }
    }
    return handler(req, makeResponse(res));
  }

  let requestedPath;
  try { requestedPath = decodeURIComponent(url.pathname); }
  catch (_) { res.writeHead(400); return res.end('Bad Request'); }
  const relativePath = requestedPath === '/' ? 'index.html' : requestedPath.replace(/^\/+/, '');
  const filePath = path.resolve(PUBLIC, relativePath);
  if (!filePath.startsWith(`${PUBLIC}${path.sep}`) && filePath !== path.join(PUBLIC, 'index.html')) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(filePath, (error, contents) => {
    if (error) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(contents);
  });
});

server.listen(PORT, () => console.log(`Octopus2 disponible sur http://localhost:${PORT}`));
