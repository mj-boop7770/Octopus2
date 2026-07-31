// Fonction de recherche Tavily
async function searchTavily(query, apiKey) {
  if (!apiKey) return [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Timeout 3s

    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "basic",
        max_results: 3
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { messages, mode, webSearch } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages requis' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY manquante dans Vercel' });
  }

  const lastUserMessage = messages[messages.length - 1]?.content || "";
  let searchContext = "";

  // 1. RECHERCHE WEB VIA TAVILY
  if (webSearch && lastUserMessage.trim()) {
    const results = await searchTavily(lastUserMessage, tavilyApiKey);
    if (results.length > 0) {
      searchContext = "\n\n[DONNÉES WEB EN TEMPS RÉEL]:\n" + 
        results.map((r, i) => `- Info ${i+1}: ${r.content || r.snippet}`).join("\n");
    }
  }

  // 2. CONFIGURATION SYSTEM PROMPT
  let systemContent = "Tu es Octopus AI, un assistant virtuel intelligent connecté au web.";
  if (mode === 'code') systemContent = "Tu es Octopus AI, un développeur et architecte logiciel Senior.";
  if (mode === 'writing') systemContent = "Tu es Octopus AI, un expert en rédaction, analyse et synthèse.";

  if (searchContext) {
    systemContent += `\n${searchContext}\n\nCONSIGNE STRICTE: Réponds en t'appuyant directement sur les résultats du Web ci-dessus. N'invente aucune information.`;
  }

  const formattedMessages = messages.map(m => ({
    role: (m.role === 'bot' || m.role === 'assistant') ? 'assistant' : 'user',
    content: m.content
  }));

  const recentMessages = formattedMessages.slice(-4);

  // 3. MODÈLES SUR GROQ (Mixtral, Gemma 2, Qwen 2.5)
  const models = [
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'qwen-2.5-32b'
  ];

  for (const model of models) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'system', content: systemContent }, ...recentMessages],
          temperature: 0.3,
          max_tokens: 2048
        })
      });

      const data = await groqRes.json();

      if (groqRes.ok && data.choices?.[0]?.message?.content) {
        return res.status(200).json({ reply: data.choices[0].message.content });
      }
    } catch (e) {
      console.error(`Erreur avec ${model}:`, e);
    }
  }

  return res.status(500).json({ error: "Erreur de connexion au service IA." });
          }
