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
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const {
  createGardenLab,
  fieldDifference,
  gardenMetrics,
} = await vite.ssrLoadModule("/lib/garden-model.ts");

const wound = {
  points: [
    { x: 39, y: 13 },
    { x: 39, y: 16 },
    { x: 40, y: 19 },
    { x: 40, y: 22 },
  ],
  radius: 4.4,
};

test("a visible wound reduces over deterministic repair steps", () => {
  const lab = createGardenLab(17);
  const rootBranchId = lab.rootBranchId;
  lab.intervene(rootBranchId, "wound", wound);
  const woundedError = gardenMetrics(lab.branch(rootBranchId).headState).error;

  for (let step = 0; step < 42; step += 1) {
    lab.step(rootBranchId, { alpha: 0.25 });
  }

  const repairedError = gardenMetrics(lab.branch(rootBranchId).headState).error;
  assert.ok(repairedError < woundedError * 0.55);
  assert.equal(lab.replay(rootBranchId).verifiedEvents, 43);
});

test("counterfactual twins can share a visible body and diverge later", () => {
  const lab = createGardenLab(29);
  const original = lab.rootBranchId;
  const signalledHistory = lab.fork(original, { label: "Signalled history" });

  lab.intervene(signalledHistory, "rewrite-target", { shape: "bloom" });
  const beforeLeft = lab.branch(signalledHistory).headState;
  const beforeRight = lab.branch(original).headState;
  assert.equal(fieldDifference(beforeLeft.body, beforeRight.body), 0);
  assert.ok(fieldDifference(beforeLeft.target, beforeRight.target) > 0.05);

  lab.intervene(signalledHistory, "wound", wound);
  lab.intervene(original, "wound", wound);
  for (let step = 0; step < 48; step += 1) {
    lab.step(signalledHistory, { alpha: 0.25 });
    lab.step(original, { alpha: 0.25 });
  }

  const afterLeft = lab.branch(signalledHistory).headState;
  const afterRight = lab.branch(original).headState;
  assert.ok(fieldDifference(afterLeft.body, afterRight.body) > 0.03);
  assert.equal(lab.compare(signalledHistory, original).commonTick, 0);
});
