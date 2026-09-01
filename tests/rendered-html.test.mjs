import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("renders the Repair Garden experiment shell", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>Repair Garden<\/title>/i);
  assert.match(html, /Two Motes\. One history\./i);
  assert.match(html, /hidden-state perturbation experiment/i);
  assert.match(html, /next_target_shape/i);
  assert.match(html, /Wound both at a random site/i);
  assert.match(html, /Garden Guide/i);
  assert.match(html, /Paper-grounded science companion/i);
  assert.match(html, /Ask the Garden Guide/i);
  assert.doesNotMatch(html, /Same recorded protocol/i);
});

test("the treatment control exposes both alternative target shapes", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../app/repair-garden.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(source, /<SelectItem value="bloom">Bloom<\/SelectItem>/);
  assert.match(source, /<SelectItem value="twin">Twin<\/SelectItem>/);
  assert.match(source, /\[showTarget, setShowTarget\] = useState\(true\)/);
  assert.match(source, /scrollTo\(\{ top: panel\.scrollHeight/);
});
