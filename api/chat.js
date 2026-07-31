// Fonction de recherche DuckDuckGo (Sans clé API - Gratuit & Illimité)
async function searchDuckDuckGo(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results = [];
    
    // Extraction des extraits depuis le HTML de DuckDuckGo
    const regExp = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    let count = 0;

    while ((match = regExp.exec(html)) !== null && count < 3) {
      const cleanText = match[1].replace(/<[^>]+>/g, '').trim();
      if (cleanText) {
        results.push({ content: cleanText });
        count++;
      }
    }
    return results;
  } catch (e) {
    console.error("Erreur DuckDuckGo:", e);
    return [];
  }
}

// Fonction de recherche Tavily
async function searchTavily(query, apiKey) {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "basic",
        max_results: 3
      })
    });
    const data = await response.json();
    return data.results || [];
  } catch (e) {
    console.error("Erreur Tavily:", e);
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { messages, mode, webSearch } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Historique de messages requis' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Clé GROQ_API_KEY manquante dans Vercel' });
  }

  const lastUserMessage = messages[messages.length - 1]?.content || "";
  let searchContext = "";

  // RECHERCHE HYBRIDE : Tavily d'abord, puis DuckDuckGo si besoin
  if (webSearch) {
    let searchResults = [];

    if (tavilyApiKey) {
      searchResults = await searchTavily(lastUserMessage, tavilyApiKey);
    }

    if (searchResults.length === 0) {
      console.log("[Octopus AI] Passage sur la recherche DuckDuckGo...");
      searchResults = await searchDuckDuckGo(lastUserMessage);
    }

    if (searchResults.length > 0) {
      searchContext = "\n\n[INFORMATIONS EN DIRECT DU WEB]:\n" + 
        searchResults.map((r, i) => `- Extrait ${i+1}: ${r.content}`).join("\n");
    }
  }

  let systemContent = "Tu es Octopus AI, un assistant virtuel intelligent et connecté au Web.";

  if (mode === 'code') {
    systemContent = `Tu es Octopus AI, un développeur Senior et architecte logiciel expert.
- Fournis du code propre, moderne, optimisé et bien structuré.`;
  } else if (mode === 'writing') {
    systemContent = `Tu es Octopus AI, un expert en rédaction et synthèses.`;
  }

  if (searchContext) {
    systemContent += `\n\nTu disposes d'informations fraîches extraites du Web ci-dessous. Utilise-les pour répondre de façon précise et actualisée : ${searchContext}`;
  }

  const systemMessage = { role: 'system', content: systemContent };

  const formattedMessages = messages.map(m => ({
    role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const recentMessages = formattedMessages.slice(-4);

  const models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it'
  ];

  for (const model of models) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [systemMessage, ...recentMessages],
          temperature: 0.5,
          max_tokens: 4096
        })
      });

      const data = await response.json();

      if (response.ok && data.choices?.[0]?.message?.content) {
        return res.status(200).json({ reply: data.choices[0].message.content });
      }

      if ([429, 413, 400, 404].includes(response.status)) {
        continue;
      } else {
        return res.status(500).json({ error: data.error?.message || 'Erreur API Groq' });
      }

    } catch (error) {
      console.error(`Erreur réseau avec le modèle ${model}:`, error);
    }
  }

  return res.status(429).json({ error: "Service temporairement indisponible." });
        }
