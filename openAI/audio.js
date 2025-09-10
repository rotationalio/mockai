const express = require("express");
const router = express.Router();
const multer = require('multer');
const upload = multer();
const delay = require("../utils/delay");
const { getMockAudioData } = require("../data/mockAudio");
const { contextLimitExceeded } = require("../errors/contextLimit");
const { requestCounter, requestLatency, payloadSize } = require("../utils/metrics");

// Text to Speech
router.post("/v1/audio/speech", async (req, res) => {
  then = Date.now();
  const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
  await delay(delayTime);

  const { model, input, voice, response_format = "mp3", speed = 1.0 } = req.body;

  // Get mock audio data in the requested format
  const mockAudioData = getMockAudioData(response_format);

  // Set appropriate headers based on response format
  res.set({
    'Content-Type': response_format === 'mp3' ? 'audio/mp3' : 'audio/wav',
    'Content-Length': mockAudioData.length
  });

  if (input) {
    if (typeof input !== "string") {
      requestCounter.inc({ method: "POST", path: "/v1/audio/speech", status: 400 });
      requestLatency.observe({ method: "POST", path: "/v1/audio/speech", status: 400 }, (Date.now() - then));
      payloadSize.observe({ method: "POST", path: "/v1/audio/speech", status: 400 }, req.socket.bytesRead);
      return res
        .status(400)
        .json({ error: 'Input must be a string' });
    }
    if (contextLimitExceeded(input)) {
      requestCounter.inc({ method: "POST", path: "/v1/audio/speech", status: 400 });
      requestLatency.observe({ method: "POST", path: "/v1/audio/speech", status: 400 }, (Date.now() - then));
      payloadSize.observe({ method: "POST", path: "/v1/audio/speech", status: 400 }, req.socket.bytesRead);
      return res
        .status(400)
        .json({ error: 'Context limit exceeded' });
    }
  }
  else {
    requestCounter.inc({ method: "POST", path: "/v1/audio/speech", status: 400 });
    requestLatency.observe({ method: "POST", path: "/v1/audio/speech", status: 400 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/audio/speech", status: 400 }, req.socket.bytesRead);
    return res
      .status(400)
      .json({ error: 'Input must be provided' });
  }

  requestCounter.inc({ method: "POST", path: "/v1/audio/speech", status: 200 });
  requestLatency.observe({ method: "POST", path: "/v1/audio/speech", status: 200 }, (Date.now() - then));
  payloadSize.observe({ method: "POST", path: "/v1/audio/speech", status: 200 }, req.socket.bytesRead);
  res.send(mockAudioData);
});

// Speech to Text (Transcription)
router.post("/v1/audio/transcriptions", upload.single('file'), async (req, res) => {
  then = Date.now();
  const delayTime = parseInt(req.get('x-set-response-delay-ms')) || 0;
  await delay(delayTime);

  const { model = "whisper-1", language, prompt, response_format = "json", temperature = 0 } = req.body;
  const format = response_format;

  // Prompt is optional, but if it is provided, we need to check if it exceeds the context limit
  if (prompt) {
    if (typeof prompt !== "string") {
      requestCounter.inc({ method: "POST", path: "/v1/audio/transcriptions", status: 400 });
      requestLatency.observe({ method: "POST", path: "/v1/audio/transcriptions", status: 400 }, (Date.now() - then));
      payloadSize.observe({ method: "POST", path: "/v1/audio/transcriptions", status: 400 }, req.socket.bytesRead);
      return res
        .status(400)
        .json({ error: 'Prompt must be a string' });
    }
    if (contextLimitExceeded(prompt)) {
      requestCounter.inc({ method: "POST", path: "/v1/audio/transcriptions", status: 400 });
      requestLatency.observe({ method: "POST", path: "/v1/audio/transcriptions", status: 400 }, (Date.now() - then));
      payloadSize.observe({ method: "POST", path: "/v1/audio/transcriptions", status: 400 }, req.socket.bytesRead);
      return res
        .status(400)
        .json({ error: 'Context limit exceeded' });
    }
  }

  // Mock transcription response
  const transcription = {
    text: "This is a mock transcription of the audio file. The quick brown fox jumps over the lazy dog.",
  };

  requestCounter.inc({ method: "POST", path: "/v1/audio/transcriptions", status: 200 });
  requestLatency.observe({ method: "POST", path: "/v1/audio/transcriptions", status: 200 }, (Date.now() - then));
  payloadSize.observe({ method: "POST", path: "/v1/audio/transcriptions", status: 200 }, req.socket.bytesRead);
  if (format === "verbose_json") {
    const verboseResponse = {
      text: transcription.text,
      language: language || "en",
      segments: [
        {
          id: 0,
          seek: 0,
          start: 0.0,
          end: 4.0,
          text: "This is a mock transcription",
          tokens: [50364, 1029, 338, 257, 3277, 12314],
          temperature: temperature,
          avg_logprob: -0.458,
          compression_ratio: 1.275,
          no_speech_prob: 0.1,
          words: [
            { word: "This", start: 0.0, end: 0.3, probability: 0.999 },
            { word: "is", start: 0.3, end: 0.5, probability: 0.999 },
            { word: "a", start: 0.5, end: 0.6, probability: 0.999 },
            { word: "mock", start: 0.6, end: 0.9, probability: 0.999 },
            { word: "transcription", start: 0.9, end: 1.5, probability: 0.999 }
          ]
        }
      ]
    };
    res.json(verboseResponse);
  } else if (format === "srt" || format === "vtt") {
    const content = format === "srt" 
      ? "1\n00:00:00,000 --> 00:00:04,000\nThis is a mock transcription of the audio file.\n\n2\n00:00:04,000 --> 00:00:08,000\nThe quick brown fox jumps over the lazy dog."
      : "WEBVTT\n\n00:00:00.000 --> 00:00:04.000\nThis is a mock transcription of the audio file.\n\n00:00:04.000 --> 00:00:08.000\nThe quick brown fox jumps over the lazy dog.";
    
    res.set('Content-Type', 'text/plain');
    res.send(content);
  } else {
    res.json(transcription);
  }
});

// Audio Translation
router.post("/v1/audio/translations", upload.single('file'), async (req, res) => {
  then = Date.now();
  const delayTime = parseInt(req.get('x-set-response-delay-ms')) || 0;
  await delay(delayTime);

  const { model = "whisper-1", prompt, response_format = "json", temperature = 0 } = req.body;
  const format = response_format;

  // Mock translation response (always translates to English)
  const translation = {
    text: "This is a mock translation to English. The quick brown fox jumps over the lazy dog.",
  };

  // Prompt is optional, but if it is provided, we need to check if it exceeds the context limit
  if (prompt) {
    if (typeof prompt !== "string") {
      requestCounter.inc({ method: "POST", path: "/v1/audio/translations", status: 400 });
      requestLatency.observe({ method: "POST", path: "/v1/audio/translations", status: 400 }, (Date.now() - then));
      payloadSize.observe({ method: "POST", path: "/v1/audio/translations", status: 400 }, req.socket.bytesRead);
      return res
        .status(400)
        .json({ error: 'Prompt must be a string' });
    }
    if (contextLimitExceeded(prompt)) {
      requestCounter.inc({ method: "POST", path: "/v1/audio/translations", status: 400 });
      requestLatency.observe({ method: "POST", path: "/v1/audio/translations", status: 400 }, (Date.now() - then));
      payloadSize.observe({ method: "POST", path: "/v1/audio/translations", status: 400 }, req.socket.bytesRead);
      return res
        .status(400)
        .json({ error: 'Context limit exceeded' });
    }
  }

  requestCounter.inc({ method: "POST", path: "/v1/audio/translations", status: 200 });
  requestLatency.observe({ method: "POST", path: "/v1/audio/translations", status: 200 }, (Date.now() - then));
  payloadSize.observe({ method: "POST", path: "/v1/audio/translations", status: 200 }, req.socket.bytesRead);
  if (format === "verbose_json") {
    const verboseResponse = {
      text: translation.text,
      segments: [
        {
          id: 0,
          seek: 0,
          start: 0.0,
          end: 4.0,
          text: "This is a mock translation",
          tokens: [50364, 1029, 338, 257, 3277, 12314],
          temperature: temperature,
          avg_logprob: -0.458,
          compression_ratio: 1.275,
          no_speech_prob: 0.1,
          words: [
            { word: "This", start: 0.0, end: 0.3, probability: 0.999 },
            { word: "is", start: 0.3, end: 0.5, probability: 0.999 },
            { word: "a", start: 0.5, end: 0.6, probability: 0.999 },
            { word: "mock", start: 0.6, end: 0.9, probability: 0.999 },
            { word: "translation", start: 0.9, end: 1.5, probability: 0.999 }
          ]
        }
      ]
    };
    res.json(verboseResponse);
  } else if (format === "srt" || format === "vtt") {
    const content = format === "srt" 
      ? "1\n00:00:00,000 --> 00:00:04,000\nThis is a mock translation to English.\n\n2\n00:00:04,000 --> 00:00:08,000\nThe quick brown fox jumps over the lazy dog."
      : "WEBVTT\n\n00:00:00.000 --> 00:00:04.000\nThis is a mock translation to English.\n\n00:00:04.000 --> 00:00:08.000\nThe quick brown fox jumps over the lazy dog.";
    
    res.set('Content-Type', 'text/plain');
    res.send(content);
  } else {
    res.json(translation);
  }
});

module.exports = router;
