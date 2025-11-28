# API Routes - Backend

Documentation des endpoints API à implémenter.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Pour plus tard : JWT tokens ou session-based auth

## Endpoints

### Notes

#### `POST /api/notes/transcribe`

Transcrit un audio en texte.

**Request Body:**
```json
{
  "audioData": "base64_string",
  "mimeType": "audio/webm"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transcription": "transcribed text..."
  }
}
```

#### `POST /api/spaces/:spaceId/notes`

Crée une nouvelle note dans un space.

**Request Body:**
```json
{
  "type": "AUDIO",
  "content": "Voice Note",
  "transcription": "...",
  "timestamp": 1234567890,
  "title": "My Note",
  "description": ""
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "note_123",
    "type": "AUDIO",
    ...
  }
}
```

#### `PUT /api/spaces/:spaceId/notes/:noteId`

Met à jour une note existante.

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated Description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "note_123",
    ...
  }
}
```

#### `DELETE /api/spaces/:spaceId/notes/:noteId`

Supprime une note.

**Response:**
```json
{
  "success": true
}
```

### Stories

#### `POST /api/stories/generate`

Génère une story à partir des notes d'un space.

**Request Body:**
```json
{
  "spaceId": "space_123",
  "settings": {
    "narrativeTone": "cinematic",
    "storyMode": "chapter",
    "creativity": 1,
    "imageStyle": "illustration"
  }
}
```

**Response (Streaming recommended):**
```json
{
  "success": true,
  "data": {
    "chapters": [
      {
        "title": "Chapter 1",
        "content": "...",
        "illustrationPrompt": "...",
        "illustrationUrl": "data:image/png;base64,..."
      }
    ]
  }
}
```

#### `GET /api/spaces/:spaceId/story`

Récupère la story générée pour un space.

**Response:**
```json
{
  "success": true,
  "data": {
    "chapters": [...]
  }
}
```

### Spaces

#### `GET /api/spaces`

Liste tous les spaces de l'utilisateur.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "space_123",
      "title": "Weekend in Kyoto",
      "description": "...",
      "coverImage": "https://...",
      "startDate": 1234567890,
      "notes": [...],
      "generatedStory": [...]
    }
  ]
}
```

#### `POST /api/spaces`

Crée un nouveau space.

**Request Body:**
```json
{
  "title": "New Trip",
  "description": "Description..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "space_456",
    "title": "New Trip",
    ...
  }
}
```

#### `PUT /api/spaces/:spaceId`

Met à jour un space.

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated Description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "space_123",
    ...
  }
}
```

#### `DELETE /api/spaces/:spaceId`

Supprime un space.

**Response:**
```json
{
  "success": true
}
```

### Settings

#### `GET /api/settings`

Récupère les paramètres de l'utilisateur.

**Response:**
```json
{
  "success": true,
  "data": {
    "narrativeTone": "cinematic",
    "storyMode": "chapter",
    ...
  }
}
```

#### `PUT /api/settings`

Met à jour les paramètres.

**Request Body:**
```json
{
  "narrativeTone": "emotional",
  "creativity": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    ...
  }
}
```

## Error Responses

Toutes les erreurs suivent ce format :

```json
{
  "success": false,
  "error": "Error message description",
  "statusCode": 400
}
```

### Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

## Rate Limiting

À implémenter plus tard :
- Max 10 transcriptions par minute
- Max 3 story generations par heure
- Max 100 API calls par heure

## WebSocket Events (Future)

Pour le streaming des générations :

```typescript
// Client -> Server
socket.emit('story:generate', { spaceId, settings });

// Server -> Client
socket.on('story:chapter', (chapter) => { ... });
socket.on('story:illustration', (chapterIndex, imageUrl) => { ... });
socket.on('story:complete', () => { ... });
socket.on('story:error', (error) => { ... });
```

