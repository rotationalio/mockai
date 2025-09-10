const express = require("express");
const { getRandomContents } = require("../utils/randomContents");
const { tokenize } = require("../utils/tokenize");
const delay = require("../utils/delay");
const { requestCounter, requestLatency, payloadSize } = require("../utils/metrics");

const router = express.Router();

// Background mode endpoint for async processing
router.post("/v1/responses/background", async (req, res) => {
  const then = Date.now();
  const { model, input, tools, instructions } = req.body;

  // Validate required fields for background mode
  if (!model || !input) {
    return res.status(400).json({ error: 'Missing required fields for background processing' });
  }

  // Generate a background job ID
  const jobId = `bg_${Math.random().toString(36).substr(2, 12)}`;
  
  // Return immediate response with job ID
  const backgroundResponse = {
    id: jobId,
    object: "background_response",
    status: "processing",
    created: Math.floor(Date.now() / 1000),
    model: model,
    estimated_completion_time: Math.floor(Date.now() / 1000) + 60 // 1 minute from now
  };

  requestCounter.inc({ method: "POST", path: "/v1/responses/background", status: 202 });
  requestLatency.observe({ method: "POST", path: "/v1/responses/background", status: 202 }, (Date.now() - then));
  payloadSize.observe({ method: "POST", path: "/v1/responses/background", status: 202 }, req.socket.bytesRead);

  res.status(202).json(backgroundResponse);
});

// Get background job status
router.get("/v1/responses/background/:job_id", async (req, res) => {
  const { job_id } = req.params;
  
  // Mock job status response
  const jobStatus = {
    id: job_id,
    object: "background_response",
    status: Math.random() > 0.3 ? "completed" : "processing", // 70% chance completed
    created: Math.floor(Date.now() / 1000) - 30, // 30 seconds ago
    completed_at: Math.random() > 0.3 ? Math.floor(Date.now() / 1000) : null,
    result: Math.random() > 0.3 ? {
      id: `resp_${Math.random().toString(36).substr(2, 9)}`,
      object: "response",
      output: [
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text: "This is a mock background processing result."
            }
          ]
        }
      ]
    } : null
  };

  res.json(jobStatus);
});

router.post("/v1/responses", async (req, res) => {
  const then = Date.now();
  const delayHeader = req.headers["x-set-response-delay-ms"];

  // delay if header is present. Else fallback to environment Variable
  let delayTime = parseInt(delayHeader) || parseInt(process.env.RESPONSE_DELAY_MS) || 0;

  await delay(delayTime);
  const defaultMockType = process.env.MOCK_TYPE || "random";
  const {
    model,
    input,
    previous_response_id,
    stream,
    tools,
    tool_choice,
    instructions,
    modality = "text",
    response_format,
    max_completion_tokens,
    temperature,
    top_p,
    metadata,
    mockType = defaultMockType,
    mockFixedContents,
  } = req.body;
  const randomResponses = getRandomContents();

  // Validate required fields
  if (!model) {
    requestCounter.inc({ method: "POST", path: "/v1/responses", status: 400 });
    requestLatency.observe({ method: "POST", path: "/v1/responses", status: 400 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/responses", status: 400 }, req.socket.bytesRead);
    return res
      .status(400)
      .json({ error: 'Missing or invalid "model" in request body' });
  }

  if (!input || !Array.isArray(input)) {
    requestCounter.inc({ method: "POST", path: "/v1/responses", status: 400 });
    requestLatency.observe({ method: "POST", path: "/v1/responses", status: 400 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/responses", status: 400 }, req.socket.bytesRead);
    return res
      .status(400)
      .json({ error: 'Missing or invalid "input" in request body. Must be an array.' });
  }

  // Check if 'stream' is a boolean
  if (stream !== undefined && typeof stream !== "boolean") {
    requestCounter.inc({ method: "POST", path: "/v1/responses", status: 400 });
    requestLatency.observe({ method: "POST", path: "/v1/responses", status: 400 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/responses", status: 400 }, req.socket.bytesRead);
    return res.status(400).json({ error: 'Invalid "stream" in request body' });
  }

  // Validate modality
  if (modality && !["text", "audio", "image"].includes(modality)) {
    requestCounter.inc({ method: "POST", path: "/v1/responses", status: 400 });
    requestLatency.observe({ method: "POST", path: "/v1/responses", status: 400 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/responses", status: 400 }, req.socket.bytesRead);
    return res.status(400).json({ error: 'Invalid "modality" in request body. Must be "text", "audio", or "image"' });
  }

  // Get response content
  let content;
  switch (mockType) {
    case "echo":
      // Echo the last input message content
      const lastInput = input[input.length - 1];
      content = lastInput?.content?.[0]?.text || "No text content found";
      break;
    case "random":
      content = randomResponses[Math.floor(Math.random() * randomResponses.length)];
      break;
    case "fixed":
      content = mockFixedContents;
      break;
    default:
      content = randomResponses[Math.floor(Math.random() * randomResponses.length)];
  }

  // Generate mock tool calls if tools are provided
  const shouldUseTool = tools && tools.length > 0 && Math.random() > 0.5; // 50% chance to use tools
  let toolCalls = [];
  
  if (shouldUseTool) {
    const randomTool = tools[Math.floor(Math.random() * tools.length)];
    
    // Handle built-in tools vs custom functions
    if (typeof randomTool === "string") {
      // Built-in tools (web_search, file_search, code_interpreter)
      toolCalls = [
        {
          id: `call_${Math.random().toString(36).substr(2, 9)}`,
          type: randomTool,
          [randomTool]: generateBuiltInToolCall(randomTool, input)
        }
      ];
    } else if (randomTool.function) {
      // Custom function tools
      toolCalls = [
        {
          id: `call_${Math.random().toString(36).substr(2, 9)}`,
          type: "function",
          function: {
            name: randomTool.function.name,
            arguments: JSON.stringify(generateFunctionArguments(randomTool.function, input))
          }
        }
      ];
    }
  }

  // Helper function to generate built-in tool calls
  function generateBuiltInToolCall(toolType, input) {
    const lastInputText = input[input.length - 1]?.content?.[0]?.text || "";
    
    switch (toolType) {
      case "web_search":
        return {
          query: lastInputText.substring(0, 100) || "search query"
        };
      case "file_search":
        return {
          query: lastInputText.substring(0, 100) || "file search query",
          max_results: 10
        };
      case "code_interpreter":
        return {
          code: `# Mock code based on: ${lastInputText}\nprint("Mock execution result")`
        };
      default:
        return {};
    }
  }

  // Helper function to generate function arguments
  function generateFunctionArguments(functionDef, input) {
    const lastInputText = input[input.length - 1]?.content?.[0]?.text || "";
    
    // Generate mock arguments based on function parameters
    const mockArgs = {};
    if (functionDef.parameters?.properties) {
      Object.keys(functionDef.parameters.properties).forEach(param => {
        const paramDef = functionDef.parameters.properties[param];
        switch (paramDef.type) {
          case "string":
            mockArgs[param] = lastInputText.substring(0, 50) || "mock string";
            break;
          case "number":
            mockArgs[param] = Math.floor(Math.random() * 100);
            break;
          case "boolean":
            mockArgs[param] = Math.random() > 0.5;
            break;
          case "array":
            mockArgs[param] = ["mock", "array", "values"];
            break;
          default:
            mockArgs[param] = "mock value";
        }
      });
    }
    
    return mockArgs;
  }

  // Generate a mock response
  if (stream) {
    // Set the headers for Server-Sent Events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const responseId = `resp_${Math.random().toString(36).substr(2, 9)}`;
    
    const data = {
      id: responseId,
      object: "response.chunk",
      created: Math.floor(Date.now() / 1000),
      model: model,
      output: [
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text: ""
            }
          ]
        }
      ]
    };

    const intervalTime = 50; // Faster streaming for tests
    let chunkIndex = 0;
    let tokens = tokenize(content);
    let intervalId;
    
    // Handle connection close
    req.on('close', () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    });

    const sendChunk = () => {
      try {
        if (chunkIndex < tokens.length) {
          data.output[0].content[0].text = tokens[chunkIndex];
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          chunkIndex++;
        } else {
          // Clear interval first
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          
          // Send final chunk with tool calls if any
          if (toolCalls.length > 0) {
            data.output[0].content = [
              {
                type: "text",
                text: content
              },
              ...toolCalls.map(call => ({
                type: "tool_call",
                id: call.id,
                function: call.function
              }))
            ];
            res.write(`data: ${JSON.stringify(data)}\n\n`);
          }
          
          res.write(`data: [DONE]\n\n`);
          
          requestCounter.inc({ method: "POST", path: "/v1/responses", status: 200 });
          requestLatency.observe({ method: "POST", path: "/v1/responses", status: 200 }, (Date.now() - then));
          payloadSize.observe({ method: "POST", path: "/v1/responses", status: 200 }, req.socket.bytesRead);

          res.end();
        }
      } catch (error) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        if (!res.headersSent) {
          res.status(500).json({ error: 'Streaming error' });
        }
      }
    };
    
    intervalId = setInterval(sendChunk, intervalTime);
  } else {
    // Non-streaming response
    const responseId = `resp_${Math.random().toString(36).substr(2, 9)}`;
    
    let outputContent = [
      {
        type: "text",
        text: content
      }
    ];

    // Add tool calls to output if generated
    if (toolCalls.length > 0) {
      outputContent = [
        ...outputContent,
        ...toolCalls.map(call => ({
          type: "tool_call",
          id: call.id,
          function: call.function
        }))
      ];
    }

    const response = {
      id: responseId,
      object: "response",
      created: Math.floor(Date.now() / 1000),
      model: model,
      output: [
        {
          role: "assistant",
          content: outputContent
        }
      ],
      usage: {
        input_tokens: Math.floor(Math.random() * 50) + 10,
        output_tokens: Math.floor(Math.random() * 100) + 25,
        total_tokens: 0
      }
    };

    // Calculate total tokens
    response.usage.total_tokens = response.usage.input_tokens + response.usage.output_tokens;

    // Add reasoning summary if model supports it (mock feature)
    if (model.includes("gpt-4") || model.includes("gpt-5")) {
      response.reasoning = {
        summary: "Mock reasoning: The model analyzed the input and generated an appropriate response based on the context provided.",
        steps: [
          "Analyzed user input for intent",
          "Considered available tools and context",
          "Generated appropriate response content"
        ]
      };
    }

    // Add response format if specified
    if (response_format) {
      response.response_format = response_format;
    }

    // Add metadata if provided
    if (metadata) {
      response.metadata = metadata;
    }

    // Add modality information
    response.modality = modality;

    // Add previous_response_id if provided
    if (previous_response_id) {
      response.previous_response_id = previous_response_id;
    }

    requestCounter.inc({ method: "POST", path: "/v1/responses", status: 200 });
    requestLatency.observe({ method: "POST", path: "/v1/responses", status: 200 }, (Date.now() - then));
    payloadSize.observe({ method: "POST", path: "/v1/responses", status: 200 }, req.socket.bytesRead);

    res.json(response);
  }
});

module.exports = router;
