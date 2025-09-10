const express = require("express");
const delay = require("../utils/delay")
const { contextLimitExceeded } = require("../errors/contextLimit");
const { serverDown } = require("../errors/serverDown");
const { rateLimitExceeded } = require("../errors/rateLimit");
const { requestCounter, requestLatency, payloadSize } = require("../utils/metrics")

const router = express.Router();

router.post("/v1/images/generations", async (req, res) => {
  then = Date.now();

  if (serverDown()) {
    requestCounter.inc({ method: "POST", path: "/v1/images/generations", status: 500 });
    requestLatency.observe({ method: "POST", path: "/v1/images/generations", status: 500 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/images/generations", status: 500 }, req.socket.bytesRead);
    return res.status(500).json({ error: 'Server error' });
  }

  const delayHeader = req.headers["x-set-response-delay-ms"]

  let delayTime = parseInt(delayHeader) || parseInt(process.env.RESPONSE_DELAY_MS) || 0

  await delay(delayTime)
  const { prompt, n } = req.body;

  // Check if 'prompt' is provided
  if (!prompt) {
    requestCounter.inc({ method: "POST", path: "/v1/images/generations", status: 400 });
    requestLatency.observe({ method: "POST", path: "/v1/images/generations", status: 400 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/images/generations", status: 400 }, req.socket.bytesRead);
    return res
      .status(400)
      .json({ error: 'Missing or invalid "prompt" in request body' });
  }

  // Check if 'prompt' is a string
  if (typeof prompt !== "string") {
    requestCounter.inc({ method: "POST", path: "/v1/images/generations", status: 400 });
    requestLatency.observe({ method: "POST", path: "/v1/images/generations", status: 400 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/images/generations", status: 400 }, req.socket.bytesRead);
    return res
      .status(400)
      .json({ error: 'Prompt must be a string' });
  }

  // Check if rate limit is exceeded
  const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded(prompt);
  if (rate_limit_exceeded) {
    requestCounter.inc({ method: "POST", path: "/v1/images/generations", status: 429 });
    requestLatency.observe({ method: "POST", path: "/v1/images/generations", status: 429 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/images/generations", status: 429 }, req.socket.bytesRead);
    return res
      .status(429)
      .json({ error: rate_limit_exceeded_reason });
  }

  // Check if the context limit is exceeded
  if (contextLimitExceeded(prompt)) {
    requestCounter.inc({ method: "POST", path: "/v1/images/generations", status: 400 });
    requestLatency.observe({ method: "POST", path: "/v1/images/generations", status: 400 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/images/generations", status: 400 }, req.socket.bytesRead);
    return res
      .status(400)
      .json({ error: 'Context limit exceeded' });
  }

  let nn = n;
  if (!nn) {
    nn = 1;
  }
  if (nn > 10) {
    nn = 10;
  }
  const url =
    "https://images.unsplash.com/photo-1661956602926-db6b25f75947?ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1298&q=80";
  const imgs = [];
  for (let i = 0; i < nn; i++) {
    imgs.push(url);
  }
  const revisedPrompt = [prompt,"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo."].join(". ");
  const response = {
    created: Math.floor(Date.now() / 1000),
    data:[{
      revised_prompt: revisedPrompt,
      data: imgs,
    }]
  };

  requestCounter.inc({ method: "POST", path: "/v1/images/generations", status: 200 });
  requestLatency.observe({ method: "POST", path: "/v1/images/generations", status: 200 }, (Date.now() - then));
  payloadSize.observe({ method: "POST", path: "/v1/images/generations", status: 200 }, req.socket.bytesRead);
  res.json(response);
});

module.exports = router;
