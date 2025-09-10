#!/usr/bin/env node

// Simple test script to demonstrate streaming functionality
// Run with: node examples/test_streaming.js

const http = require('http');

const data = JSON.stringify({
  model: "gpt-4o",
  input: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Tell me a short story about a cat"
        }
      ]
    }
  ],
  stream: true,
  mockType: "fixed",
  mockFixedContents: "Once upon a time, there was a clever cat named Whiskers who loved to explore the neighborhood and make new friends."
});

const options = {
  hostname: 'localhost',
  port: 5002,
  path: '/v1/responses',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🚀 Testing streaming responses...\n');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log('\n📡 Streaming response:\n');

  res.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    lines.forEach(line => {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          console.log('\n✅ Stream completed!\n');
        } else {
          try {
            const parsed = JSON.parse(data);
            if (parsed.output?.[0]?.content?.[0]?.text) {
              process.stdout.write(parsed.output[0].content[0].text);
            }
          } catch (e) {
            // Ignore parse errors for partial chunks
          }
        }
      }
    });
  });

  res.on('end', () => {
    console.log('🎉 Response stream ended');
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
  console.log('Make sure MockAI is running on port 5002');
  process.exit(1);
});

req.write(data);
req.end();

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\n⏰ Test timed out - make sure MockAI is running');
  process.exit(1);
}, 10000);
