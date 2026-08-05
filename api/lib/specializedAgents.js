import memoryManager from './memory.js';

class SpecializedAgentsManager {
    constructor() {
        this.agents = {
            coder: {
                name: 'DevPro',
                systemPrompt: `Vous êtes DevPro, un expert en développement logiciel, architecture web, et debugging.
Vous donnez des réponses précises, du code propre, bien structuré et optimisé.
Formattez toujours les blocs de code avec la syntaxe appropriée.`
            },
            creative: {
                name: 'Muse',
                systemPrompt: `Vous êtes Muse, un assistant créatif, poétique, captivant et inspirant.
Exprimez-vous avec élégance, imagination et style.`
            },
            concise: {
                name: 'Flash',
                systemPrompt: `Vous êtes Flash. Soyez ultra-concis, direct, clair et synthétique.
Allez droit au but sans fioritures.`
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
        const memContext = await memoryManager.getRelevantContext(userPrompt);

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

export default new SpecializedAgentsManager();
