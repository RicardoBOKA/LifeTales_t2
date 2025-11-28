# Gemini Services - Backend

Cette architecture décrit comment les services Gemini seront organisés côté backend.

## Architecture Agentique

L'application utilise 3 agents Gemini spécialisés :

### 1. Agent de Transcription
**Responsabilité** : Convertir audio en texte

**Modèle** : `gemini-2.5-flash`

**Input** :
- Audio (base64)
- Mime type

**Output** :
- Transcription (texte)

**Fichier** : `transcription.agent.ts`

### 2. Agent Story Builder
**Responsabilité** : Générer des chapitres narratifs à partir des notes

**Modèle** : `gemini-2.5-flash`

**Input** :
- Array de notes (avec transcriptions, timestamps)
- Titre du space
- Paramètres de style (tone, creativity, mode)

**Output** :
- Array de chapitres (JSON structuré)
- Chaque chapitre contient : title, content, illustrationPrompt

**Fichier** : `story-builder.agent.ts`

**Logique** :
1. Préparer le contexte depuis les notes
2. Construire le prompt avec les paramètres utilisateur
3. Utiliser JSON schema pour structurer la réponse
4. Retourner les chapitres

### 3. Agent Visual Generator
**Responsabilité** : Créer des illustrations pour les chapitres

**Modèle** : `gemini-2.5-flash-image`

**Input** :
- Prompt d'illustration
- Style (watercolor, cinematic, etc.)

**Output** :
- Image (base64)

**Fichier** : `illustration.agent.ts`

## Flow de Données

### Création d'une Note Audio

```
Client → Backend API
  ↓
POST /api/notes/transcribe
  ↓
Transcription Agent (Gemini)
  ↓
Retour : { transcription, noteData }
  ↓
Sauvegarde en DB (futur)
  ↓
Retour au Client
```

### Génération d'une Story

```
Client → Backend API
  ↓
POST /api/stories/generate
Body: { spaceId, settings }
  ↓
Récupération des notes du space
  ↓
Story Builder Agent (Gemini)
  ↓
Pour chaque chapitre:
  ↓
  Illustration Agent (Gemini)
  ↓
  Retour progressif au Client (WebSocket/SSE)
  ↓
Sauvegarde story en DB
  ↓
Retour final au Client
```

## Configuration

### Variables d'Environnement

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL_FLASH=gemini-2.5-flash
GEMINI_MODEL_IMAGE=gemini-2.5-flash-image
```

### Client Gemini

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});
```

## Optimisations Futures

1. **Caching** : Mettre en cache les transcriptions
2. **Rate Limiting** : Limiter les appels API par utilisateur
3. **Queue System** : Utiliser une queue pour les générations longues
4. **Streaming** : Streamer les réponses pour une meilleure UX
5. **Fallbacks** : Gérer les erreurs avec des fallbacks gracieux

## Sécurité

1. Ne jamais exposer l'API Key au frontend
2. Valider toutes les entrées côté backend
3. Limiter la taille des fichiers audio
4. Implémenter des timeouts sur les appels Gemini
5. Logger toutes les erreurs pour monitoring

