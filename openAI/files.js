const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const delay = require("../utils/delay");
const { serverDown } = require("../errors/serverDown");
<<<<<<< HEAD
const { rateLimitExceeded } = require("../errors/rateLimit");
=======
>>>>>>> 573620f1955525f28f4e7aac04a605844f3fb4fe
const { requestCounter, requestLatency, payloadSize } = require("../utils/metrics");

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Mock files data store
let files = new Map();

// Helper function to generate a random file ID
function generateFileId() {
    return 'file-' + Math.random().toString(36).substring(2, 15);
}

// Helper function to calculate bytes from a string or buffer
function calculateBytes(data) {
    if (Buffer.isBuffer(data)) {
        return data.length;
    }
    return Buffer.from(data).length;
}

// List files
router.get("/v1/files", async (req, res) => {
    then = Date.now();

    if (serverDown()) {
        requestCounter.inc({ method: "GET", path: "/v1/files", status: 500 });
        requestLatency.observe({ method: "GET", path: "/v1/files", status: 500 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/files", status: 500 }, req.socket.bytesRead);
        return res.status(500).json({ error: 'Server error' });
    }

<<<<<<< HEAD
    // Check if rate limit is exceeded
    const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
    if (rate_limit_exceeded) {
        requestCounter.inc({ method: "GET", path: "/v1/files", status: 429 });
        requestLatency.observe({ method: "GET", path: "/v1/files", status: 429 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/files", status: 429 }, req.socket.bytesRead);
        return res.status(429).json({ error: rate_limit_exceeded_reason });
    }

=======
>>>>>>> 573620f1955525f28f4e7aac04a605844f3fb4fe
    const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
    await delay(delayTime);

    const { purpose } = req.query;
    let filesList = Array.from(files.values());

    if (purpose) {
        filesList = filesList.filter(file => file.purpose === purpose);
    }

    requestCounter.inc({ method: "GET", path: "/v1/files", status: 200 });
    requestLatency.observe({ method: "GET", path: "/v1/files", status: 200 }, (Date.now() - then));
    payloadSize.observe({ method: "GET", path: "/v1/files", status: 200 }, req.socket.bytesRead);
    res.status(200).json({
        object: "list",
        data: filesList,
        has_more: false
    });
});

// Upload a file
router.post("/v1/files", upload.single("file"), async (req, res) => {
    then = Date.now();

    if (serverDown()) {
        requestCounter.inc({ method: "POST", path: "/v1/files", status: 500 });
        requestLatency.observe({ method: "POST", path: "/v1/files", status: 500 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/files", status: 500 }, req.socket.bytesRead);
        return res.status(500).json({ error: 'Server error' });
    }

<<<<<<< HEAD
    // Check if rate limit is exceeded
    const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
    if (rate_limit_exceeded) {
        requestCounter.inc({ method: "POST", path: "/v1/files", status: 429 });
        requestLatency.observe({ method: "POST", path: "/v1/files", status: 429 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/files", status: 429 }, req.socket.bytesRead);
        return res.status(429).json({ error: rate_limit_exceeded_reason });
    }

=======
>>>>>>> 573620f1955525f28f4e7aac04a605844f3fb4fe
    const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
    await delay(delayTime);

    if (!req.file) {
        requestCounter.inc({ method: "POST", path: "/v1/files", status: 400 });
        requestLatency.observe({ method: "POST", path: "/v1/files", status: 400 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/files", status: 400 }, req.socket.bytesRead);
        return res.status(400).json({
            error: {
                message: "No file provided",
                type: "invalid_request_error",
                param: "file",
                code: "invalid_request_error"
            }
        });
    }

    const purpose = req.body.purpose;
    if (!purpose) {
        requestCounter.inc({ method: "POST", path: "/v1/files", status: 400 });
        requestLatency.observe({ method: "POST", path: "/v1/files", status: 400 }, (Date.now() - then));
        payloadSize.observe({ method: "POST", path: "/v1/files", status: 400 }, req.socket.bytesRead);
        return res.status(400).json({
            error: {
                message: "Purpose is required",
                type: "invalid_request_error",
                param: "purpose",
                code: "invalid_request_error"
            }
        });
    }

    const fileId = generateFileId();
    const file = {
        id: fileId,
        object: "file",
        bytes: calculateBytes(req.file.buffer),
        created_at: Math.floor(Date.now() / 1000),
        filename: req.file.originalname,
        purpose: purpose,
        status: "processed",
        status_details: null
    };

    // Store file data
    files.set(fileId, {
        ...file,
        content: req.file.buffer // Store the actual file content
    });

    // Don't send the content in the response
    requestCounter.inc({ method: "POST", path: "/v1/files", status: 200 });
    requestLatency.observe({ method: "POST", path: "/v1/files", status: 200 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/files", status: 200 }, req.socket.bytesRead);
    res.status(200).json(file);
});

// Delete a file
router.delete("/v1/files/:file_id", async (req, res) => {
    then = Date.now();

    if (serverDown()) {
        requestCounter.inc({ method: "DELETE", path: "/v1/files/:file_id", status: 500 });
        requestLatency.observe({ method: "DELETE", path: "/v1/files/:file_id", status: 500 }, (Date.now() - then));
        payloadSize.observe({ method: "DELETE", path: "/v1/files/:file_id", status: 500 }, req.socket.bytesRead);
        return res.status(500).json({ error: 'Server error' });
    }

<<<<<<< HEAD
    // Check if rate limit is exceeded
    const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
    if (rate_limit_exceeded) {
        requestCounter.inc({ method: "DELETE", path: "/v1/files/:file_id", status: 429 });
        requestLatency.observe({ method: "DELETE", path: "/v1/files/:file_id", status: 429 }, (Date.now() - then));
        payloadSize.observe({ method: "DELETE", path: "/v1/files/:file_id", status: 429 }, req.socket.bytesRead);
        return res.status(429).json({ error: rate_limit_exceeded_reason });
    }

=======
>>>>>>> 573620f1955525f28f4e7aac04a605844f3fb4fe
    const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
    await delay(delayTime);

    const fileId = req.params.file_id;
    const file = files.get(fileId);

    if (!file) {
        requestCounter.inc({ method: "DELETE", path: "/v1/files/:file_id", status: 404 });
        requestLatency.observe({ method: "DELETE", path: "/v1/files/:file_id", status: 404 }, (Date.now() - then));
        payloadSize.observe({ method: "DELETE", path: "/v1/files/:file_id", status: 404 }, req.socket.bytesRead);
        return res.status(404).json({
            error: {
                message: "No such file",
                type: "invalid_request_error",
                param: null,
                code: "resource_not_found"
            }
        });
    }

    files.delete(fileId);

    requestCounter.inc({ method: "DELETE", path: "/v1/files/:file_id", status: 200 });
    requestLatency.observe({ method: "DELETE", path: "/v1/files/:file_id", status: 200 }, (Date.now() - then));
    payloadSize.observe({ method: "DELETE", path: "/v1/files/:file_id", status: 200 }, req.socket.bytesRead);
    res.status(200).json({
        id: fileId,
        object: "file",
        deleted: true
    });
});

// Retrieve file information
router.get("/v1/files/:file_id", async (req, res) => {
    then = Date.now();

    if (serverDown()) {
        requestCounter.inc({ method: "GET", path: "/v1/files/:file_id", status: 500 });
        requestLatency.observe({ method: "GET", path: "/v1/files/:file_id", status: 500 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/files/:file_id", status: 500 }, req.socket.bytesRead);
        return res.status(500).json({ error: 'Server error' });
    }

<<<<<<< HEAD
    // Check if rate limit is exceeded
    const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
    if (rate_limit_exceeded) {
        requestCounter.inc({ method: "GET", path: "/v1/files/:file_id", status: 429 });
        requestLatency.observe({ method: "GET", path: "/v1/files/:file_id", status: 429 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/files/:file_id", status: 429 }, req.socket.bytesRead);
        return res.status(429).json({ error: rate_limit_exceeded_reason });
    }

=======
>>>>>>> 573620f1955525f28f4e7aac04a605844f3fb4fe
    const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
    await delay(delayTime);

    const fileId = req.params.file_id;
    const file = files.get(fileId);

    if (!file) {
        requestCounter.inc({ method: "GET", path: "/v1/files/:file_id", status: 404 });
        requestLatency.observe({ method: "GET", path: "/v1/files/:file_id", status: 404 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/files/:file_id", status: 404 }, req.socket.bytesRead);
        return res.status(404).json({
            error: {
                message: "No such file",
                type: "invalid_request_error",
                param: null,
                code: "resource_not_found"
            }
        });
    }

    // Don't send the content in the response
    const { content, ...fileInfo } = file;
    requestCounter.inc({ method: "GET", path: "/v1/files/:file_id", status: 200 });
    requestLatency.observe({ method: "GET", path: "/v1/files/:file_id", status: 200 }, (Date.now() - then));
    payloadSize.observe({ method: "GET", path: "/v1/files/:file_id", status: 200 }, req.socket.bytesRead);
    res.status(200).json(fileInfo);
});

// Retrieve file content
router.get("/v1/files/:file_id/content", async (req, res) => {
    then = Date.now();

    if (serverDown()) {
        requestCounter.inc({ method: "GET", path: "/v1/files/:file_id/content", status: 500 });
        requestLatency.observe({ method: "GET", path: "/v1/files/:file_id/content", status: 500 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/files/:file_id/content", status: 500 }, req.socket.bytesRead);
        return res.status(500).json({ error: 'Server error' });
    }

<<<<<<< HEAD
    // Check if rate limit is exceeded
    const { exceeded: rate_limit_exceeded, reason: rate_limit_exceeded_reason } = rateLimitExceeded();
    if (rate_limit_exceeded) {
        requestCounter.inc({ method: "GET", path: "/v1/files/:file_id/content", status: 429 });
        requestLatency.observe({ method: "GET", path: "/v1/files/:file_id/content", status: 429 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/files/:file_id/content", status: 429 }, req.socket.bytesRead);
        return res.status(429).json({ error: rate_limit_exceeded_reason });
    }

=======
>>>>>>> 573620f1955525f28f4e7aac04a605844f3fb4fe
    const delayTime = parseInt(req.headers["x-set-response-delay-ms"]) || 0;
    await delay(delayTime);

    const fileId = req.params.file_id;
    const file = files.get(fileId);

    if (!file) {
        requestCounter.inc({ method: "GET", path: "/v1/files/:file_id/content", status: 404 });
        requestLatency.observe({ method: "GET", path: "/v1/files/:file_id/content", status: 404 }, (Date.now() - then));
        payloadSize.observe({ method: "GET", path: "/v1/files/:file_id/content", status: 404 }, req.socket.bytesRead);
        return res.status(404).json({
            error: {
                message: "No such file",
                type: "invalid_request_error",
                param: null,
                code: "resource_not_found"
            }
        });
    }

    // Set appropriate headers based on file type
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    
    requestCounter.inc({ method: "GET", path: "/v1/files/:file_id/content", status: 200 });
    requestLatency.observe({ method: "GET", path: "/v1/files/:file_id/content", status: 200 }, (Date.now() - then));
    payloadSize.observe({ method: "GET", path: "/v1/files/:file_id/content", status: 200 }, req.socket.bytesRead);
    // Send the file content
    res.send(file.content);
});

module.exports = router;
