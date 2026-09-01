import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test("renders the Repair Garden experiment shell", async () => {
  const port = await freePort();
  const server = spawn(process.execPath, ["dist/standalone/server.js"], {
    cwd: root,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk;
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk;
  });

  let response;
  try {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/`, {
          headers: { accept: "text/html" },
        });
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    assert.ok(response, `Standalone server did not start. ${serverOutput}`);

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
    assert.match(html, /Click to wound both Motes at this location/i);
    assert.match(html, /Garden Guide/i);
    assert.match(html, /Ask the Garden Guide/i);
    assert.doesNotMatch(html, /Same recorded protocol/i);
    assert.doesNotMatch(html, /Scope of the model/i);
    assert.doesNotMatch(html, /Distinct from visible tissue/i);
    assert.doesNotMatch(html, /Paper-grounded science companion/i);
    assert.doesNotMatch(html, /Live context/i);
    assert.doesNotMatch(html, /Enter sends/i);
    assert.doesNotMatch(html, /Causal design/i);
    assert.doesNotMatch(html, /Model boundary/i);
  } finally {
    server.kill("SIGTERM");
  }
});

test("the treatment control exposes three alternative target shapes", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../app/repair-garden.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(source, /<SelectItem value="bloom">Bloom<\/SelectItem>/);
  assert.match(source, /<SelectItem value="bilobe">Bilobe<\/SelectItem>/);
  assert.match(source, /<SelectItem value="crescent">Crescent<\/SelectItem>/);
  assert.doesNotMatch(source, /Twin/);
  assert.match(source, /\[showTarget, setShowTarget\] = useState\(true\)/);
  assert.match(source, /scrollTo\(\{ top: panel\.scrollHeight/);
  assert.match(source, /window\.requestAnimationFrame\(draw\)/);
  assert.match(source, /prefers-reduced-motion/);
});
