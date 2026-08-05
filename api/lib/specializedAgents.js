import memoryManager from './memory.js';

class SpecializedAgentsManager {
    constructor() {
        this.agents = {
            coder: {
                name: 'DevPro',
                systemPrompt: `Vous êtes DevPro, un expert en développement logiciel, architecture web, et debugging. Vous donnez des réponses précises, du code propre, bien structuré et optimisé.`
            },
            creative: {
                name: 'Muse',
                systemPrompt: `Vous êtes Muse, un assistant créatif, poétique, captivant et inspirant.`
            },
            concise: {
                name: 'Flash',
                systemPrompt: `Vous êtes Flash. Soyez ultra-concis, direct, clair et synthétique.`
            },
            standard: {
                name: 'Octopus',
                systemPrompt: `Vous êtes MUJOS-OCTOPUS2, un assistant IA polyvalent, intelligent, courtois et efficace.`
            }
        };
    }

    getAgentPrompt(mode) {
        const agent = this.agents[mode] || this.agents.standard;
        return agent.systemPrompt;
    }

    async processWithAgent(mode, userPrompt, contextMessages = [], fileData = null) {
        const systemPrompt = this.getAgentPrompt(mode);
        const memContext = memoryManager.getRelevantContext ? await memoryManager.getRelevantContext(userPrompt) : "";

        let finalSystemPrompt = systemPrompt;
        if (memContext) {
            finalSystemPrompt += `\n\n[INFORMATIONS EN MÉMOIRE CONTEXTUELLE]:\n${memContext}`;
        }

        const messages = [
            { role: 'system', content: finalSystemPrompt },
            ...contextMessages
        ];

        if (fileData && fileData.text) {
            messages.push({
                role: 'user',
                content: `${userPrompt}\n\n[FICHIER JOINT (${fileData.name})]:\n${fileData.text}`
            });
        } else {
            messages.push({ role: 'user', content: userPrompt });
        }

        return messages;
    }
}

const managerInstance = new SpecializedAgentsManager();

export default async function runSpecializedAgent({ plan, messages, contextData, mode, image, keys }) {
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const formattedMessages = await managerInstance.processWithAgent(mode, lastUserMessage, messages.slice(0, -1));

    if (contextData) {
        formattedMessages.unshift({ role: 'system', content: `[DONNÉES DU CONTEXTE EN TEMPS RÉEL]:\n${contextData}` });
    }

    const apiKey = keys.groq || keys.openrouter || keys.gemini;
    if (!apiKey) {
        return {
            response: "Clé API non disponible sur le serveur Vercel.",
            usedModel: plan.selectedModel
        };
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${keys.groq}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: formattedMessages,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur API Provider: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            response: data.choices?.[0]?.message?.content || "Aucune réponse générée.",
            usedModel: plan.selectedModel
        };
    } catch (err) {
        return {
            response: `Erreur lors de l'exécution de l'agent: ${err.message}`,
            usedModel: plan.selectedModel
        };
    }
}
