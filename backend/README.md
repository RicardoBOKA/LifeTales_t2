# Google Cloud TTS Backend Setup

## Step 1: Create Google Cloud Project

1. Go to: https://console.cloud.google.com/
2. Click "Select a project" → "NEW PROJECT"
3. Name it: "LifeTales"
4. Click "CREATE"

## Step 2: Enable Text-to-Speech API

1. Go to: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
2. Make sure "LifeTales" project is selected
3. Click "ENABLE"

## Step 3: Enable Billing

1. Go to: https://console.cloud.google.com/billing
2. Click "LINK A BILLING ACCOUNT"
3. Add a credit card (you get $300 free credit)

## Step 4: Create Service Account

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click "CREATE SERVICE ACCOUNT"
3. Name it: "tts-service"
4. Click "CREATE AND CONTINUE"
5. Grant role: "Cloud Text-to-Speech User"
6. Click "DONE"

## Step 5: Download Service Account Key

1. Click on the service account you just created
2. Go to "KEYS" tab
3. Click "ADD KEY" → "Create new key"
4. Choose "JSON"
5. Click "CREATE"
6. Save the downloaded JSON file as: `backend/google-credentials.json`

## Step 6: Install Backend Dependencies

```bash
cd backend
npm install
```

## Step 7: Run Backend Server

```bash
# Set the credentials path (Mac/Linux)
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/google-credentials.json"

# Or on Windows
set GOOGLE_APPLICATION_CREDENTIALS=%CD%\google-credentials.json

# Start the server
npm start
```

You should see:
```
🎙️  TTS Backend running on http://localhost:3001
📝  Make sure GOOGLE_APPLICATION_CREDENTIALS is set
```

## Step 8: Run Frontend

In a NEW terminal (keep backend running):

```bash
cd ..
npm run dev
```

## Testing

Now try generating a vlog - it will use Google Cloud TTS via your backend!

## Troubleshooting

**Error: "Could not load the default credentials"**
- Make sure `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set
- Make sure the path points to your `google-credentials.json` file

**Error: "Permission denied"**
- Make sure you granted "Cloud Text-to-Speech User" role to the service account
- Make sure billing is enabled

**Error: "Failed to fetch"**
- Make sure backend server is running on port 3001
- Check for CORS errors in browser console
