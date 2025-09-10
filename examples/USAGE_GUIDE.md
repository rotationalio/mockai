# MockAI Usage Guide

## 🚀 How to Use MockAI as OpenAI API Replacement

Since you have MockAI running on port 5002, you can use it as a drop-in replacement for the OpenAI API by simply changing the base URL in your applications.

## 🔧 Quick Setup

### For OpenAI Python Library
```python
import openai

# Instead of using the real OpenAI API
# openai.api_base = "https://api.openai.com/v1"

# Use your local MockAI server
openai.api_base = "http://localhost:5002/v1"
openai.api_key = "mock-api-key"  # Any string works for mock

# Now use OpenAI library normally
response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### For OpenAI Node.js Library
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'mock-api-key', // Any string works for mock
  baseURL: 'http://localhost:5002/v1', // Your MockAI server
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### For cURL/HTTP Requests
```bash
curl -X POST http://localhost:5002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 📋 Available Endpoints

MockAI supports all major OpenAI API endpoints:

### 💬 Chat Completions
- **Endpoint**: `POST /v1/chat/completions`
- **Supports**: Regular and streaming responses
- **Example**:
```bash
curl -X POST http://localhost:5002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Tell me a joke"}],
    "stream": false
  }'
```

### 📝 Text Completions (Legacy)
- **Endpoint**: `POST /v1/completions`
- **Example**:
```bash
curl -X POST http://localhost:5002/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-davinci-003",
    "prompt": "Once upon a time",
    "max_tokens": 50
  }'
```

### 🖼️ Image Generation
- **Endpoint**: `POST /v1/images/generations`
- **Example**:
```bash
curl -X POST http://localhost:5002/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A sunset over mountains",
    "n": 1,
    "size": "1024x1024"
  }'
```

### 🔊 Audio
- **Text-to-Speech**: `POST /v1/audio/speech`
- **Speech-to-Text**: `POST /v1/audio/transcriptions`
- **Translation**: `POST /v1/audio/translations`

### 📊 Embeddings
- **Endpoint**: `POST /v1/embeddings`
- **Example**:
```bash
curl -X POST http://localhost:5002/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-ada-002",
    "input": "Hello world"
  }'
```

### 🤖 Models
- **List Models**: `GET /v1/models`
- **Get Model**: `GET /v1/models/{model_id}`

### 🛡️ Moderation
- **Endpoint**: `POST /v1/moderations`

### 📁 File Management
- **Upload**: `POST /v1/files`
- **List**: `GET /v1/files`
- **Retrieve**: `GET /v1/files/{file_id}`
- **Delete**: `DELETE /v1/files/{file_id}`

### 🎯 Fine-tuning
- **Create Job**: `POST /v1/fine_tuning/jobs`
- **List Jobs**: `GET /v1/fine_tuning/jobs`
- **Get Job**: `GET /v1/fine_tuning/jobs/{job_id}`

### 📦 Batch Processing
- **Create Batch**: `POST /v1/batch`
- **Get Batch**: `GET /v1/batch/{batch_id}`
- **Cancel Batch**: `POST /v1/batch/{batch_id}/cancel`

## ⚙️ Configuration Options

### Mock Response Types
You can control how MockAI responds by setting the `mockType` in your request:

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [{"role": "user", "content": "Hello!"}],
  "mockType": "random",  // Options: "random", "echo", "fixed"
  "mockFixedContents": "This is a fixed response"  // Only used with "fixed"
}
```

- **`random`**: Returns random content from the mock data file
- **`echo`**: Echoes back your input
- **`fixed`**: Returns the content you specify in `mockFixedContents`

### Environment Variables
Create a `.env` file in your MockAI directory:

```env
SERVER_PORT=5002
MOCK_TYPE=random
MOCK_FILE_PATH=data/contents.txt
MOCK_FILE_SEPARATOR="@@@@"
RESPONSE_DELAY_MS=0
REQUEST_SIZE_LIMIT=10kb
```

### Custom Response Delay
Add delay to responses using headers:

```bash
curl -X POST http://localhost:5002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-set-response-delay-ms: 2000" \
  -d '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "Hello!"}]}'
```

## 🔄 Streaming Responses

MockAI supports streaming just like the real OpenAI API:

```python
import openai

openai.api_base = "http://localhost:5002/v1"
openai.api_key = "mock-api-key"

response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.get("content"):
        print(chunk.choices[0].delta.content, end="")
```

## 📈 Monitoring & Metrics

- **Health Check**: `GET http://localhost:5002/`
- **Prometheus Metrics**: `GET http://localhost:5002/metrics`

## 🔧 Integration Examples

### Replace OpenAI in Existing Apps
1. **Environment Variable Method**:
   ```bash
   export OPENAI_API_BASE=http://localhost:5002/v1
   export OPENAI_API_KEY=mock-api-key
   ```

2. **Code Modification**:
   Just change the base URL in your existing OpenAI client configuration.

### Docker Integration
If you're using Docker, you can run MockAI alongside your application:

```yaml
version: '3.8'
services:
  mockai:
    build: .
    ports:
      - "5002:5002"
    environment:
      - SERVER_PORT=5002
      - MOCK_TYPE=random
  
  your-app:
    build: ./your-app
    environment:
      - OPENAI_API_BASE=http://mockai:5002/v1
      - OPENAI_API_KEY=mock-api-key
    depends_on:
      - mockai
```

## 🎯 Use Cases

1. **Development**: Test your app without hitting OpenAI rate limits or costs
2. **CI/CD**: Run tests that depend on OpenAI API without external dependencies
3. **Offline Development**: Work on AI features when internet is limited
4. **Load Testing**: Test how your app handles various response patterns
5. **Integration Testing**: Simulate different API responses and error conditions

## 🚨 Important Notes

- MockAI doesn't require a real OpenAI API key - any string works
- Responses are mock data, not real AI-generated content
- All OpenAI SDK features should work transparently
- Perfect for development, testing, and prototyping

Start using MockAI by simply pointing your OpenAI client to `http://localhost:5002/v1` instead of the real OpenAI API!
