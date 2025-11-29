# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Gemini API

1. Get your Gemini API key from https://ai.google.dev
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Edit `.env.local` and add your API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

### Step 3: Run the App

```bash
npm run dev
```

Open http://localhost:5173 in your browser!

## 📱 Using the App

1. **Create a Space** - Click "Create Space" and give it a title
2. **Capture Moments** - Add text, voice recordings, photos, or videos
3. **Generate Story** - Click "Generate Story" to create a narrative
4. **Customize** - Go to Settings to adjust tone, style, and creativity

## 🎬 Enable Video Generation (Optional)

To enable the video generation feature:

1. Setup backend:
   ```bash
   cd backend
   npm install
   ```

2. Configure Google Cloud TTS:
   - Follow [backend/SETUP.md](backend/SETUP.md)
   - Save credentials as `backend/google-credentials.json`

3. Start backend:
   ```bash
   cd backend
   npm start
   ```

4. The "Create Video" button will now appear in your story view!

## 🎨 Story Customization

In Settings, you can customize:

- **Narrative Tone**: Cinematic, Funny, Neutral, Emotional, Journalistic, Poetic
- **Image Style**: Illustration, Cinematic, Pastel, Realistic
- **Creativity**: 0-100 (controls AI creativity level)
- **Story Mode**:
  - **Transcription**: Faithful to original recordings
  - **Chapter**: Structured story with all moments
  - **Clean**: Organized summary
  - **Creative**: Artistic freedom with narrative techniques

## 📚 Next Steps

- Read [VIDEO_GENERATION.md](VIDEO_GENERATION.md) for video features
- Check out [backend/SETUP.md](backend/SETUP.md) for backend setup
- Explore the Settings to customize your story style

## 🆘 Need Help?

Common issues:

- **"API Key missing"**: Check your `.env.local` file
- **Story generation fails**: Verify your Gemini API key is valid
- **Video button not showing**: Backend server must be running on port 3001

## 💡 Tips

- Use voice recordings for authentic personal stories
- Add photos to make your stories more vivid
- Experiment with different tones and styles
- Try different creativity levels for varied results
- Generate multiple versions to find your favorite

Enjoy creating your LifeTales! 🎉

