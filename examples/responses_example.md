# OpenAI Responses API - MockAI Implementation

## Overview

The new `responses.js` file implements OpenAI's modern Responses API, which combines the simplicity of Chat Completions with enhanced tool-use capabilities. This API is designed for building agentic applications.

## Endpoint

**POST** `/v1/responses`

## Key Features

✅ **Modern API Design** - Latest OpenAI API structure  
✅ **Built-in Tools** - Web search, file search, code interpreter support  
✅ **Custom Function Tools** - User-defined function calling  
✅ **Streaming Support** - Real-time response streaming  
✅ **Background Processing** - Async job processing with status tracking  
✅ **Reasoning Summaries** - Mock chain-of-thought explanations  
✅ **Multi-modal Support** - Text, audio, and image modalities  
✅ **Conversation Context** - Supports `previous_response_id` for continuity  
✅ **Flexible Input** - Structured input format with role-based content  
✅ **Enhanced Validation** - Comprehensive parameter validation  
✅ **Metadata Support** - Custom metadata in requests and responses  

## Request Format

```json
{
  "model": "gpt-4o",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What's the weather like today?"
        }
      ]
    }
  ],
  "stream": false,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get current weather information"
      }
    }
  ],
  "previous_response_id": "resp_abc123"
}
```

## Response Format

```json
{
  "id": "resp_xyz789",
  "object": "response",
  "created": 1694563200,
  "model": "gpt-4o",
  "output": [
    {
      "role": "assistant",
      "content": [
        {
          "type": "text",
          "text": "I'll check the weather for you."
        },
        {
          "type": "tool_call",
          "id": "call_abc123",
          "function": {
            "name": "get_weather",
            "arguments": "{\"location\": \"current\"}"
          }
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 25,
    "output_tokens": 50,
    "total_tokens": 75
  },
  "previous_response_id": "resp_abc123"
}
```

## Examples

### Basic Usage

```bash
curl -X POST http://localhost:5002/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "input": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Hello, how can you help me today?"
          }
        ]
      }
    ]
  }'
```

### With Tools

```bash
curl -X POST http://localhost:5002/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "input": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Search for information about artificial intelligence"
          }
        ]
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "web_search",
          "description": "Search the web for information"
        }
      }
    ]
  }'
```

### Streaming Response

```bash
curl -X POST http://localhost:5002/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "input": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Tell me a story"
          }
        ]
      }
    ],
    "stream": true
  }'
```

### Echo Mode (for testing)

```bash
curl -X POST http://localhost:5002/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "input": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "This message should be echoed back"
          }
        ]
      }
    ],
    "mockType": "echo"
  }'
```

### Fixed Response

```bash
curl -X POST http://localhost:5002/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "input": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Any question"
          }
        ]
      }
    ],
    "mockType": "fixed",
    "mockFixedContents": "This is a predefined response for testing"
  }'
```

### With Response Delay

```bash
curl -X POST http://localhost:5002/v1/responses \
  -H "Content-Type: application/json" \
  -H "x-set-response-delay-ms: 2000" \
  -d '{
    "model": "gpt-4o",
    "input": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "This response will be delayed by 2 seconds"
          }
        ]
      }
    ]
  }'
```

## MockAI-Specific Features

### Mock Types

- **`random`** (default): Returns random content from `data/contents.txt`
- **`echo`**: Echoes back the input text
- **`fixed`**: Returns custom content specified in `mockFixedContents`

### Tool Call Simulation

When tools are provided, MockAI has a 50% chance of generating mock tool calls in the response, simulating realistic tool usage patterns.

## Integration with OpenAI SDKs

The Responses API endpoint works seamlessly with OpenAI SDKs by changing the base URL:

### Python
```python
import openai

client = openai.OpenAI(
    api_key="mock-key",
    base_url="http://localhost:5002/v1"
)

# Note: This is a conceptual example - actual SDK support may vary
response = client.responses.create(
    model="gpt-4o",
    input=[
        {
            "role": "user",
            "content": [{"type": "text", "text": "Hello!"}]
        }
    ]
)
```

### Node.js
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'mock-key',
  baseURL: 'http://localhost:5002/v1'
});

// Note: This is a conceptual example - actual SDK support may vary
const response = await openai.responses.create({
  model: 'gpt-4o',
  input: [
    {
      role: 'user',
      content: [{ type: 'text', text: 'Hello!' }]
    }
  ]
});
```

## Differences from Chat Completions

| **Responses API** | **Chat Completions API** |
|-------------------|---------------------------|
| `input` array | `messages` array |
| `output` array | `choices` array |
| Structured content types | Simple message content |
| Built-in tool support | Tool support via function calling |
| `previous_response_id` | No built-in conversation linking |

## Use Cases

1. **Agent Development** - Building AI agents with tool capabilities
2. **Conversational AI** - Multi-turn conversations with context
3. **Tool Integration** - Applications that need function calling
4. **Streaming Applications** - Real-time response streaming
5. **Testing & Development** - Mock responses for development workflows

The Responses API represents the future direction of OpenAI's API design, focusing on agent-based interactions and structured tool usage.
