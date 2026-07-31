// Fonction DuckDuckGo (API publique, gratuite, sans clé API requis)
async function searchDuckDuckGo(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url);
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
    console.error("Erreur DuckDuckGo API:", e);
    return [];
  }
}

// Fonction Tavily API (prioritaire si la clé TAVILY_API_KEY est configurée)
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
  let searchAttemptedAndFailed = false;

  // LOGIQUE DE RECHERCHE WEB HYBRIDE
  if (webSearch) {
    let searchResults = [];

    // 1. Priorité à Tavily si la clé existe dans Vercel
    if (tavilyApiKey) {
      searchResults = await searchTavily(lastUserMessage, tavilyApiKey);
    }

    // 2. Si Tavily ne donne rien (ou si pas de clé), on passe sur DuckDuckGo
    if (searchResults.length === 0) {
      searchResults = await searchDuckDuckGo(lastUserMessage);
    }

    if (searchResults.length > 0) {
      searchContext = "\n\n[INFORMATIONS EN DIRECT DU WEB]:\n" + 
        searchResults.map((r, i) => `- Extrait ${i+1}: ${r.content}`).join("\n");
    } else {
      searchAttemptedAndFailed = true;
    }
  }

  // DEFINITION DU RÔLE
  let systemContent = "Tu es Octopus AI, un assistant virtuel intelligent.";

  if (mode === 'code') {
    systemContent = `Tu es Octopus AI, un développeur Senior et architecte logiciel expert. Fournis du code propre, moderne, optimisé et bien structuré.`;
  } else if (mode === 'writing') {
    systemContent = `Tu es Octopus AI, un expert en rédaction et synthèses claires et structurées.`;
  }

  // CONSIGNES DE RÉPONSE SANS DÉTOURS
  if (searchContext) {
    systemContent += `\n${searchContext}\n\nCONSIGNE: Utilise les informations extraites du Web ci-dessus pour donner une réponse précise et actualisée à l'utilisateur.`;
  } else if (searchAttemptedAndFailed) {
    systemContent += `\n\nNOTE: La recherche Web a été lancée mais n'a renvoyé aucun résultat concret sur cette requête. Indique brièvement à l'utilisateur que la recherche Web n'a pas donné de résultats et réponds avec tes connaissances.`;
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

  // APPEL À L'API GROQ
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
                
