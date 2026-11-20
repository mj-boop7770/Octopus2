// server.js
// Serveur HTTP local CommonJS pour Octopus2

const http = require('http');
const fs = require('fs');
const path = require('path');

const chatHandler = require('./api/chat.js');
const musicHandler = require('./api/music.js');

const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav'
};

function makeResponseAdapter(nodeResponse) {
  return {
    setHeader: (name, value) => nodeResponse.setHeader(name, value),
    status(code) {
      nodeResponse.statusCode = code;
      return this;
    },
    json(payload) {
      nodeResponse.setHeader('Content-Type', 'application/json; charset=utf-8');
      nodeResponse.end(JSON.stringify(payload));
    },
    send(payload) {
      nodeResponse.end(payload);
    },
    end(payload) {
      nodeResponse.end(payload);
    }
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Corps de requête trop volumineux'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('JSON invalide'));
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/api/chat' || req.url.startsWith('/api/chat?')) {
      req.body = await readJson(req);
      req.headers = req.headers;
      req.method = req.method;
      return await chatHandler(req, makeResponseAdapter(res));
    }

    if (req.url === '/api/music' || req.url.startsWith('/api/music?')) {
      req.body = await readJson(req);
      return await musicHandler(req, makeResponseAdapter(res));
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      return res.writeHead(400).end('URL invalide');
    }

    if (pathname === '/') pathname = '/index.html';
    const publicRoot = path.resolve(__dirname, 'public');
    const filePath = path.resolve(publicRoot, `.${pathname}`);

    if (filePath !== publicRoot && !filePath.startsWith(publicRoot + path.sep)) {
      res.writeHead(403).end('Accès interdit');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (error) {
    res.writeHead(error.message === 'JSON invalide' || error.message === 'Corps de requête trop volumineux' ? 400 : 500, {
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Octopus2 disponible sur http://localhost:${PORT}`);
});
