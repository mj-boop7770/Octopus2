// api/lib/guard.js
// Protection de base des routes API : contrôle d'origine + limite de débit par IP.
//
// LIMITES À CONNAÎTRE (plan gratuit, sans base de données partagée) :
// - Le contrôle d'origine bloque les AUTRES SITES WEB dans un navigateur ; il n'arrête pas
//   un script (curl) qui n'envoie pas d'en-tête Origin.
// - Le compteur est en mémoire : chaque instance serverless a le sien. C'est un frein
//   efficace contre l'abus simple, pas une garantie. Pour du blindé, activer le
//   pare-feu / Attack Challenge Mode de Vercel.

const buckets = new Map();

function clientIp(req) {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function allowedOrigin(req) {
  const origin = req.headers && req.headers.origin;
  if (!origin) return { ok: true, origin: null };

  const allowList = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowList.includes(origin)) return { ok: true, origin };

  try {
    // Même site (l'interface est servie par la même app) : autorisé
    if (new URL(origin).host === req.headers.host) return { ok: true, origin };
  } catch (e) { /* origine invalide */ }
  return { ok: false, origin };
}

function rateLimited(req, name, limit, windowMs = 60000) {
  const now = Date.now();
  const key = `${name}:${clientIp(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
    }
    return 0;
  }

  bucket.count += 1;
  return bucket.count > limit ? Math.ceil((bucket.resetAt - now) / 1000) : 0;
}

// Renvoie true si la requête a été refusée (la réponse est déjà envoyée).
function guard(req, res, { name, limit }) {
  const originCheck = allowedOrigin(req);
  if (!originCheck.ok) {
    res.status(403).json({ success: false, error: 'Origine non autorisée.' });
    return true;
  }

  // CORS : on n'ouvre qu'aux origines autorisées (jamais "*")
  if (originCheck.origin) {
    res.setHeader('Access-Control-Allow-Origin', originCheck.origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type, x-groq-key, x-openrouter-key, x-gemini-key, x-github-key, x-hf-key');
  }

  if (req.method === 'OPTIONS') return false;

  const perMinute = Number(process.env.RATE_LIMIT_PER_MIN) || limit;
  const retryAfter = rateLimited(req, name, perMinute);
  if (retryAfter) {
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ success: false, error: `Trop de requêtes. Réessaie dans ${retryAfter} s.` });
    return true;
  }
  return false;
}

module.exports = { guard, rateLimited, allowedOrigin };
