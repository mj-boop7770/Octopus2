# Octopus2

Interface de chat multi-agents déployable sur Vercel ou en local.

## Développement local

```bash
npm install
npm start
```

Application : http://localhost:3000

## Déploiement Vercel

Les variables sont déjà stockées dans Vercel. Déclenchez un nouveau déploiement après chaque modification.

## Variables prises en charge

- `GROQ_API_KEY` — obligatoire
- `OPENROUTER_API_KEY`
- `GEMINI_API_KEY`
- `HUGGINGFACE_API_KEY` ou `HUGGING_FACE_API_KEY`
- `GITHUB_TOKEN`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `JSONBIN_API_KEY`
- `JSONBIN_CHAT_BIN_ID`
