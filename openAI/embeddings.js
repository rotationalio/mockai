const express = require("express");
const { contextLimitExceeded } = require("../errors/context_limit");
const router = express.Router();

router.post("/v1/embeddings", (req, res) => {
    const {
        model,
        input
    } = req.body;
    if (!input) {
        return res
            .status(400)
            .json({ error: 'Missing or invalid "input" in request body' });
    }
    if (!model) {
        return res
            .status(400)
            .json({ error: 'Missing or invalid "model" in request body' });
    }

    if (contextLimitExceeded(input)) {
        return res
            .status(400)
            .json({ error: 'Context limit exceeded' });
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
    res.json(response);
});

module.exports = router;
