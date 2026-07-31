// Fonction Tavily (Prioritaire avec TAVILY_API_KEY)
async function searchTavily(query, apiKey) {
  if (!apiKey) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s max

  try {
    const response = await fetch('https://api.tavily.com/search', {
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

    if (!response.ok) {
      console.error("Erreur HTTP Tavily:", response.status);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (e) {
    console.error("Erreur ou timeout Tavily:", e.message);
    return [];
  }
}

// Fonction DuckDuckGo (API publique de secours)
async function searchDuckDuckGo(query) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const data = await response.json();
    const results = [];

    if (data.AbstractText) {
      results.push({ content: data.AbstractText });
    }

    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 3).forEach(topic => {
        if (topic.Text) results.push({ content: topic.Text });
      });
    }

    return results;
  } catch (e) {
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

  // 1. EXECUTION DE LA RECHERCHE WEB
  if (webSearch) {
    let searchResults = [];

    // Essai Tavily en premier
    if (tavilyApiKey) {
      searchResults = await searchTavily(lastUserMessage, tavilyApiKey);
    }

    // Si Tavily ne renvoie rien, secours DuckDuckGo
    if (searchResults.length === 0) {
      searchResults = await searchDuckDuckGo(lastUserMessage);
    }

    if (searchResults.length > 0) {
      searchContext = "\n\n[DONNÉES EN DIRECT DU WEB]:\n" + 
        searchResults.map((r, i) => `- Info ${i+1}: ${r.content || r.snippet}`).join("\n");
    }
  }

  // 2. CONFIGURATION DU SYSTEM PROMPT
  let systemContent = "Tu es Octopus AI, un assistant virtuel intelligent.";

  if (mode === 'code') {
    systemContent = `Tu es Octopus AI, un développeur Senior et architecte logiciel expert. Fournis du code propre et optimisé.`;
  } else if (mode === 'writing') {
    systemContent = `Tu es Octopus AI, un expert en rédaction et synthèse.`;
  }

  if (searchContext) {
    systemContent += `\n${searchContext}\n\nCONSIGNE: Utilise les données du Web ci-dessus pour donner une réponse précise et actualisée.`;
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

  // 3. ENVOI À GROQ
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
    } catch (error) {
      console.error(`Erreur modèle ${model}:`, error);
    }
  }

  return res.status(500).json({ error: "Erreur de connexion au service IA." });
}
  
