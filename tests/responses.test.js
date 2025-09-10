const request = require("supertest");
const { setupApp } = require("../index");

let app;

beforeAll(async () => {
  app = await setupApp();
});

describe("Responses API", () => {
  describe("POST /v1/responses", () => {
    it("should return 400 if model is missing", async () => {
      const response = await request(app)
        .post("/v1/responses")
        .send({
          input: [{ role: "user", content: [{ type: "text", text: "Hello" }] }]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("model");
    });

    it("should return 400 if input is missing", async () => {
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("input");
    });

    it("should return 400 if input is not an array", async () => {
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: "not an array"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("input");
    });

    it("should return 400 if stream is not a boolean", async () => {
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
          stream: "not a boolean"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("stream");
    });

    it("should return a valid response for basic request", async () => {
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Hello, how are you?" }] }]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("object", "response");
      expect(response.body).toHaveProperty("created");
      expect(response.body).toHaveProperty("model", "gpt-4o");
      expect(response.body).toHaveProperty("output");
      expect(response.body).toHaveProperty("usage");
      
      expect(Array.isArray(response.body.output)).toBe(true);
      expect(response.body.output[0]).toHaveProperty("role", "assistant");
      expect(response.body.output[0]).toHaveProperty("content");
      expect(Array.isArray(response.body.output[0].content)).toBe(true);
      expect(response.body.output[0].content[0]).toHaveProperty("type", "text");
      expect(response.body.output[0].content[0]).toHaveProperty("text");
    });

    it("should echo input when mockType is echo", async () => {
      const inputText = "Echo this message";
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: inputText }] }],
          mockType: "echo"
        });

      expect(response.status).toBe(200);
      expect(response.body.output[0].content[0].text).toBe(inputText);
    });

    it("should return fixed content when mockType is fixed", async () => {
      const fixedContent = "This is fixed content";
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
          mockType: "fixed",
          mockFixedContents: fixedContent
        });

      expect(response.status).toBe(200);
      expect(response.body.output[0].content[0].text).toBe(fixedContent);
    });

    it("should include previous_response_id when provided", async () => {
      const previousId = "resp_previous123";
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
          previous_response_id: previousId
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("previous_response_id", previousId);
    });

    it("should handle tools parameter", async () => {
      const tools = [
        {
          type: "function",
          function: {
            name: "search_web",
            description: "Search the web for information"
          }
        }
      ];

      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Search for cats" }] }],
          tools: tools
        });

      expect(response.status).toBe(200);
      expect(response.body.output[0]).toHaveProperty("content");
      
      // Response might include tool calls (50% chance in implementation)
      const content = response.body.output[0].content;
      expect(Array.isArray(content)).toBe(true);
      expect(content[0]).toHaveProperty("type", "text");
    });

    it("should handle streaming response", async () => {
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Hi" }] }], // Short input
          stream: true,
          mockType: "fixed",
          mockFixedContents: "Short response" // Short response to minimize streaming time
        });

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("text/event-stream");
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["connection"]).toBe("keep-alive");
      
      // Check that we get streaming data
      expect(response.text).toContain("data:");
      expect(response.text).toContain("response.chunk");
      expect(response.text).toContain("[DONE]");
    }, 3000); // 3 second timeout should be enough for short response

    it("should handle custom delay header", async () => {
      const startTime = Date.now();
      const response = await request(app)
        .post("/v1/responses")
        .set("x-set-response-delay-ms", "100")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Hello" }] }]
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it("should validate modality parameter", async () => {
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
          modality: "invalid_modality"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("modality");
    });

    it("should include reasoning for GPT-4 models", async () => {
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Hello" }] }]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("reasoning");
      expect(response.body.reasoning).toHaveProperty("summary");
      expect(response.body.reasoning).toHaveProperty("steps");
    });

    it("should handle built-in tools", async () => {
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Search for information about cats" }] }],
          tools: ["web_search", "file_search"]
        });

      expect(response.status).toBe(200);
      expect(response.body.output[0]).toHaveProperty("content");
    });

    it("should include metadata when provided", async () => {
      const metadata = { user_id: "test123", session_id: "session456" };
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
          metadata: metadata
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("metadata", metadata);
    });

    it("should include modality in response", async () => {
      const response = await request(app)
        .post("/v1/responses")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
          modality: "text"
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("modality", "text");
    });
  });

  describe("Background Processing", () => {
    it("should accept background processing requests", async () => {
      const response = await request(app)
        .post("/v1/responses/background")
        .send({
          model: "gpt-4o",
          input: [{ role: "user", content: [{ type: "text", text: "Long running task" }] }]
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("object", "background_response");
      expect(response.body).toHaveProperty("status", "processing");
    });

    it("should return job status for background requests", async () => {
      const jobId = "bg_test123";
      const response = await request(app)
        .get(`/v1/responses/background/${jobId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", jobId);
      expect(response.body).toHaveProperty("object", "background_response");
      expect(response.body).toHaveProperty("status");
    });
  });
});
