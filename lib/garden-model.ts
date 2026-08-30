import {
  createTemporalLab,
  type TemporalLab,
  type TemporalModel,
} from "@temporal-self/core";

export const GARDEN_WIDTH = 64;
export const GARDEN_HEIGHT = 48;

export type GardenShape = "mote" | "bloom" | "twin";

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
  targetShape: GardenShape;
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

  if (shape === "twin") {
    const left = 0.48 - Math.hypot(x + 0.31, y * 1.05);
    const right = 0.48 - Math.hypot(x - 0.31, y * 1.05);
    const bridge = 0.17 - Math.hypot(x * 0.5, y * 1.7);
    return Math.max(left, right, bridge);
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
  let targetMass = 0;
  let bodyMass = 0;
  for (let index = 0; index < state.body.length; index += 1) {
    const body = state.body[index] ?? 0;
    const target = state.target[index] ?? 0;
    difference += Math.abs(body - target);
    targetMass += target;
    bodyMass += body;
  }
  return {
    error: difference / Math.max(targetMass, 1),
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

function outputFor(state: GardenState, verb: string): GardenOutput {
  const metrics = gardenMetrics(state);
  return {
    ...metrics,
    targetShape: state.targetShape,
    summary: `${verb}. Visible tissue occupies ${Math.round(
      metrics.mass * 100,
    )}% of the dish; repair error is ${Math.round(metrics.error * 100)}%.`,
  };
}

function nextGardenState(state: Readonly<GardenState>, alpha: number): GardenState {
  const { width, height } = state;
  const body = new Float32Array(state.body.length);
  const newness = new Float32Array(state.newness.length);
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1] as const;

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;
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
      const existing = state.body[index] ?? 0;
      const target = state.target[index] ?? 0;
      const frontier = smoothstep(0.025, 0.34, neighborhood);
      const supported = Math.max(existing * 0.97, frontier);
      const desired = target * supported;
      const rate = target > 0.02 ? alpha : alpha * 1.75;
      const next = clamp(existing + (desired - existing) * rate);
      const growth = Math.max(0, next - existing);
      body[index] = next;
      newness[index] = clamp((state.newness[index] ?? 0) * 0.82 + growth * 4.8);
    }
  }

  return {
    ...state,
    body,
    newness,
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
      targetShape: "mote",
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
      for (let row = 0; row < state.height; row += 1) {
        for (let column = 0; column < state.width; column += 1) {
          const index = row * state.width + column;
          const struck = wound.points.some(
            (point) =>
              Math.hypot(column - point.x, row - point.y) <= wound.radius,
          );
          if (struck) {
            body[index] = 0;
            newness[index] = 0;
          }
        }
      }
      const next = { ...state, body, newness };
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
            summary: `The remembered future changed to ${shape}`,
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
        "repair error",
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
          "three built-in target shapes",
        ],
        mutableLayers: ["state", "policy"],
      },
    },
  });
}
