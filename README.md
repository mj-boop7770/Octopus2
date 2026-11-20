# Octopus2

Assistant web avec interface statique, API chat et génération musicale. Le déploiement Vercel utilise `public/` et les fonctions dans `api/`.

## Démarrer en local

```sh
npm start
```

Puis ouvrir `http://localhost:3000`. Vérifier la syntaxe des modules avec `npm run check`.

## Configuration

Dans les variables d’environnement Vercel (ou dans l’environnement du processus local), définir `GROQ_API_KEY` pour le chat. `OPENROUTER_API_KEY` est facultative; sans elle, le routage revient au modèle Groq.

La mémoire de conversation est facultative et nécessite `JSONBIN_API_KEY` et `JSONBIN_CHAT_BIN_ID`. La mémoire GitHub facultative utilise `GITHUB_TOKEN` et `GITHUB_REPO` (format `propriétaire/dépôt`), avec `GITHUB_BRANCH` facultative.

La génération musicale nécessite `HUGGINGFACE_API_KEY` (l’ancien nom `HUGGING_FACE_API_KEY` reste accepté). Les secrets doivent rester dans les variables d’environnement serveur et ne doivent pas être intégrés au navigateur.

## Limites fonctionnelles

Le mode chat et les prompts texte/fichiers texte sont pris en charge. La lecture visuelle des images et des PDF n’est pas implémentée dans le routeur actuel; ces fichiers ne sont pas analysés par le modèle.
