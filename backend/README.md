# LifeTales Backend - Architecture

Documentation de l'architecture backend pour LifeTales.

## Vue d'ensemble

Le backend est responsable de :
1. **Gestion des données** : Spaces, Notes, Stories
2. **Orchestration des agents Gemini** : Transcription, Story Building, Illustrations
3. **API REST** : Communication avec le frontend
4. **Persistance** : Base de données (à définir)

## Architecture

```
backend/
├── types/              # Types partagés
├── services/
│   ├── gemini/        # Agents Gemini
│   │   ├── transcription.agent.ts
│   │   ├── story-builder.agent.ts
│   │   └── illustration.agent.ts
│   └── database/      # Services DB
├── api/
│   ├── routes/        # Définition des routes
│   ├── controllers/   # Logique métier
│   └── middleware/    # Auth, validation, etc.
├── utils/             # Utilitaires
└── config/            # Configuration
```

## Stack Technologique Recommandée

### Option 1 : Node.js + Express (Simple)

**Avantages** :
- Même langage que le frontend (TypeScript)
- Écosystème riche
- Facile à déployer

**Stack** :
- Express.js
- TypeScript
- MongoDB ou PostgreSQL
- Gemini SDK

### Option 2 : Python + FastAPI (AI-Friendly)

**Avantages** :
- Excellent pour l'IA/ML
- FastAPI très performant
- Gemini SDK officiel

**Stack** :
- FastAPI
- Python 3.11+
- SQLAlchemy + PostgreSQL
- Gemini SDK

## Flow Frontend ↔ Backend

### Actuel (Temporaire)

```
Frontend ──────────────> Gemini API
         (direct call)
```

**Problèmes** :
- API key exposée
- Pas de cache
- Pas de rate limiting
- Pas de logging

### Cible (Après Backend)

```
Frontend ──> Backend API ──> Gemini Agents ──> Gemini API
         (HTTP)          (orchestration)
```

**Avantages** :
- API key sécurisée
- Cache des transcriptions
- Rate limiting
- Logging et monitoring
- Queue pour générations longues

## Agents Gemini - Architecture Détaillée

### 1. Transcription Agent

**Responsabilité** : Audio → Texte

**Input** :
```typescript
{
  audioData: string;  // base64
  mimeType: string;   // 'audio/webm', etc.
}
```

**Output** :
```typescript
{
  transcription: string;
  confidence?: number;
}
```

**Optimisations** :
- Cache les transcriptions (hash du audio)
- Timeout de 30 secondes
- Retry automatique (3x)

### 2. Story Builder Agent

**Responsabilité** : Notes → Chapitres Narratifs

**Input** :
```typescript
{
  notes: Note[];
  spaceTitle: string;
  settings: StorySettings;
}
```

**Output** :
```typescript
{
  chapters: Chapter[];
}
```

**Logique** :
1. Trier les notes par timestamp
2. Grouper par jour/thème
3. Construire le contexte pour Gemini
4. Appliquer les paramètres (tone, creativity)
5. Générer avec JSON schema
6. Valider et retourner

**Optimisations** :
- Streaming des chapitres au fur et à mesure
- Cache partiel (paramètres identiques)
- Timeout de 60 secondes

### 3. Illustration Agent

**Responsabilité** : Prompt → Image

**Input** :
```typescript
{
  prompt: string;
  style: string;  // 'illustration', 'cinematic', etc.
}
```

**Output** :
```typescript
{
  imageUrl: string;  // base64 ou URL CDN
}
```

**Optimisations** :
- Upload vers CDN (Cloudinary, S3)
- Cache les images générées
- Génération parallèle pour plusieurs chapitres
- Timeout de 45 secondes

## Base de Données

### Schéma (Proposition)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spaces
CREATE TABLE spaces (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255),
  description TEXT,
  cover_image VARCHAR(500),
  start_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notes
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  type VARCHAR(50),  -- 'AUDIO', 'TEXT', 'IMAGE'
  content TEXT,
  transcription TEXT,
  audio_url VARCHAR(500),
  timestamp TIMESTAMP,
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chapters
CREATE TABLE chapters (
  id UUID PRIMARY KEY,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  illustration_prompt TEXT,
  illustration_url VARCHAR(500),
  position INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Settings
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  narrative_tone VARCHAR(50),
  story_mode VARCHAR(50),
  creativity INTEGER,
  image_style VARCHAR(50),
  voice_style VARCHAR(50),
  background_music BOOLEAN,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Client (Frontend)

Le frontend utilise déjà `apiClient` préparé dans `src/services/api/client.ts`.

Pour basculer vers le backend :

```typescript
// Avant (direct Gemini)
const transcription = await transcribeAudio(audio, mime);

// Après (via backend)
const response = await transcriptionApi.transcribe({
  audioData: audio,
  mimeType: mime
});
const transcription = response.transcription;
```

## Déploiement

### Backend

**Options** :
- Vercel (Node.js)
- Railway (Node.js/Python)
- Render (Node.js/Python)
- AWS Lambda + API Gateway
- Docker + VPS

### Base de Données

**Options** :
- Supabase (PostgreSQL + Auth gratuit)
- MongoDB Atlas (gratuit 500MB)
- PlanetScale (MySQL gratuit)
- Neon (PostgreSQL serverless)

### CDN pour Images

**Options** :
- Cloudinary (gratuit 25GB)
- AWS S3 + CloudFront
- Vercel Blob Storage

## Sécurité

### Checklist

- [ ] API Key Gemini sécurisée (env variables)
- [ ] CORS configuré correctement
- [ ] Rate limiting par IP/user
- [ ] Validation des inputs (Zod/Joi)
- [ ] Sanitization des données
- [ ] HTTPS obligatoire
- [ ] Logs sans données sensibles
- [ ] Timeouts sur tous les appels externes
- [ ] Error handling gracieux

## Migration Frontend → Backend

### Étape 1 : Déployer le Backend

1. Créer le projet backend (Express ou FastAPI)
2. Implémenter les agents Gemini
3. Créer les routes API
4. Déployer sur Vercel/Railway

### Étape 2 : Configuration Frontend

1. Définir `API_BASE_URL` dans `.env`
2. Vérifier que `apiClient` pointe vers le backend

### Étape 3 : Migration Progressive

1. Commencer par la transcription
2. Puis la génération de story
3. Puis les illustrations
4. Tester à chaque étape

### Étape 4 : Nettoyer

1. Retirer les appels directs à Gemini du frontend
2. Supprimer l'API key du frontend
3. Mettre à jour la documentation

## Monitoring & Logging

### Métriques à Suivre

- Nombre d'appels API Gemini
- Latence des transcriptions
- Latence des générations de story
- Taux d'erreur
- Coût API Gemini

### Tools Recommandés

- Sentry (erreurs)
- LogRocket (logs frontend)
- Datadog/New Relic (monitoring backend)
- Google Analytics (usage)

## Prochaines Étapes

1. ✅ Architecture définie
2. ⏳ Choisir la stack (Node.js ou Python)
3. ⏳ Implémenter les agents Gemini
4. ⏳ Créer les routes API
5. ⏳ Setup DB et migrations
6. ⏳ Déployer le backend
7. ⏳ Migrer le frontend
8. ⏳ Ajouter auth/users
9. ⏳ Ajouter monitoring
10. ⏳ Optimiser performances

## Contact & Questions

Pour toute question sur l'architecture backend, se référer à ce README ou créer une issue dans le repo.

