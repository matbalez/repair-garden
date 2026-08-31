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
  maskedFieldDifference,
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

test("repair changes only cells in the damaged region", () => {
  const lab = createGardenLab(23);
  const branchId = lab.rootBranchId;
  const before = lab.branch(branchId).headState;
  lab.intervene(branchId, "wound", wound);
  const wounded = lab.branch(branchId).headState;

  for (let step = 0; step < 48; step += 1) {
    lab.step(branchId, { alpha: 0.25 });
  }

  const repaired = lab.branch(branchId).headState;
  for (let index = 0; index < repaired.body.length; index += 1) {
    if ((wounded.woundMask[index] ?? 0) === 0) {
      assert.equal(repaired.body[index], before.body[index]);
    }
  }
});

test("matched motes diverge only after a selective hidden-state perturbation", () => {
  const lab = createGardenLab(29);
  const right = lab.rootBranchId;
  const left = lab.fork(right, { label: "Left treatment" });

  for (const branchId of [left, right]) {
    lab.intervene(branchId, "wound", wound);
  }
  for (let step = 0; step < 48; step += 1) {
    lab.step(left, { alpha: 0.25 });
    lab.step(right, { alpha: 0.25 });
  }
  const matchedLeft = lab.branch(left).headState;
  const matchedRight = lab.branch(right).headState;
  assert.equal(fieldDifference(matchedLeft.body, matchedRight.body), 0);
  assert.equal(matchedLeft.iteration, matchedRight.iteration);

  lab.intervene(left, "rewrite-target", { shape: "bloom" });
  const beforeLeft = lab.branch(left).headState;
  const beforeRight = lab.branch(right).headState;
  assert.equal(fieldDifference(beforeLeft.body, beforeRight.body), 0);
  assert.ok(fieldDifference(beforeLeft.target, beforeRight.target) > 0.05);
  assert.equal(beforeLeft.targetShape, "bloom");
  assert.equal(beforeRight.targetShape, "mote");
  assert.equal(beforeLeft.targetLocked, true);
  assert.equal(beforeRight.targetLocked, true);

  lab.intervene(left, "wound", wound);
  lab.intervene(right, "wound", wound);
  const woundedLeft = lab.branch(left).headState;
  const woundedRight = lab.branch(right).headState;
  assert.equal(fieldDifference(woundedLeft.body, woundedRight.body), 0);

  for (let step = 0; step < 48; step += 1) {
    lab.step(left, { alpha: 0.25 });
    lab.step(right, { alpha: 0.25 });
  }

  const afterLeft = lab.branch(left).headState;
  const afterRight = lab.branch(right).headState;
  assert.ok(fieldDifference(afterLeft.body, afterRight.body) > 0.002);
  assert.ok(
    maskedFieldDifference(
      afterLeft.body,
      afterRight.body,
      afterLeft.woundMask,
      afterRight.woundMask,
    ) > 0.1,
  );

  for (let index = 0; index < afterLeft.body.length; index += 1) {
    if (
      (afterLeft.woundMask[index] ?? 0) === 0 &&
      (afterRight.woundMask[index] ?? 0) === 0
    ) {
      assert.equal(afterLeft.body[index], beforeLeft.body[index]);
      assert.equal(afterRight.body[index], beforeRight.body[index]);
    }
  }
});
