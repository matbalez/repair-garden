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
