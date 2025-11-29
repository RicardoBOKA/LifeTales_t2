const express = require('express');
const cors = require('cors');
const textToSpeech = require('@google-cloud/text-to-speech');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure Google Cloud clients
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: path.join(__dirname, 'google-credentials.json')
});

const auth = new GoogleAuth({
  keyFilename: path.join(__dirname, 'google-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * POST /api/generate-narrator
 * Generate animated narrator video from user photo using Vertex AI Veo Fast
 * Body: { photoBase64: string, script: string, durationSeconds: number }
 * Returns: { operationId: string }
 */
app.post('/api/generate-narrator', async (req, res) => {
  try {
    const { photoBase64, script, durationSeconds = 8 } = req.body;

    if (!photoBase64 || !script) {
      return res.status(400).json({ error: 'Photo and script are required' });
    }

    const PROJECT_ID = "vibers-paris-ai-hackathon";
    const LOCATION_ID = "us-central1";
    const API_ENDPOINT = "us-central1-aiplatform.googleapis.com";
    const MODEL_ID = "veo-3.1-generate-preview";  // Standard version, not fast

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Use the actual script in the prompt
    console.log('📝 Using script:', script.substring(0, 200));
    const cleanPrompt = `A person speaking: ${script.substring(0, 300)}`;

    const requestBody = {
      endpoint: `projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google/models/${MODEL_ID}`,
      instances: [
        {
          prompt: cleanPrompt,
          image: {
            bytesBase64Encoded: photoBase64,
            mimeType: "image/jpeg"
          }
        }
      ],
      parameters: {
        aspectRatio: "16:9",
        sampleCount: 1,
        durationSeconds: "8",  // Maximum duration for Veo
        personGeneration: "allow_all",
        addWatermark: false,
        includeRaiReason: true,
        generateAudio: true,  // ENABLE AUDIO!
        resolution: "720p"
      }
    };

    const response = await axios.post(
      `https://${API_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google/models/${MODEL_ID}:predictLongRunning`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const operationName = response.data.name;

    res.json({
      operationId: operationName,
      status: 'started'
    });

  } catch (error) {
    console.error('Veo generation error:', error.response?.data || error);
    res.status(500).json({
      error: 'Video generation failed',
      details: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/narrator-status/:operationId
 * Check status of narrator video generation
 */
app.get('/api/narrator-status/:operationId(*)', async (req, res) => {
  try {
    // Operation ID comes URL encoded, decode it
    const operationId = decodeURIComponent(req.params.operationId);

    const PROJECT_ID = "vibers-paris-ai-hackathon";
    const LOCATION_ID = "us-central1";
    const API_ENDPOINT = "us-central1-aiplatform.googleapis.com";
    const MODEL_ID = "veo-3.1-fast-generate-preview";

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const requestBody = {
      operationName: operationId
    };

    const response = await axios.post(
      `https://${API_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google/models/${MODEL_ID}:fetchPredictOperation`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.done) {
      console.log('✅ Operation is done!');
      console.log('📊 Full response.data:', JSON.stringify(response.data, null, 2));
      
      // Check if video was blocked by safety filters
      if (response.data.response?.raiMediaFilteredCount > 0) {
        console.error('🚫 Video was blocked by content safety filters');
        return res.status(400).json({
          status: 'error',
          error: 'Video generation was blocked by content safety filters. Try using a different photo or prompt.',
          details: response.data.response.raiMediaFilteredReasons
        });
      }
      
      // Extract the base64 video data from response.videos[0].bytesBase64Encoded
      const video = response.data.response?.videos?.[0];
      const videoBase64 = video?.bytesBase64Encoded;
      
      console.log('🎬 Video data found:', !!videoBase64);
      console.log('📦 Video size:', videoBase64 ? videoBase64.length : 0);
      
      if (!videoBase64) {
        console.error('❌ No video data! Response structure:', {
          hasResponse: !!response.data.response,
          hasVideos: !!response.data.response?.videos,
          videosLength: response.data.response?.videos?.length,
          firstVideo: video,
          responseKeys: Object.keys(response.data.response || {}),
          fullResponse: response.data.response
        });
        return res.status(500).json({
          status: 'error',
          error: 'No video data in response'
        });
      }
      
      res.json({
        status: 'complete',
        videoBase64: videoBase64
      });
    } else {
      console.log('⏳ Still processing...');
      res.json({
        status: 'processing'
      });
    }

  } catch (error) {
    console.error('Status check error:', error.response?.data || error);
    res.status(500).json({
      error: 'Status check failed',
      details: error.response?.data || error.message
    });
  }
});

/**
 * POST /api/tts
 * Generate speech audio from text
 */
app.post('/api/tts', async (req, res) => {
  try {
    const { 
      text, 
      voice = 'en-US-Journey-F',
      languageCode = 'en-US',
      speakingRate = 1.0,
      pitch = 0.0
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const request = {
      input: { text },
      voice: { 
        languageCode, 
        name: voice 
      },
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate,
        pitch
      },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioBase64 = response.audioContent.toString('base64');

    res.json({ 
      audioContent: audioBase64,
      format: 'mp3'
    });

  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ 
      error: 'Text-to-speech conversion failed',
      details: error.message 
    });
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'LifeTales Video Backend',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🎬  LifeTales Video Backend running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
});
