// api/lib/llm.js
// Appels LLM centralisés : Groq / OpenRouter (format OpenAI), streaming + outils, et Gemini.
// Chaque fournisseur utilise UNIQUEMENT sa propre clé (jamais celle d'un autre).

const ENDPOINTS = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions'
};

// Certains modèles (DeepSeek R1...) renvoient leur raisonnement entre <think>...</think>
function stripThink(text) {
  return String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function providerError(provider, status, detail) {
  const error = new Error(`${provider} a répondu ${status}${detail ? ' : ' + detail : ''}`);
  error.providerStatus = status;
  error.provider = provider;
  return error;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`délai dépassé (${Math.round(timeoutMs / 1000)} s)`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Groq ou OpenRouter, réponse complète (sans streaming)
async function chatCompletion({ provider, apiKey, model, messages, temperature = 0.7, extra = {}, timeoutMs = 25000 }) {
  const url = ENDPOINTS[provider];
  if (!url) throw new Error(`Fournisseur non supporté : ${provider}`);
  if (!apiKey) throw new Error(`Clé ${provider} manquante`);

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature, ...extra })
  }, timeoutMs);

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    throw providerError(provider, response.status, detail);
  }

  const data = await response.json();
  return stripThink(data.choices?.[0]?.message?.content);
}

// Streaming (SSE) avec appels d'outils.
// Appelle onText(delta) au fil de l'eau ; renvoie { content, toolCalls }.
async function streamChat({ provider, apiKey, model, messages, tools = [], temperature = 0.7, extra = {}, onText = () => {}, timeoutMs = 30000 }) {
  const url = ENDPOINTS[provider];
  if (!url) throw new Error(`Fournisseur non supporté : ${provider}`);
  if (!apiKey) throw new Error(`Clé ${provider} manquante`);

  const body = {
    model,
    messages,
    temperature,
    stream: true,
    ...(tools.length ? { tools, tool_choice: 'auto' } : {}),
    ...extra
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, timeoutMs);

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    throw providerError(provider, response.status, detail);
  }
  if (!response.body) throw new Error('flux de réponse vide');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  const calls = [];

  const handleLine = (rawLine) => {
    const line = rawLine.trim();
    if (!line.startsWith('data:')) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return;

    let json;
    try { json = JSON.parse(payload); } catch (e) { return; }
    if (json.error) throw new Error(json.error.message || 'erreur dans le flux');

    const delta = json.choices && json.choices[0] && json.choices[0].delta;
    if (!delta) return;

    if (typeof delta.content === 'string' && delta.content) {
      content += delta.content;
      onText(delta.content);
    }

    if (Array.isArray(delta.tool_calls)) {
      for (const part of delta.tool_calls) {
        const index = typeof part.index === 'number' ? part.index : 0;
        const call = calls[index] || (calls[index] = { id: '', name: '', arguments: '' });
        if (part.id) call.id = part.id;
        if (part.function && part.function.name) call.name = part.function.name;
        if (part.function && part.function.arguments) call.arguments += part.function.arguments;
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      handleLine(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
    }
  }
  if (buffer.trim()) handleLine(buffer);

  return {
    content,
    toolCalls: calls
      .filter(call => call && call.name)
      .map((call, n) => ({ id: call.id || `call_${n}`, name: call.name, arguments: call.arguments || '{}' }))
  };
}

// Gemini (API generateContent). `image` = { mimeType, base64 } ou null
async function geminiChat({ apiKey, model, messages, image = null, timeoutMs = 25000 }) {
  if (!apiKey) throw new Error('Clé gemini manquante');

  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  if (image && contents.length) {
    const lastUser = [...contents].reverse().find(c => c.role === 'user');
    if (lastUser) lastUser.parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
  }

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(system && { system_instruction: { parts: [{ text: system }] } }),
        contents
      })
    },
    timeoutMs
  );

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    throw providerError('gemini', response.status, detail);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return stripThink(parts.map(p => p.text || '').join(''));
}

// "data:image/jpeg;base64,XXXX" -> { mimeType, base64 }
function parseDataUrl(dataUrl) {
  const match = /^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  return match ? { mimeType: match[1], base64: match[2] } : null;
}

module.exports = { chatCompletion, streamChat, geminiChat, parseDataUrl, stripThink, fetchWithTimeout };
