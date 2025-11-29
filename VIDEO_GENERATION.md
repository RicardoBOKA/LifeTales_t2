# Video Generation Feature

## Overview

LifeTales now supports automatic video generation from your story recaps! This feature creates narrated videos with:
- 🎙️ **AI-generated voice narration** using Google Cloud Text-to-Speech
- 🖼️ **Visual slideshow** from your photos or AI-generated images
- 🎵 **Background music** that matches the mood of your story
- 🎬 **Professional transitions** between scenes

## Setup

### 1. Install Backend Dependencies

The backend server handles text-to-speech conversion:

```bash
cd backend
npm install
```

### 2. Configure Google Cloud Credentials

The video narration uses Google Cloud Text-to-Speech API. You need to:

1. Create a Google Cloud project at https://console.cloud.google.com
2. Enable the **Cloud Text-to-Speech API**
3. Create a service account and download the JSON credentials
4. Save the credentials as `backend/google-credentials.json`

### 3. Start the Backend Server

```bash
cd backend
npm start
```

The TTS backend will run on port 3001 by default.

### 4. Configure Frontend

Create a `.env` file in the project root (optional):

```env
VITE_TTS_API_URL=http://localhost:3001/api
```

## How to Use

1. **Create a Space** and capture your moments (text, voice, photos, videos)
2. **Generate Story** - Click "Generate Story" to create a text-based narrative
3. **Create Video** - Once the story is generated, click the "Create Video" button
4. **Wait for Processing** - The video generation has several steps:
   - 📝 Generating video script (optimized for narration)
   - 🎙️ Converting text to speech with natural voice
   - 🖼️ Loading images from your moments
   - 🎬 Composing the final video
5. **Download** - When complete, click "Download Video" to save your vlog

## Technical Details

### Architecture

```
┌─────────────────┐
│  Story Chapters │  (Generated text story)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Video Script   │  (Gemini optimizes for narration)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Narration Audio│  (Google Cloud TTS)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Scene Images   │  (User photos or AI-generated)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Video Canvas   │  (MediaRecorder + Canvas API)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Final Video    │  (WebM format)
└─────────────────┘
```

### Key Services

1. **videoScript.service.ts** - Uses Gemini AI to create narration-optimized scripts
2. **tts.api.ts** - Communicates with backend TTS service
3. **backgroundMusic.service.ts** - Selects appropriate music based on mood
4. **videoComposition.service.ts** - Combines audio, images, and music using browser APIs
5. **useVideoGeneration.ts** - React hook that orchestrates the entire process

### Video Format

- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30 FPS
- **Format**: WebM (VP9 codec)
- **Bitrate**: 5 Mbps
- **Audio**: MP3 narration + background music

### Voice Options

The default voice is `en-US-Journey-F` (Google's natural, expressive female voice). You can customize the voice, speaking rate, and pitch in the TTS API calls.

## Background Music

The app includes a curated library of royalty-free background music tracks. Music is automatically selected based on your story's mood:

- **Upbeat**: Happy, energetic moments
- **Calm**: Peaceful, relaxed narratives
- **Emotional**: Touching, sentimental stories
- **Dramatic**: Intense, powerful tales
- **Neutral**: Balanced background for any story

You can customize the music library in `src/services/video/backgroundMusic.service.ts`.

## Limitations

1. **Browser Compatibility**: Video generation requires modern browsers with MediaRecorder API support (Chrome, Edge, Firefox)
2. **Processing Time**: Video generation can take 2-5 minutes depending on story length
3. **File Size**: Generated videos are typically 5-20 MB depending on duration
4. **Backend Required**: The backend server must be running for voice narration

## Troubleshooting

### "Failed to generate video"
- Ensure the backend server is running on port 3001
- Check that google-credentials.json is properly configured
- Verify the Text-to-Speech API is enabled in Google Cloud

### "No audio in video"
- Check browser permissions for MediaRecorder
- Ensure the TTS API is responding (test at http://localhost:3001/api/health)

### "Video quality is poor"
- Adjust the `videoBitsPerSecond` in videoComposition.service.ts
- Use higher resolution images in your moments

### "Background music not playing"
- Check that music URLs are accessible
- Music tracks need CORS headers enabled
- Consider hosting music files locally

## Future Enhancements

Potential improvements for the video generation feature:

- [ ] Custom voice selection (male/female, different accents)
- [ ] Video clip integration (not just still images)
- [ ] Advanced transitions and effects
- [ ] Text overlays with chapter titles
- [ ] Multi-resolution export options
- [ ] Direct social media sharing
- [ ] Background music upload
- [ ] Preview before final generation

## API Reference

### Generate Video

```typescript
const { generateVideo, videoBlob, progress } = useVideoGeneration();

await generateVideo(
  chapters,     // Story chapters
  spaceTitle,   // Video title
  settings,     // Story settings
  {
    width: 1920,
    height: 1080,
    fps: 30,
    backgroundMusicVolume: 0.25
  }
);
```

### Text-to-Speech

```typescript
import { textToSpeech } from './services/api/tts.api';

const audioBase64 = await textToSpeech(
  "Your narration text here",
  {
    voice: 'en-US-Journey-F',
    speakingRate: 0.95,
    pitch: 0.0
  }
);
```

## Credits

- **Text-to-Speech**: Google Cloud TTS
- **Background Music**: Bensound (CC BY-ND license)
- **Video Composition**: Browser MediaRecorder API

---

**Note**: Make sure to comply with all licensing requirements when using background music and voice synthesis in your videos.

