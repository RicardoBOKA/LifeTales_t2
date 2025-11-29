# Backend TTS Service Configuration

## Environment Variables (Optional)

You can customize the backend server port:

```bash
PORT=3001
```

## Google Cloud Setup

1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable **Cloud Text-to-Speech API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Cloud Text-to-Speech API"
   - Click "Enable"

4. Create Service Account:
   - Navigate to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name: `lifetales-tts`
   - Grant role: "Cloud Text-to-Speech Client"
   - Click "Done"

5. Generate Key:
   - Click on the service account you created
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Save as `google-credentials.json` in the `backend/` folder

## Testing the Backend

1. Start the server:
```bash
cd backend
npm start
```

2. Test health endpoint:
```bash
curl http://localhost:3001/api/health
```

3. Test TTS endpoint:
```bash
curl -X POST http://localhost:3001/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test."}'
```

## Available Voices

To see all available voices:
```bash
curl http://localhost:3001/api/tts/voices
```

Popular voices for storytelling:
- `en-US-Journey-F` - Natural, expressive female (recommended)
- `en-US-Journey-D` - Natural, expressive male
- `en-US-Neural2-A` - Clear female voice
- `en-US-Neural2-D` - Clear male voice
- `en-US-News-K` - Professional female narrator
- `en-US-News-L` - Professional male narrator

## Pricing

Google Cloud Text-to-Speech pricing (as of 2024):
- **Standard voices**: $4 per 1 million characters
- **WaveNet voices**: $16 per 1 million characters  
- **Neural2 voices**: $16 per 1 million characters
- **Journey voices**: $16 per 1 million characters

Free tier includes 1 million characters per month for WaveNet/Neural2.

For a typical 500-word story chapter:
- ~3000 characters
- ~$0.048 per video (well within free tier)

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `google-credentials.json` to version control
- The file is already in `.gitignore`
- Keep your service account credentials secure
- Restrict API key usage to your domain in production

