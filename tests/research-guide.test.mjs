import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

after(async () => {
  await vite.close();
});

test("the guide corpus distinguishes target rewriting from learning", async () => {
  const { RESEARCH_GUIDE_INSTRUCTIONS } = await vite.ssrLoadModule(
    "/lib/research-guide.ts",
  );

  assert.match(RESEARCH_GUIDE_INSTRUCTIONS, /implements no learning rule/i);
  assert.match(RESEARCH_GUIDE_INSTRUCTIONS, /directly rewrites/i);
  assert.match(RESEARCH_GUIDE_INSTRUCTIONS, /stronger ontological claim remains unproven/i);
  assert.match(RESEARCH_GUIDE_INSTRUCTIONS, /distributed\s+attractor/i);
  assert.match(RESEARCH_GUIDE_INSTRUCTIONS, /avoid canned contrast formulas/i);
  assert.match(RESEARCH_GUIDE_INSTRUCTIONS, /Bilobe, or Crescent/i);
  assert.match(RESEARCH_GUIDE_INSTRUCTIONS, /continuous display layer/i);
});

test("the guide endpoint fails clearly when no model connection exists", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const { POST } = await vite.ssrLoadModule("/app/api/guide/route.ts");
    const response = await POST(
      new Request("http://localhost/api/guide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Is Mote learning?" }],
        }),
      }),
    );
    assert.equal(response.status, 503);
    assert.match(await response.text(), /not been configured/i);
  } finally {
    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
  }
});

test("the guide sends experiment context and returns model text", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  let sentBody;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(init.headers.Authorization, "Bearer test-key");
    sentBody = JSON.parse(init.body);
    return Response.json({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "Mote is not learning." }],
        },
      ],
    });
  };

  try {
    const { POST } = await vite.ssrLoadModule("/app/api/guide/route.ts");
    const response = await POST(
      new Request("http://localhost/api/guide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Is this learning?" }],
          context: {
            stage: "perturbed",
            visibleDifference: 0,
            regionalDifference: 0,
            targetDifference: 0.27,
            leftTarget: "bloom",
            rightTarget: "mote",
            repairScope: "damaged region only",
            protocolMatched: true,
          },
        }),
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { reply: "Mote is not learning." });
    assert.match(sentBody.instructions, /Stage: perturbed/);
    assert.match(sentBody.instructions, /Hidden target difference: 27%/);
    assert.match(sentBody.instructions, /Regeneration difference inside the shared lesion: 0%/);
    assert.match(sentBody.instructions, /Repair update scope: damaged region only/);
    assert.equal(sentBody.store, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
    else delete process.env.OPENAI_API_KEY;
  }
});

test("the guide rejects oversized request bodies before contacting the model", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return Response.json({ output_text: "Unexpected" });
  };

  try {
    const { POST } = await vite.ssrLoadModule("/app/api/guide/route.ts");
    const response = await POST(
      new Request("http://localhost/api/guide", {
        method: "POST",
        headers: {
          "content-length": "70000",
          "content-type": "application/json",
          "fly-client-ip": "203.0.113.8",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "A short question" }],
        }),
      }),
    );

    assert.equal(response.status, 413);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
    else delete process.env.OPENAI_API_KEY;
  }
});

test("the guide rate-limits repeated questions from one public address", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async () =>
    Response.json({ output_text: "A concise answer." });

  try {
    const { POST } = await vite.ssrLoadModule("/app/api/guide/route.ts");
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await POST(
        new Request("http://localhost/api/guide", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "fly-client-ip": "203.0.113.9",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: `Question ${attempt + 1}` }],
          }),
        }),
      );
      assert.equal(response.status, 200);
    }

    const limited = await POST(
      new Request("http://localhost/api/guide", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "fly-client-ip": "203.0.113.9",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "One question too many" }],
        }),
      }),
    );

    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
    else delete process.env.OPENAI_API_KEY;
  }
});
