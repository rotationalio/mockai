const express = require("express");
const router = express.Router();
const delay = require("../utils/delay");
const { serverDown } = require("../errors/serverDown");
const { rateLimitExceeded } = require("../errors/rateLimit");
const { requestCounter, requestLatency, payloadSize } = require("../utils/metrics");

// List models
router.get("/v1/models", async (req, res) => {
  then = Date.now();

  if (serverDown()) {
    requestCounter.inc({ method: "GET", path: "/v1/models", status: 500 });
    requestLatency.observe({ method: "GET", path: "/v1/models", status: 500 }, (Date.now() - then));
    payloadSize.observe({ method: "GET", path: "/v1/models", status: 500 }, req.socket.bytesRead);
    return res.status(500).json({ error: 'Server error' });
  }

  // Check if rate limit is exceeded
  const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
  if (rate_limit_exceeded) {
    requestCounter.inc({ method: "GET", path: "/v1/models", status: 429 });
    requestLatency.observe({ method: "GET", path: "/v1/models", status: 429 }, (Date.now() - then));
    payloadSize.observe({ method: "GET", path: "/v1/models", status: 429 }, req.socket.bytesRead);
    return res.status(429).json({ error: rate_limit_exceeded_reason });
  }

  const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
  await delay(delayTime);
  
  const models = [
    {
      id: "gpt-4",
      created: 1687882410,
      object: "model",
      owned_by: "openai",
    },
    {
      id: "gpt-4-0613",
      created: 1686744178,
      object: "model",
      owned_by: "openai",
    },
    {
      id: "gpt-3.5-turbo",
      created: 1677649963,
      object: "model",
      owned_by: "openai",
    },
    {
      id: "dall-e-3",
      created: 1698785189,
      object: "model",
      owned_by: "openai",
    },
    {
      id: "whisper-1",
      created: 1677532384,
      object: "model",
      owned_by: "openai",
    }
  ];

  requestCounter.inc({ method: "GET", path: "/v1/models", status: 200 });
  requestLatency.observe({ method: "GET", path: "/v1/models", status: 200 }, (Date.now() - then));
  payloadSize.observe({ method: "GET", path: "/v1/models", status: 200 }, req.socket.bytesRead);
  res.json({
    object: "list",
    data: models
  });
});

// Retrieve model
router.get("/v1/models/:model", async (req, res) => {
  then = Date.now();

  if (serverDown()) {
    requestCounter.inc({ method: "GET", path: "/v1/models/:model", status: 500 });
    requestLatency.observe({ method: "GET", path: "/v1/models/:model", status: 500 }, (Date.now() - then));
    payloadSize.observe({ method: "GET", path: "/v1/models/:model", status: 500 }, req.socket.bytesRead);
    return res.status(500).json({ error: 'Server error' });
  }

  // Check if rate limit is exceeded
  const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
  if (rate_limit_exceeded) {
    requestCounter.inc({ method: "GET", path: "/v1/models/:model", status: 429 });
    requestLatency.observe({ method: "GET", path: "/v1/models/:model", status: 429 }, (Date.now() - then));
    payloadSize.observe({ method: "GET", path: "/v1/models/:model", status: 429 }, req.socket.bytesRead);
    return res.status(429).json({ error: rate_limit_exceeded_reason });
  }

  const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
  await delay(delayTime);
  
  const modelId = req.params.model;
  const modelData = {
    id: modelId,
    created: Math.floor(Date.now() / 1000) - 10000,
    object: "model",
    owned_by: "openai",
  };

  requestCounter.inc({ method: "GET", path: "/v1/models/:model", status: 200 });
  requestLatency.observe({ method: "GET", path: "/v1/models/:model", status: 200 }, (Date.now() - then));
  payloadSize.observe({ method: "GET", path: "/v1/models/:model", status: 200 }, req.socket.bytesRead);
  res.json(modelData);
});

module.exports = router;
