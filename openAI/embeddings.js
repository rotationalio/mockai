const express = require("express");
const { contextLimitExceeded } = require("../errors/contextLimit");
const { serverDown } = require("../errors/serverDown");
const { rateLimitExceeded } = require("../errors/rateLimit");
const router = express.Router();
const { requestCounter, requestLatency, payloadSize } = require("../utils/metrics")

router.post("/v1/embeddings", (req, res) => {
    then = Date.now();

    if (serverDown()) {
        requestCounter.inc({ method: "POST", path: "/v1/embeddings", status: 500 });
        requestLatency.observe({ method: "POST", path: "/v1/embeddings", status: 500 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/embeddings", status: 500 }, req.socket.bytesRead);
        return res.status(500).json({ error: 'Server error' });
    }

    const {
        model,
        input
    } = req.body;

    // Check if 'input' is provided
    if (!input) {
        requestCounter.inc({ method: "POST", path: "/v1/embeddings", status: 400 });
        requestLatency.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, req.socket.bytesRead);
        return res
            .status(400)
            .json({ error: 'Missing or invalid "input" in request body' });
    }

    // Check if 'model' is provided
    if (!model) {
        requestCounter.inc({ method: "POST", path: "/v1/embeddings", status: 400 });
        requestLatency.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, req.socket.bytesRead);
        return res
            .status(400)
            .json({ error: 'Missing or invalid "model" in request body' });
    }

    // The embeddings API can take an array of strings or a single string
    // Check if the input is an array
    if (Array.isArray(input)) {
        // Check if the input is an empty array
        if (input.length === 0) {
            requestCounter.inc({ method: "POST", path: "/v1/embeddings", status: 400 });
            requestLatency.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, (Date.now() - then));
            payloadSize.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, req.socket.bytesRead);
            return res
                .status(400)
                .json({ error: 'If providing an array, it must not be empty' });
        }
        // Check if the input is an array of strings
        if (!input.every(i => typeof i === "string")) {
            requestCounter.inc({ method: "POST", path: "/v1/embeddings", status: 400 });
            requestLatency.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, (Date.now() - then));
            payloadSize.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, req.socket.bytesRead);
            return res
                .status(400)
                .json({ error: 'If providing an array, all elements must be strings' });
        }
        // Check if the context limit is exceeded for each element in the array
        for (const i of input) {
            // Check if rate limit is exceeded
            const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded(i);
            if (rate_limit_exceeded) {
                requestCounter.inc({ method: "POST", path: "/v1/embeddings", status: 429 });
                requestLatency.observe({ method: "POST", path: "/v1/embeddings", status: 429 }, (Date.now() - then));
                payloadSize.observe({ method: "POST", path: "/v1/embeddings", status: 429 }, req.socket.bytesRead);
                return res
                    .status(429)
                    .json({ error: rate_limit_exceeded_reason });
            }
            // Check if the context limit is exceeded
            if (contextLimitExceeded(i)) {
                requestCounter.inc({ method: "POST", path: "/v1/embeddings", status: 400 });
                requestLatency.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, (Date.now() - then));
                payloadSize.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, req.socket.bytesRead);
                return res
                    .status(400)
                    .json({ error: 'Context limit exceeded' });
            }
        }
    }
    // Check if the input is a string
    else if (typeof input === "string") {
        // Check if rate limit is exceeded
        const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded(input);
        if (rate_limit_exceeded) {
            requestCounter.inc({ method: "POST", path: "/v1/embeddings", status: 429 });
            requestLatency.observe({ method: "POST", path: "/v1/embeddings", status: 429 }, (Date.now() - then));
            payloadSize.observe({ method: "POST", path: "/v1/embeddings", status: 429 }, req.socket.bytesRead);
            return res
            .status(429)
            .json({ error: rate_limit_exceeded_reason });
        }
        if (contextLimitExceeded(input)) {
            requestCounter.inc({ method: "POST", path: "/v1/embeddings", status: 400 });
            requestLatency.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, (Date.now() - then));
            payloadSize.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, req.socket.bytesRead);
            return res
                .status(400)
                .json({ error: 'Context limit exceeded' });
        }
    }
    // If the input is not an array or a string, return a 400 error
    else {
        requestCounter.inc({ method: "POST", path: "/v1/embeddings", status: 400 });
        requestLatency.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/embeddings", status: 400 }, req.socket.bytesRead);
        return res
            .status(400)
            .json({ error: 'Input must be an array of strings or a single string' });
    }

    const embeddingArray = [];

    for (let j = 0; j < 1536; j++) {
        embeddingArray.push(Math.random())
    }

    const response = {
        object: "list",
        data: [
            ...(Array.isArray(input)
                ? input.map((_, i) => ({
                    object: "embedding",
                    index: i,
                    embedding: embeddingArray,
                  }))
                : [
                    {
                      object: "embedding",
                      index: 0,
                      embedding: embeddingArray,
                    },
                  ]),
        ],
        model: model,
        usage: {
            prompt_tokens: 5,
            total_tokens: 5
        }
    };
    requestCounter.inc({ method: "POST", path: "/v1/embeddings", status: 200 });
    requestLatency.observe({ method: "POST", path: "/v1/embeddings", status: 200 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/embeddings", status: 200 }, req.socket.bytesRead);
    res.json(response);
});

module.exports = router;
