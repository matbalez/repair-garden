import {
  createTemporalLab,
  type TemporalLab,
  type TemporalModel,
} from "@temporal-self/core";

export const GARDEN_WIDTH = 64;
export const GARDEN_HEIGHT = 48;

export type GardenShape = "mote" | "bloom" | "bilobe" | "crescent";

export interface GardenPoint {
  x: number;
  y: number;
}

export interface GardenState {
  width: number;
  height: number;
  body: Float32Array;
  target: Float32Array;
  newness: Float32Array;
  woundMask: Float32Array;
  repairMask: Float32Array;
  targetShape: GardenShape;
  targetLocked: boolean;
  iteration: number;
}

export interface GardenInput {
  alpha?: number;
}

export interface GardenOutput {
  error: number;
  mass: number;
  targetShape: GardenShape;
  summary: string;
}

export interface WoundPayload {
  points: GardenPoint[];
  radius: number;
}

export interface RewriteTargetPayload {
  shape: GardenShape;
}

export interface RandomWoundOptions {
  preferTargetDifference?: boolean;
  random?: () => number;
}

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

const smoothstep = (minimum: number, maximum: number, value: number) => {
  const scaled = clamp((value - minimum) / (maximum - minimum));
  return scaled * scaled * (3 - 2 * scaled);
};

function shapeMargin(shape: GardenShape, x: number, y: number): number {
  const angle = Math.atan2(y, x);
  const radius = Math.hypot(x, y);

  if (shape === "bloom") {
    const edge = 0.49 + 0.17 * Math.cos(6 * angle);
    return edge - radius;
  }

  if (shape === "bilobe") {
    const left = 0.48 - Math.hypot(x + 0.31, y * 1.05);
    const right = 0.48 - Math.hypot(x - 0.31, y * 1.05);
    const bridge = 0.17 - Math.hypot(x * 0.5, y * 1.7);
    return Math.max(left, right, bridge);
  }

  if (shape === "crescent") {
    const outer = 0.56 - Math.hypot(x + 0.08, y);
    const innerCutout = Math.hypot(x - 0.2, y + 0.025) - 0.44;
    return Math.min(outer, innerCutout);
  }

  const edge = 0.54 + 0.075 * Math.cos(5 * angle - 0.35);
  const lowerTaper = y > 0.32 ? (y - 0.32) * 0.23 : 0;
  return edge - lowerTaper - radius;
}

export function createTargetField(
  shape: GardenShape,
  width = GARDEN_WIDTH,
  height = GARDEN_HEIGHT,
): Float32Array {
  const field = new Float32Array(width * height);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const x = (column / (width - 1) - 0.5) * 2;
      const y = (row / (height - 1) - 0.5) * 2;
      const margin = shapeMargin(shape, x, y);
      field[row * width + column] = smoothstep(-0.045, 0.045, margin);
    }
  }
  return field;
}

export function gardenMetrics(state: GardenState): {
  error: number;
  mass: number;
} {
  let difference = 0;
  let activeRepairArea = 0;
  let bodyMass = 0;
  for (let index = 0; index < state.body.length; index += 1) {
    const body = state.body[index] ?? 0;
    const target = state.target[index] ?? 0;
    const repair = state.repairMask[index] ?? 0;
    difference += Math.abs(body - target) * repair;
    activeRepairArea += repair;
    bodyMass += body;
  }
  return {
    error: difference / Math.max(activeRepairArea, 1),
    mass: bodyMass / state.body.length,
  };
}

export function fieldDifference(
  left: Float32Array,
  right: Float32Array,
): number {
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference += Math.abs((left[index] ?? 0) - (right[index] ?? 0));
  }
  return difference / Math.max(left.length, 1);
}

export function maskedFieldDifference(
  left: Float32Array,
  right: Float32Array,
  leftMask: Float32Array,
  rightMask: Float32Array,
): number {
  let difference = 0;
  let area = 0;
  for (let index = 0; index < left.length; index += 1) {
    const mask = Math.max(leftMask[index] ?? 0, rightMask[index] ?? 0);
    difference += Math.abs((left[index] ?? 0) - (right[index] ?? 0)) * mask;
    area += mask;
  }
  return difference / Math.max(area, 1);
}

function sharedWoundCandidates(
  left: GardenState,
  right: GardenState,
) {
  const margin = 7;
  const visibleCandidates: GardenPoint[] = [];
  const revealingCandidates: GardenPoint[] = [];

  for (let row = margin; row < left.height - margin; row += 1) {
    for (let column = margin; column < left.width - margin; column += 1) {
      const index = row * left.width + column;
      const sharedTissue = Math.min(
        left.body[index] ?? 0,
        right.body[index] ?? 0,
      );
      if (sharedTissue < 0.42) continue;

      const point = { x: column, y: row };
      visibleCandidates.push(point);
      if (
        Math.abs((left.target[index] ?? 0) - (right.target[index] ?? 0)) >
        0.24
      ) {
        revealingCandidates.push(point);
      }
    }
  }

  return { margin, revealingCandidates, visibleCandidates };
}

function woundFromCenter(
  center: GardenPoint,
  width: number,
  height: number,
  margin: number,
  random: () => number,
): WoundPayload {
  const angle = clamp(random(), 0, 0.999999) * Math.PI;
  const points = [-4.5, -1.5, 1.5, 4.5].map((offset) => ({
    x: Math.round(
      clamp(center.x + Math.cos(angle) * offset, margin, width - margin - 1),
    ),
    y: Math.round(
      clamp(center.y + Math.sin(angle) * offset, margin, height - margin - 1),
    ),
  }));

  return { points, radius: 4.2 };
}

export function createRandomWound(
  left: GardenState,
  right: GardenState,
  options: RandomWoundOptions = {},
): WoundPayload {
  const random = options.random ?? Math.random;
  const { margin, revealingCandidates, visibleCandidates } =
    sharedWoundCandidates(left, right);

  const candidates =
    options.preferTargetDifference && revealingCandidates.length > 0
      ? revealingCandidates
      : visibleCandidates;
  const fallback = { x: Math.round(left.width / 2), y: Math.round(left.height / 2) };
  const unit = clamp(random(), 0, 0.999999);
  const center = candidates[Math.floor(unit * candidates.length)] ?? fallback;

  return woundFromCenter(center, left.width, left.height, margin, random);
}

export function createWoundAtPoint(
  left: GardenState,
  right: GardenState,
  point: GardenPoint,
  options: RandomWoundOptions = {},
): WoundPayload {
  const random = options.random ?? Math.random;
  const { margin, revealingCandidates, visibleCandidates } =
    sharedWoundCandidates(left, right);
  const candidates =
    options.preferTargetDifference && revealingCandidates.length > 0
      ? revealingCandidates
      : visibleCandidates;
  const fallback = { x: Math.round(left.width / 2), y: Math.round(left.height / 2) };
  const center = candidates.reduce<GardenPoint | null>((closest, candidate) => {
    if (!closest) return candidate;
    const closestDistance = Math.hypot(closest.x - point.x, closest.y - point.y);
    const candidateDistance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    return candidateDistance < closestDistance ? candidate : closest;
  }, null) ?? fallback;

  return woundFromCenter(center, left.width, left.height, margin, random);
}

function outputFor(state: GardenState, verb: string): GardenOutput {
  const metrics = gardenMetrics(state);
  return {
    ...metrics,
    targetShape: state.targetShape,
    summary: `${verb}. Visible tissue occupies ${Math.round(
      metrics.mass * 100,
    )}% of the dish; target mismatch is ${Math.round(metrics.error * 100)}%.`,
  };
}

function nextGardenState(state: Readonly<GardenState>, alpha: number): GardenState {
  const { width, height } = state;
  const body = new Float32Array(state.body.length);
  const newness = new Float32Array(state.newness.length);
  const repairMask = new Float32Array(state.repairMask.length);
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1] as const;

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;
      const existing = state.body[index] ?? 0;
      const repair = state.repairMask[index] ?? 0;
      if (repair < 0.001) {
        body[index] = existing;
        newness[index] = (state.newness[index] ?? 0) * 0.82;
        repairMask[index] = 0;
        continue;
      }

      let neighborhood = 0;
      let kernelIndex = 0;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (
          let columnOffset = -1;
          columnOffset <= 1;
          columnOffset += 1
        ) {
          const sampleRow = row + rowOffset;
          const sampleColumn = column + columnOffset;
          if (
            sampleRow >= 0 &&
            sampleRow < height &&
            sampleColumn >= 0 &&
            sampleColumn < width
          ) {
            neighborhood +=
              (state.body[sampleRow * width + sampleColumn] ?? 0) *
              (kernel[kernelIndex] ?? 0);
          }
          kernelIndex += 1;
        }
      }

      neighborhood /= 16;
      const target = state.target[index] ?? 0;
      const frontier = smoothstep(0.025, 0.34, neighborhood);
      const rate =
        target > existing
          ? alpha * (0.25 + frontier * 0.75)
          : alpha * 1.75;
      const next = clamp(existing + (target - existing) * rate);
      const growth = Math.max(0, next - existing);
      body[index] = next;
      newness[index] = clamp((state.newness[index] ?? 0) * 0.82 + growth * 4.8);
      repairMask[index] = Math.abs(next - target) < 0.035 ? 0 : repair;
    }
  }

  return {
    ...state,
    body,
    newness,
    repairMask,
    iteration: state.iteration + 1,
  };
}

export const gardenModel: TemporalModel<
  GardenState,
  GardenInput,
  GardenOutput
> = {
  id: "repair-garden-explicit-target",
  version: "0.1",
  initialState: () => {
    const target = createTargetField("mote");
    return {
      width: GARDEN_WIDTH,
      height: GARDEN_HEIGHT,
      body: new Float32Array(target),
      target,
      newness: new Float32Array(target.length),
      woundMask: new Float32Array(target.length),
      repairMask: new Float32Array(target.length),
      targetShape: "mote",
      targetLocked: true,
      iteration: 0,
    };
  },
  step: (state, input) => {
    const next = nextGardenState(state, input.alpha ?? 0.23);
    return {
      state: next,
      output: outputFor(next, "One developmental step completed"),
      changes: [
        {
          layer: "state",
          summary: "Local tissue densities updated",
          path: "body",
        },
      ],
    };
  },
  interventions: {
    wound: (state, payload) => {
      const wound = payload as WoundPayload;
      const body = new Float32Array(state.body);
      const newness = new Float32Array(state.newness);
      const woundMask = new Float32Array(state.body.length);
      const repairMask = new Float32Array(state.body.length);
      for (let row = 0; row < state.height; row += 1) {
        for (let column = 0; column < state.width; column += 1) {
          const index = row * state.width + column;
          const struck = wound.points.some(
            (point) =>
              Math.hypot(column - point.x, row - point.y) <= wound.radius,
          );
          if (struck && (state.body[index] ?? 0) > 0.025) {
            body[index] = 0;
            newness[index] = 0;
            woundMask[index] = 1;
            repairMask[index] = 1;
          }
        }
      }
      const next = { ...state, body, newness, woundMask, repairMask };
      return {
        state: next,
        output: outputFor(next, "A wound removed visible tissue"),
        changes: [
          {
            layer: "state",
            summary: "Visible tissue was removed",
            path: "body",
          },
        ],
      };
    },
    "rewrite-target": (state, payload) => {
      const { shape } = payload as RewriteTargetPayload;
      const next = {
        ...state,
        target: createTargetField(shape, state.width, state.height),
        targetShape: shape,
      };
      return {
        state: next,
        output: outputFor(next, "The hidden target field changed"),
        changes: [
          {
            layer: "policy",
            summary: `The engineered target field changed to ${shape}`,
            path: "target",
            before: state.targetShape,
            after: shape,
          },
        ],
      };
    },
  },
};

export type GardenLab = TemporalLab<GardenState, GardenInput, GardenOutput>;

export function createGardenLab(seed = 481516): GardenLab {
  return createTemporalLab({
    seed,
    model: gardenModel,
    manifest: {
      title: "Repair Garden: identical presents",
      question:
        "Can two organisms with the same visible anatomy follow different futures because their hidden control states differ?",
      hypothesis:
        "Changing a separable target field while holding visible anatomy fixed will redirect later repair.",
      observables: [
        "visible tissue",
        "target mismatch",
        "target-field difference",
        "branch divergence",
      ],
      controls: [
        "same starting body",
        "same wound geometry",
        "same update schedule",
        "same deterministic seed",
      ],
      kernel: {
        name: "Transparent local repair rule",
        version: "0.1",
        description:
          "A toy cellular field with an explicit, separately editable target.",
        immutable: [
          "64 × 48 grid and coordinates",
          "local 3 × 3 neighborhood kernel",
          "growth and decay equation",
          "synchronous update schedule",
          "four built-in target shapes",
        ],
        mutableLayers: ["state", "policy"],
      },
    },
  });
}
