const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.clear();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require("cors");
app.use(cors());

// Command queue per user+device
const commandQueue = {}; // Format: { "ritwik:esp32": { command: "LED_ON" } }

// POST /command - client UI sends commands here
app.post("/command", (req, res) => {
  const { user, device, command } = req.body;
  if (!user || !device || !command) {
    return res.status(400).json({ error: "Missing user, device, or command" });
  }

  const key = `${user}:${device}`;
  commandQueue[key] = { command };
  console.log(`✅ Queued command for ${key}:`, command);
  res.json({ success: true });
});

// GET /poll?user=ritwik&device=esp32 - ESP32 polls here
app.get("/poll", (req, res) => {
  const { user, device } = req.query;
  if (!user || !device) {
    return res.status(400).json({ error: "Missing user or device" });
  }

  const key = `${user}:${device}`;
  const response = commandQueue[key] || { command: null };
  delete commandQueue[key]; // Clear after sending

  console.log(`📡 Polled by ${key} →`, response.command);
  res.json(response);
});



// Configure multer for handling audio files
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GeminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Endpoint for Gemini chat
app.post('/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ response: response.text() });
    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
});

// Function to convert audio buffer to base64
function audioBufferToBase64(buffer) {
    return buffer.toString('base64');
}

// Endpoint to handle audio file transcription
app.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No audio file received');
        }

        console.log('Received audio file, size:', req.file.size);

        // Convert audio to text using Gemini's model
        const audio = audioBufferToBase64(req.file.buffer);
        
        // Using Gemini to describe the audio content
        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{
                    inline_data: {
                        mime_type: "audio/wav",
                        data: audio
                    }
                }]
            }]
        });

        const response = await result.response;
        const transcription = response.text();

        res.json({ text: transcription });
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: 'Transcription failed' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
