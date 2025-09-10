const express = require("express");
const router = express.Router();
const delay = require("../utils/delay");
const { requestCounter, requestLatency, payloadSize } = require("../utils/metrics");
const { serverDown } = require("../errors/serverDown");
const { rateLimitExceeded } = require("../errors/rateLimit");

// Mock batch data store
let batches = new Map();
let batchEvents = new Map();

// Helper function to generate a random batch ID
function generateBatchId() {
    return 'batch_' + Math.random().toString(36).substring(2, 15);
}

// Helper function to generate mock events for a batch
function generateMockEvents(batchId, status) {
    const baseEvents = [
        {
            id: `evt_${Math.random().toString(36).substring(2)}`,
            object: "batch.event",
            created_at: Math.floor(Date.now() / 1000) - 100,
            level: "info",
            message: "Batch processing job has been created",
            data: null,
            type: "message"
        }
    ];

    if (status === "succeeded") {
        baseEvents.push({
            id: `evt_${Math.random().toString(36).substring(2)}`,
            object: "batch.event",
            created_at: Math.floor(Date.now() / 1000),
            level: "info",
            message: "Batch processing completed successfully",
            data: null,
            type: "message"
        });
    }

    return baseEvents;
}

// Create a batch processing job
router.post("/v1/batch", async (req, res) => {
    then = Date.now();

    if (serverDown()) {
        requestCounter.inc({ method: "POST", path: "/v1/batch", status: 500 });
        requestLatency.observe({ method: "POST", path: "/v1/batch", status: 500 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/batch", status: 500 }, req.socket.bytesRead);
        return res.status(500).json({ error: 'Server error' });
    }

    // Check if rate limit is exceeded
    const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
    if (rate_limit_exceeded) {
        requestCounter.inc({ method: "POST", path: "/v1/batch", status: 429 });
        requestLatency.observe({ method: "POST", path: "/v1/batch", status: 429 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/batch", status: 429 }, req.socket.bytesRead);
        return res.status(429).json({ error: rate_limit_exceeded_reason });
    }

    const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
    await delay(delayTime);

    const { operations } = req.body;

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
        requestCounter.inc({ method: "POST", path: "/v1/batch", status: 400 });
        requestLatency.observe({ method: "POST", path: "/v1/batch", status: 400 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/batch", status: 400 }, req.socket.bytesRead);
        return res.status(400).json({
            error: {
                message: "operations array is required and must not be empty",
                type: "invalid_request_error",
                param: "operations",
                code: "invalid_request_error"
            }
        });
    }

    // Validate each operation
    for (const [index, operation] of operations.entries()) {
        if (!operation.parameters || !operation.operation) {
            requestCounter.inc({ method: "POST", path: "/v1/batch", status: 400 });
            requestLatency.observe({ method: "POST", path: "/v1/batch", status: 400 }, (Date.now() - then));
            payloadSize.observe({ method: "POST", path: "/v1/batch", status: 400 }, req.socket.bytesRead);
            return res.status(400).json({
                error: {
                    message: `Invalid operation at index ${index}`,
                    type: "invalid_request_error",
                    param: `operations[${index}]`,
                    code: "invalid_request_error"
                }
            });
        }
    }

    const batchId = generateBatchId();
    const batch = {
        id: batchId,
        object: "batch",
        created_at: Math.floor(Date.now() / 1000),
        finished_at: null,
        status: "running",
        operations: operations.map((op, index) => ({
            ...op,
            id: `op_${Math.random().toString(36).substring(2)}`,
            status: "pending",
            created_at: Math.floor(Date.now() / 1000),
            started_at: null,
            finished_at: null,
            error: null
        })),
        total_operations: operations.length,
        completed_operations: 0,
        failed_operations: 0,
        error: null
    };

    batches.set(batchId, batch);
    batchEvents.set(batchId, generateMockEvents(batchId, "running"));

    // Simulate async processing
    setTimeout(() => {
        const batch = batches.get(batchId);
        if (batch && batch.status === "running") {
            batch.status = "succeeded";
            batch.finished_at = Math.floor(Date.now() / 1000);
            batch.completed_operations = batch.total_operations;
            batch.operations = batch.operations.map(op => ({
                ...op,
                status: "succeeded",
                started_at: batch.created_at + 1,
                finished_at: batch.finished_at,
                result: {
                    // Mock result based on operation type
                    output: "Mock output for " + op.operation
                }
            }));
            batches.set(batchId, batch);
            
            // Add completion event
            const events = batchEvents.get(batchId);
            events.push({
                id: `evt_${Math.random().toString(36).substring(2)}`,
                object: "batch.event",
                created_at: Math.floor(Date.now() / 1000),
                level: "info",
                message: "All operations completed successfully",
                data: null,
                type: "message"
            });
            batchEvents.set(batchId, events);
        }
    }, 5000);

    requestCounter.inc({ method: "POST", path: "/v1/batch", status: 200 });
    requestLatency.observe({ method: "POST", path: "/v1/batch", status: 200 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/batch", status: 200 }, req.socket.bytesRead);
    res.status(200).json(batch);
});

// Get batch status
router.get("/v1/batch/:batch_id", async (req, res) => {
    then = Date.now();

    if (serverDown()) {
        requestCounter.inc({ method: "GET", path: "/v1/batch/:batch_id", status: 500 });
        requestLatency.observe({ method: "GET", path: "/v1/batch/:batch_id", status: 500 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/batch/:batch_id", status: 500 }, req.socket.bytesRead);
        return res.status(500).json({ error: 'Server error' });
    }

    // Check if rate limit is exceeded
    const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
    if (rate_limit_exceeded) {
        requestCounter.inc({ method: "GET", path: "/v1/batch/:batch_id", status: 429 });
        requestLatency.observe({ method: "GET", path: "/v1/batch/:batch_id", status: 429 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/batch/:batch_id", status: 429 }, req.socket.bytesRead);
        return res.status(429).json({ error: rate_limit_exceeded_reason });
    }

    const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
    await delay(delayTime);

    const batch = batches.get(req.params.batch_id);
    if (!batch) {
        requestCounter.inc({ method: "GET", path: "/v1/batch/:batch_id", status: 404 });
        requestLatency.observe({ method: "GET", path: "/v1/batch/:batch_id", status: 404 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/batch/:batch_id", status: 404 }, req.socket.bytesRead);
        return res.status(404).json({
            error: {
                message: "Batch not found",
                type: "invalid_request_error",
                param: null,
                code: "resource_not_found"
            }
        });
    }

    requestCounter.inc({ method: "GET", path: "/v1/batch/:batch_id", status: 200 });
    requestLatency.observe({ method: "GET", path: "/v1/batch/:batch_id", status: 200 }, (Date.now() - then));
    payloadSize.observe({ method: "GET", path: "/v1/batch/:batch_id", status: 200 }, req.socket.bytesRead);
    res.status(200).json(batch);
});

// Cancel batch
router.post("/v1/batch/:batch_id/cancel", async (req, res) => {
    then = Date.now();

    if (serverDown()) {
        requestCounter.inc({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 500 });
        requestLatency.observe({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 500 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 500 }, req.socket.bytesRead);
        return res.status(500).json({ error: 'Server error' });
    }

    // Check if rate limit is exceeded
    const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
    if (rate_limit_exceeded) {
        requestCounter.inc({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 429 });
        requestLatency.observe({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 429 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 429 }, req.socket.bytesRead);
        return res.status(429).json({ error: rate_limit_exceeded_reason });
    }

    const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
    await delay(delayTime);

    const batch = batches.get(req.params.batch_id);
    if (!batch) {
        requestCounter.inc({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 404 });
        requestLatency.observe({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 404 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 404 }, req.socket.bytesRead);
        return res.status(404).json({
            error: {
                message: "Batch not found",
                type: "invalid_request_error",
                param: null,
                code: "resource_not_found"
            }
        });
    }

    if (batch.status !== "running") {
        requestCounter.inc({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 400 });
        requestLatency.observe({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 400 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 400 }, req.socket.bytesRead);
        return res.status(400).json({
            error: {
                message: `Batch is ${batch.status}, cannot be cancelled`,
                type: "invalid_request_error",
                param: null,
                code: "invalid_request_error"
            }
        });
    }

    batch.status = "cancelled";
    batch.finished_at = Math.floor(Date.now() / 1000);
    
    // Update pending operations
    batch.operations = batch.operations.map(op => {
        if (op.status === "pending") {
            return {
                ...op,
                status: "cancelled",
                finished_at: batch.finished_at
            };
        }
        return op;
    });

    batches.set(req.params.batch_id, batch);

    // Add cancellation event
    const events = batchEvents.get(req.params.batch_id);
    events.push({
        id: `evt_${Math.random().toString(36).substring(2)}`,
        object: "batch.event",
        created_at: Math.floor(Date.now() / 1000),
        level: "info",
        message: "Batch processing cancelled",
        data: null,
        type: "message"
    });
    batchEvents.set(req.params.batch_id, events);

    requestCounter.inc({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 200 });
    requestLatency.observe({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 200 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/batch/:batch_id/cancel", status: 200 }, req.socket.bytesRead);
    res.status(200).json(batch);
});

// Get batch events
router.get("/v1/batch/:batch_id/events", async (req, res) => {
    then = Date.now();

    if (serverDown()) {
        requestCounter.inc({ method: "GET", path: "/v1/batch/:batch_id/events", status: 500 });
        requestLatency.observe({ method: "GET", path: "/v1/batch/:batch_id/events", status: 500 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/batch/:batch_id/events", status: 500 }, req.socket.bytesRead);
        return res.status(500).json({ error: 'Server error' });
    }

    // Check if rate limit is exceeded
    const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
    if (rate_limit_exceeded) {
        requestCounter.inc({ method: "GET", path: "/v1/batch/:batch_id/events", status: 429 });
        requestLatency.observe({ method: "GET", path: "/v1/batch/:batch_id/events", status: 429 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/batch/:batch_id/events", status: 429 }, req.socket.bytesRead);
        return res.status(429).json({ error: rate_limit_exceeded_reason });
    }

    const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
    await delay(delayTime);

    const { limit = 20, after } = req.query;

    if (!batches.has(req.params.batch_id)) {
        requestCounter.inc({ method: "GET", path: "/v1/batch/:batch_id/events", status: 404 });
        requestLatency.observe({ method: "GET", path: "/v1/batch/:batch_id/events", status: 404 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/batch/:batch_id/events", status: 404 }, req.socket.bytesRead);
        return res.status(404).json({
            error: {
                message: "Batch not found",
                type: "invalid_request_error",
                param: null,
                code: "resource_not_found"
            }
        });
    }

    let events = batchEvents.get(req.params.batch_id) || [];

    if (after) {
        const afterIndex = events.findIndex(event => event.id === after);
        if (afterIndex !== -1) {
            events = events.slice(afterIndex + 1);
        }
    }

    events = events.slice(0, parseInt(limit));

    requestCounter.inc({ method: "GET", path: "/v1/batch/:batch_id/events", status: 200 });
    requestLatency.observe({ method: "GET", path: "/v1/batch/:batch_id/events", status: 200 }, (Date.now() - then));
    payloadSize.observe({ method: "GET", path: "/v1/batch/:batch_id/events", status: 200 }, req.socket.bytesRead);
    res.status(200).json({
        object: "list",
        data: events,
        has_more: events.length === parseInt(limit)
    });
});

module.exports = router;
