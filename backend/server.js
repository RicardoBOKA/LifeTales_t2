const express = require('express');
const cors = require('cors');
const textToSpeech = require('@google-cloud/text-to-speech');

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Initialize Google Cloud TTS client
// This will use Application Default Credentials or service account key
const client = new textToSpeech.TextToSpeechClient();

/**
 * POST /api/synthesize
 * Body: { text: string, voiceStyle: string }
 * Returns: { audioContent: string (base64) }
 */
app.post('/api/synthesize', async (req, res) => {
  try {
    const { text, voiceStyle = 'warm' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Voice configurations
    const voiceConfigs = {
      warm: { name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' },
      professional: { name: 'en-US-Neural2-D', ssmlGender: 'MALE' },
      friendly: { name: 'en-US-Neural2-C', ssmlGender: 'FEMALE' },
      storyteller: { name: 'en-US-Neural2-A', ssmlGender: 'MALE' }
    };

    const voice = voiceConfigs[voiceStyle] || voiceConfigs.warm;

    // Construct the request
    const request = {
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: voice.name,
        ssmlGender: voice.ssmlGender
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0,
        volumeGainDb: 0
      }
    };

    // Call Google Cloud TTS
    const [response] = await client.synthesizeSpeech(request);

    // Return base64 audio
    res.json({
      audioContent: response.audioContent.toString('base64')
    });

  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🎙️  TTS Backend running on http://localhost:${PORT}`);
  console.log(`📝  Make sure GOOGLE_APPLICATION_CREDENTIALS is set`);
});

