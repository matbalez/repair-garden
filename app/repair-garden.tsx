"use client";

import {
  Activity,
  ArrowRight,
  Eye,
  FlaskConical,
  GitFork,
  Pause,
  Play,
  RefreshCcw,
  Scissors,
  Sparkles,
  StepForward,
  Waves,
} from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  type GardenLab,
  type GardenPoint,
  type GardenShape,
  type GardenState,
  createGardenLab,
  fieldDifference,
  gardenMetrics,
} from "@/lib/garden-model";

type Stage =
  | "meet"
  | "watching"
  | "repaired"
  | "twins"
  | "cut-twins"
  | "diverging"
  | "aha"
  | "lab";

interface RunPlan {
  branchIds: string[];
  remaining: number;
  onDone?: () => void;
}

const PRESET_WOUND: GardenPoint[] = [
  { x: 39, y: 13 },
  { x: 39, y: 16 },
  { x: 40, y: 19 },
  { x: 40, y: 22 },
];

const SHAPE_LABELS: Record<GardenShape, string> = {
  mote: "Mote",
  bloom: "Bloom",
  twin: "Twin",
};

function cloneView(state: GardenState): GardenState {
  return {
    ...state,
    body: new Float32Array(state.body),
    target: new Float32Array(state.target),
    newness: new Float32Array(state.newness),
  };
}

function getBranchState(lab: GardenLab, branchId: string) {
  return cloneView(lab.branch(branchId).headState);
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function OrganismCanvas({
  state,
  label,
  caption,
  showTarget,
  woundEnabled = false,
  pulseKey = 0,
  onWound,
}: {
  state: GardenState;
  label: string;
  caption: string;
  showTarget: boolean;
  woundEnabled?: boolean;
  pulseKey?: number;
  onWound?: (points: GardenPoint[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [trail, setTrail] = useState<GardenPoint[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(box.width * ratio));
    canvas.height = Math.max(1, Math.round(box.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const width = box.width;
    const height = box.height;
    const cellWidth = width / state.width;
    const cellHeight = height / state.height;
    const glow = context.createRadialGradient(
      width * 0.5,
      height * 0.47,
      0,
      width * 0.5,
      height * 0.47,
      width * 0.58,
    );
    glow.addColorStop(0, "#0a2830");
    glow.addColorStop(0.55, "#06181e");
    glow.addColorStop(1, "#02090d");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(132, 230, 222, 0.035)";
    context.lineWidth = 1;
    for (let column = 0; column <= state.width; column += 4) {
      const x = column * cellWidth;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let row = 0; row <= state.height; row += 4) {
      const y = row * cellHeight;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    if (showTarget) {
      for (let row = 0; row < state.height; row += 1) {
        for (let column = 0; column < state.width; column += 1) {
          const index = row * state.width + column;
          const target = state.target[index] ?? 0;
          if (target < 0.08) continue;
          context.fillStyle = `rgba(174, 105, 255, ${target * 0.1})`;
          context.fillRect(
            column * cellWidth,
            row * cellHeight,
            cellWidth + 0.5,
            cellHeight + 0.5,
          );
          const right = state.target[index + 1] ?? 0;
          const down = state.target[index + state.width] ?? 0;
          if (
            target > 0.45 &&
            (right < 0.45 || down < 0.45 || column === state.width - 1)
          ) {
            context.fillStyle = "rgba(207, 153, 255, 0.9)";
            context.fillRect(
              column * cellWidth,
              row * cellHeight,
              Math.max(1, cellWidth * 0.5),
              Math.max(1, cellHeight * 0.5),
            );
          }
        }
      }
    }

    context.globalCompositeOperation = "lighter";
    for (let row = 0; row < state.height; row += 1) {
      for (let column = 0; column < state.width; column += 1) {
        const index = row * state.width + column;
        const body = state.body[index] ?? 0;
        if (body < 0.012) continue;
        const newness = state.newness[index] ?? 0;
        const red = Math.round(52 + newness * 196);
        const green = Math.round(208 + newness * 25);
        const blue = Math.round(197 - newness * 92);
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${
          0.08 + body * 0.83
        })`;
        context.fillRect(
          column * cellWidth,
          row * cellHeight,
          cellWidth + 0.75,
          cellHeight + 0.75,
        );
      }
    }
    context.globalCompositeOperation = "source-over";

    if (trail.length > 0) {
      context.strokeStyle = "rgba(255, 93, 129, 0.92)";
      context.shadowColor = "rgba(255, 65, 122, 0.72)";
      context.shadowBlur = 14;
      context.lineWidth = Math.max(5, width * 0.022);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      trail.forEach((point, index) => {
        const x = (point.x + 0.5) * cellWidth;
        const y = (point.y + 0.5) * cellHeight;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
      context.shadowBlur = 0;
    }
  }, [showTarget, state, trail]);

  const pointFromEvent = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const box = event.currentTarget.getBoundingClientRect();
      return {
        x: Math.max(
          0,
          Math.min(
            state.width - 1,
            Math.floor(((event.clientX - box.left) / box.width) * state.width),
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            state.height - 1,
            Math.floor(((event.clientY - box.top) / box.height) * state.height),
          ),
        ),
      };
    },
    [state.height, state.width],
  );

  const finishWound = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    if (trail.length > 0) onWound?.(trail);
    setTrail([]);
  }, [drawing, onWound, trail]);

  const metrics = gardenMetrics(state);

  return (
    <article className="organism-card">
      <header className="organism-label">
        <span>
          <i className="live-dot" aria-hidden="true" />
          {label}
        </span>
        <span className="iteration">t = {state.iteration}</span>
      </header>
      <div className="dish-wrap">
        <canvas
          ref={canvasRef}
          className={`organism-canvas ${woundEnabled ? "is-enabled" : ""}`}
          role="img"
          tabIndex={woundEnabled ? 0 : -1}
          aria-label={`${label}. ${caption}. Repair error ${percent(
            metrics.error,
          )}. ${
            woundEnabled
              ? "Drag across the organism or press Enter to make a wound."
              : ""
          }`}
          onPointerDown={(event) => {
            if (!woundEnabled) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDrawing(true);
            setTrail([pointFromEvent(event)]);
          }}
          onPointerMove={(event) => {
            if (!woundEnabled || !drawing) return;
            const point = pointFromEvent(event);
            setTrail((current) => {
              const previous = current[current.length - 1];
              if (previous?.x === point.x && previous.y === point.y) {
                return current;
              }
              return [...current, point];
            });
          }}
          onPointerUp={finishWound}
          onPointerCancel={finishWound}
          onKeyDown={(event) => {
            if (!woundEnabled) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onWound?.(PRESET_WOUND);
            }
          }}
        />
        {pulseKey > 0 ? (
          <span key={pulseKey} className="pulse-wave" aria-hidden="true" />
        ) : null}
      </div>
      <footer>
        <span>{caption}</span>
        <span>{percent(metrics.error)} repair error</span>
      </footer>
    </article>
  );
}

function HealingMeter({ state }: { state: GardenState }) {
  const error = gardenMetrics(state).error;
  const healed = Math.max(0, Math.min(1, 1 - error));
  return (
    <div className="healing-meter" aria-label={`${percent(healed)} repaired`}>
      <div className="meter-copy">
        <span>Repair</span>
        <strong>{percent(healed)}</strong>
      </div>
      <div className="meter-track">
        <span style={{ width: percent(healed) }} />
      </div>
    </div>
  );
}

function GuidePanel({
  stage,
  rootState,
  running,
  onPresetWound,
  onFork,
  onPulse,
  onWoundTwins,
  onReveal,
}: {
  stage: Stage;
  rootState: GardenState;
  running: boolean;
  onPresetWound: () => void;
  onFork: () => void;
  onPulse: () => void;
  onWoundTwins: () => void;
  onReveal: () => void;
}) {
  if (stage === "meet") {
    return (
      <aside className="guide-panel">
        <p className="eyebrow">01 · An organism</p>
        <h1>Meet Mote.</h1>
        <p>
          It is a tiny digital body. Drag a cut through its upper-right edge.
          Nothing here is alive—but every cell obeys a visible local rule.
        </p>
        <Button className="guide-action" onClick={onPresetWound}>
          <Scissors aria-hidden="true" /> Make a clean wound
        </Button>
        <p className="micro-copy">
          Keyboard: focus the dish and press Enter. No score, no failure.
        </p>
      </aside>
    );
  }

  if (stage === "watching") {
    return (
      <aside className="guide-panel">
        <p className="eyebrow">02 · Repair</p>
        <h1>Let go. Watch.</h1>
        <p>
          Cells only sense their neighborhood, yet growth slows as Mote regains
          its form. How did they know what to rebuild—and when to stop?
        </p>
        <HealingMeter state={rootState} />
        <div className="status-note">
          <Activity aria-hidden="true" />
          {running ? "Local updates are propagating" : "Experiment paused"}
        </div>
      </aside>
    );
  }

  if (stage === "repaired") {
    return (
      <aside className="guide-panel">
        <p className="eyebrow">03 · A question</p>
        <h1>Mote came back.</h1>
        <p className="lead-question">
          Does the current shape fully determine what happens next?
        </p>
        <p>
          We can test that by forking this exact moment. Both branches will
          share the same past and the same visible body.
        </p>
        <Button className="guide-action" onClick={onFork}>
          <GitFork aria-hidden="true" /> Fork this moment
        </Button>
      </aside>
    );
  }

  if (stage === "twins") {
    return (
      <aside className="guide-panel">
        <p className="eyebrow">04 · Two histories</p>
        <h1>These Motes look identical.</h1>
        <p>
          Their visible tissue is pixel-for-pixel equal. Now send a brief pulse
          to the left history. It will change no visible cell.
        </p>
        <div className="fact-row">
          <span>Visible difference</span>
          <strong>0.0%</strong>
        </div>
        <Button className="guide-action pulse-button" onClick={onPulse}>
          <Waves aria-hidden="true" /> Pulse the left history
        </Button>
      </aside>
    );
  }

  if (stage === "cut-twins") {
    return (
      <aside className="guide-panel">
        <p className="eyebrow">05 · A hidden trace</p>
        <h1>The pulse is gone.</h1>
        <p>
          They still look the same. Give both branches the exact same wound and
          the exact same time to repair.
        </p>
        <div className="status-note violet">
          <Sparkles aria-hidden="true" /> Left history remembers something you
          cannot yet see
        </div>
        <Button className="guide-action" onClick={onWoundTwins}>
          <Scissors aria-hidden="true" /> Wound both identically
        </Button>
      </aside>
    );
  }

  if (stage === "diverging") {
    return (
      <aside className="guide-panel">
        <p className="eyebrow">06 · Counterfactual</p>
        <h1>Same wound. Watch both.</h1>
        <p>
          The update rule and visible starting state match. Only one hidden
          control field differs.
        </p>
        <div className="status-note">
          <Activity aria-hidden="true" /> Two deterministic futures are running
        </div>
      </aside>
    );
  }

  if (stage === "aha") {
    return (
      <aside className="guide-panel insight-panel">
        <p className="eyebrow">The hinge</p>
        <h1>Same shape. Same wound. Different future.</h1>
        <p className="insight-copy">
          The pulse left no visible mark. Its trace is still acting.
        </p>
        <p>
          Observing a system at one moment may be insufficient to predict it.
          History can persist as control state—something closer to a remembered
          future than a visible scar.
        </p>
        <Button className="guide-action" onClick={onReveal}>
          <Eye aria-hidden="true" /> Reveal the hidden state
        </Button>
      </aside>
    );
  }

  return (
    <aside className="guide-panel lab-guide">
      <p className="eyebrow">Open lab</p>
      <h1>Now intervene.</h1>
      <p>
        In this toy, the pulse rewrote a separable target field. The violet
        contour is what each branch currently treats as “finished.”
      </p>
      <div className="lab-question">
        <FlaskConical aria-hidden="true" />
        <span>
          In real organisms, is repair guided by a separable target, a
          distributed attractor, or some mixture of both?
        </span>
      </div>
      <p className="micro-copy">
        That is the scientific question. This simulation makes the competing
        ideas manipulable; it does not settle which biology uses.
      </p>
    </aside>
  );
}

export function RepairGarden() {
  const [lab] = useState(() => createGardenLab());
  const rootBranchId = lab.rootBranchId;

  const [stage, setStage] = useState<Stage>("meet");
  const [rootState, setRootState] = useState(() =>
    getBranchState(lab, rootBranchId),
  );
  const [alternativeBranchId, setAlternativeBranchId] = useState<string | null>(
    null,
  );
  const [alternativeState, setAlternativeState] = useState<GardenState | null>(
    null,
  );
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showTarget, setShowTarget] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const runRef = useRef<RunPlan | null>(null);

  const syncViews = useCallback(
    (alternativeId = alternativeBranchId) => {
      setRootState(getBranchState(lab, rootBranchId));
      if (alternativeId) {
        setAlternativeState(getBranchState(lab, alternativeId));
      }
    },
    [alternativeBranchId, lab, rootBranchId],
  );

  const startRun = useCallback(
    (branchIds: string[], steps: number, onDone?: () => void) => {
      runRef.current = { branchIds, remaining: steps, onDone };
      setRunning(true);
    },
    [],
  );

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const plan = runRef.current;
      if (!plan) return;
      plan.branchIds.forEach((branchId) => {
        lab.step(branchId, { alpha: 0.25 });
      });
      if (Number.isFinite(plan.remaining)) plan.remaining -= 1;
      syncViews(plan.branchIds[1]);
      if (plan.remaining <= 0) {
        const onDone = plan.onDone;
        runRef.current = null;
        setRunning(false);
        onDone?.();
      }
    }, Math.max(34, 92 / speed));
    return () => window.clearInterval(timer);
  }, [lab, running, speed, syncViews]);

  const woundRoot = useCallback(
    (points: GardenPoint[]) => {
      if (stage !== "meet") return;
      lab.intervene(rootBranchId, "wound", { points, radius: 4.4 });
      syncViews();
      setStage("watching");
      startRun([rootBranchId], 35, () => setStage("repaired"));
    },
    [lab, rootBranchId, stage, startRun, syncViews],
  );

  const forkMoment = useCallback(() => {
    if (stage !== "repaired") return;
    const branchId = lab.fork(rootBranchId, { label: "Pulse history" });
    setAlternativeBranchId(branchId);
    setAlternativeState(getBranchState(lab, branchId));
    setStage("twins");
  }, [lab, rootBranchId, stage]);

  const pulseLeft = useCallback(() => {
    if (!alternativeBranchId || stage !== "twins") return;
    lab.intervene(alternativeBranchId, "rewrite-target", { shape: "bloom" });
    syncViews(alternativeBranchId);
    setPulseKey((value) => value + 1);
    setStage("cut-twins");
  }, [alternativeBranchId, lab, stage, syncViews]);

  const woundTwins = useCallback(() => {
    if (
      !alternativeBranchId ||
      (stage !== "cut-twins" && stage !== "lab")
    ) {
      return;
    }
    [alternativeBranchId, rootBranchId].forEach((branchId) => {
      lab.intervene(branchId, "wound", {
        points: PRESET_WOUND,
        radius: 4.4,
      });
    });
    syncViews(alternativeBranchId);
    if (stage === "cut-twins") {
      setStage("diverging");
      startRun([alternativeBranchId, rootBranchId], 47, () => setStage("aha"));
    } else {
      startRun([alternativeBranchId, rootBranchId], 32);
    }
  }, [
    alternativeBranchId,
    lab,
    rootBranchId,
    stage,
    startRun,
    syncViews,
  ]);

  const enterLab = useCallback(() => {
    setShowTarget(true);
    setStage("lab");
  }, []);

  const changeTarget = useCallback(
    (shape: GardenShape) => {
      if (!alternativeBranchId) return;
      lab.intervene(alternativeBranchId, "rewrite-target", { shape });
      syncViews(alternativeBranchId);
      setPulseKey((value) => value + 1);
    },
    [alternativeBranchId, lab, syncViews],
  );

  const stepBoth = useCallback(() => {
    if (!alternativeBranchId) return;
    setRunning(false);
    runRef.current = null;
    lab.step(alternativeBranchId, { alpha: 0.25 });
    lab.step(rootBranchId, { alpha: 0.25 });
    syncViews(alternativeBranchId);
  }, [alternativeBranchId, lab, rootBranchId, syncViews]);

  const toggleRun = useCallback(() => {
    if (!alternativeBranchId) return;
    if (running) {
      setRunning(false);
      runRef.current = null;
    } else {
      startRun([alternativeBranchId, rootBranchId], Number.POSITIVE_INFINITY);
    }
  }, [alternativeBranchId, rootBranchId, running, startRun]);

  const reset = () => window.location.reload();
  const compareMode = [
    "twins",
    "cut-twins",
    "diverging",
    "aha",
    "lab",
  ].includes(stage);
  const visibleDifference = alternativeState
    ? fieldDifference(alternativeState.body, rootState.body)
    : 0;
  const targetDifference = alternativeState
    ? fieldDifference(alternativeState.target, rootState.target)
    : 0;
  const repairComplete = !["meet", "watching"].includes(stage);
  const historyReached = compareMode;
  const interventionReached = ["aha", "lab"].includes(stage);

  const timelineCounts = (() => {
    if (!alternativeBranchId) return null;
    const comparison = lab.compare(alternativeBranchId, rootBranchId);
    return {
      common: comparison.commonTick,
      left: comparison.leftEventsAfterFork,
      right: comparison.rightEventsAfterFork,
    };
  })();

  return (
    <main className="repair-app">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <div>
            <strong>Repair Garden</strong>
            <small>A temporal self experiment</small>
          </div>
        </div>
        <nav className="concept-progress" aria-label="Experiment concepts">
          <span className={repairComplete ? "is-done" : "is-current"}>
            <i>1</i> Repair
          </span>
          <span
            className={
              historyReached
                ? "is-done"
                : repairComplete
                  ? "is-current"
                  : ""
            }
          >
            <i>2</i> History
          </span>
          <span
            className={
              interventionReached
                ? "is-done"
                : historyReached
                  ? "is-current"
                  : ""
            }
          >
            <i>3</i> Intervention
          </span>
        </nav>
        <button className="reset-button" onClick={reset} type="button">
          <RefreshCcw aria-hidden="true" /> Reset
        </button>
      </header>

      <section className="experiment-shell">
        <div className="garden-stage">
          <div className={`organism-grid ${compareMode ? "is-split" : ""}`}>
            {compareMode ? (
              <>
                <OrganismCanvas
                  state={alternativeState ?? rootState}
                  label="Left · pulse history"
                  caption={
                    showTarget
                      ? `Visible body + ${SHAPE_LABELS[
                          (alternativeState ?? rootState).targetShape
                        ]} target`
                      : "Visible tissue"
                  }
                  showTarget={showTarget}
                  pulseKey={pulseKey}
                />
                <OrganismCanvas
                  state={rootState}
                  label="Right · original history"
                  caption={showTarget ? "Visible body + Mote target" : "Visible tissue"}
                  showTarget={showTarget}
                />
              </>
            ) : (
              <OrganismCanvas
                state={rootState}
                label="Mote · live field"
                caption="Visible tissue"
                showTarget={false}
                woundEnabled={stage === "meet"}
                onWound={woundRoot}
              />
            )}
          </div>

          {compareMode ? (
            <div className="difference-readout" aria-live="polite">
              <span>
                <i className="swatch visible" aria-hidden="true" /> Visible
                difference <strong>{percent(visibleDifference)}</strong>
              </span>
              <span>
                <i className="swatch hidden" aria-hidden="true" /> Hidden
                target difference <strong>{percent(targetDifference)}</strong>
              </span>
            </div>
          ) : (
            <p className="dish-instruction">
              {stage === "meet"
                ? "Drag across the glowing tissue to wound it"
                : "Gold cells mark new growth"}
            </p>
          )}
        </div>

        <GuidePanel
          stage={stage}
          rootState={rootState}
          running={running}
          onPresetWound={() => woundRoot(PRESET_WOUND)}
          onFork={forkMoment}
          onPulse={pulseLeft}
          onWoundTwins={woundTwins}
          onReveal={enterLab}
        />
      </section>

      {stage === "lab" && alternativeState ? (
        <section className="lab-console" aria-label="Open experiment controls">
          <div className="console-group target-group">
            <p className="console-label">Rewrite left remembered future</p>
            <div className="shape-buttons">
              {(["mote", "bloom", "twin"] as GardenShape[]).map((shape) => (
                <Button
                  key={shape}
                  variant={
                    alternativeState.targetShape === shape ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => changeTarget(shape)}
                >
                  {SHAPE_LABELS[shape]}
                </Button>
              ))}
            </div>
          </div>

          <div className="console-group transport-group">
            <p className="console-label">Run both branches</p>
            <div className="transport-buttons">
              <Button variant="outline" size="icon" onClick={toggleRun}>
                {running ? (
                  <Pause aria-label="Pause" />
                ) : (
                  <Play aria-label="Play" />
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={stepBoth}>
                <StepForward aria-label="Advance one step" />
              </Button>
              <Button variant="outline" size="sm" onClick={woundTwins}>
                <Scissors aria-hidden="true" /> Wound both
              </Button>
            </div>
          </div>

          <div className="console-group speed-group">
            <p className="console-label">Simulation speed · {speed.toFixed(1)}×</p>
            <Slider
              min={0.5}
              max={2.5}
              step={0.5}
              value={[speed]}
              onValueChange={(values) => setSpeed(values[0] ?? 1)}
              aria-label="Simulation speed"
            />
          </div>

          <div className="console-group target-switch">
            <div>
              <p className="console-label">Hidden target contour</p>
              <small>Violet field, separate from tissue</small>
            </div>
            <Switch
              checked={showTarget}
              onCheckedChange={setShowTarget}
              aria-label="Show hidden target contour"
            />
          </div>
        </section>
      ) : null}

      {stage === "lab" && timelineCounts ? (
        <section className="timeline-panel">
          <div className="timeline-heading">
            <div>
              <p className="eyebrow">Event-sourced history</p>
              <h2>One recorded past, two testable futures</h2>
            </div>
            <p>
              Every wound, step, and target rewrite is replayable. A branch is
              a causal experiment, not an alternate animation.
            </p>
          </div>
          <div className="timeline-graph" aria-label="Experiment branch timeline">
            <div className="timeline-node shared">
              <span>Shared past</span>
              <strong>{timelineCounts.common} events</strong>
            </div>
            <ArrowRight className="fork-line" aria-hidden="true" />
            <div className="timeline-branches">
              <span>
                Pulse history <strong>+{timelineCounts.left}</strong>
              </span>
              <span>
                Original history <strong>+{timelineCounts.right}</strong>
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="model-footer">
        <div>
          <p className="eyebrow">Model assumptions</p>
          <h2>A transparent toy, deliberately</h2>
        </div>
        <div className="assumption-grid">
          <p>
            <strong>What is fixed</strong>
            A 64 × 48 field, a local 3 × 3 neighborhood, a synchronous update
            rule, and three available target geometries.
          </p>
          <p>
            <strong>What can change</strong>
            Visible tissue, wounds, branch histories, and one explicit target
            field tagged as a policy-layer intervention.
          </p>
          <p>
            <strong>What this demonstrates</strong>
            Identical visible presents need not imply identical futures when
            hidden control state differs. It does not prove cells store shapes.
          </p>
        </div>
        <div className="kernel-note">
          <span>Built on Temporal Self Lab · core 0.1</span>
          <span>Deterministic · forkable · replay-verifiable</span>
        </div>
      </footer>
    </main>
  );
}
