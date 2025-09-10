const express = require("express");
const router = express.Router();
const delay = require("../utils/delay");
const { serverDown } = require("../errors/serverDown");
const { requestCounter, requestLatency, payloadSize } = require("../utils/metrics");
const { rateLimitExceeded } = require("../errors/rateLimit");

router.post("/v1/moderations", async (req, res) => {
  then = Date.now();

  if (serverDown()) {
    requestCounter.inc({ method: "POST", path: "/v1/moderations", status: 500 });
    requestLatency.observe({ method: "POST", path: "/v1/moderations", status: 500 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/moderations", status: 500 }, req.socket.bytesRead);
    return res.status(500).json({ error: 'Server error' });
  }

<<<<<<< HEAD
  // Check if rate limit is exceeded
  const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
  if (rate_limit_exceeded) {
    requestCounter.inc({ method: "POST", path: "/v1/moderations", status: 429 });
    requestLatency.observe({ method: "POST", path: "/v1/moderations", status: 429 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/moderations", status: 429 }, req.socket.bytesRead);
    return res.status(429).json({ error: rate_limit_exceeded_reason });
  }

=======
>>>>>>> 573620f1955525f28f4e7aac04a605844f3fb4fe
  const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
  await delay(delayTime);
  
  const input = req.body.input;
  let inputs = Array.isArray(input) ? input : [input];

  const results = inputs.map(text => ({
    flagged: Math.random() > 0.7, // Random flagging
    categories: {
      "harassment": false,
      "harassment/threatening": false,
      "hate": false,
      "hate/threatening": false,
      "self-harm": false,
      "self-harm/intent": false,
      "self-harm/instructions": false,
      "sexual": false,
      "sexual/minors": false,
      "violence": false,
      "violence/graphic": false
    },
    category_scores: {
      "harassment": Math.random(),
      "harassment/threatening": Math.random(),
      "hate": Math.random(),
      "hate/threatening": Math.random(),
      "self-harm": Math.random(),
      "self-harm/intent": Math.random(),
      "self-harm/instructions": Math.random(),
      "sexual": Math.random(),
      "sexual/minors": Math.random(),
      "violence": Math.random(),
      "violence/graphic": Math.random()
    }
  }));

  requestCounter.inc({ method: "POST", path: "/v1/moderations", status: 200 });
  requestLatency.observe({ method: "POST", path: "/v1/moderations", status: 200 }, (Date.now() - then));
  payloadSize.observe({ method: "POST", path: "/v1/moderations", status: 200 }, req.socket.bytesRead);
  res.json({
    id: "modr-" + Math.random().toString(36).substr(2, 9),
    model: "text-moderation-latest",
    results: results
  });
});

module.exports = router;
