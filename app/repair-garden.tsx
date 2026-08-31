"use client";

import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  CirclePause,
  FlaskConical,
  Info,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Pause,
  Play,
  Radio,
  RefreshCcw,
  Scissors,
  Send,
  Sparkles,
  StepForward,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  type GardenLab,
  type GardenShape,
  type GardenState,
  createGardenLab,
  fieldDifference,
  gardenMetrics,
  maskedFieldDifference,
} from "@/lib/garden-model";
import { RESEARCH_SOURCES } from "@/lib/research-sources";

type Stage =
  | "baseline"
  | "first-wounded"
  | "first-repairing"
  | "matched"
  | "perturbed"
  | "second-wounded"
  | "comparing"
  | "result";

interface GuideChatMessage {
  role: "user" | "assistant";
  content: string;
}

const REPAIR_STEPS = 48;
const PRESET_WOUND = {
  points: [
    { x: 39, y: 13 },
    { x: 39, y: 16 },
    { x: 40, y: 19 },
    { x: 40, y: 22 },
  ],
  radius: 4.4,
};

const SHAPE_LABELS: Record<GardenShape, string> = {
  mote: "mote",
  bloom: "bloom",
  twin: "twin",
};

function cloneView(state: GardenState): GardenState {
  return {
    ...state,
    body: new Float32Array(state.body),
    target: new Float32Array(state.target),
    newness: new Float32Array(state.newness),
    woundMask: new Float32Array(state.woundMask),
    repairMask: new Float32Array(state.repairMask),
  };
}

function getBranchState(lab: GardenLab, branchId: string) {
  return cloneView(lab.branch(branchId).headState);
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function PaperIntro({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const paper = RESEARCH_SOURCES.find((source) => source.id === "paper");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="paper-modal" showCloseButton={false}>
        <DialogHeader>
          <p className="modal-kicker">Before you begin · 2 minute experiment</p>
          <DialogTitle>How can a living system carry its future?</DialogTitle>
          <DialogDescription>
            A guided thought experiment inspired by <em>Open Questions about
            Time and Self-reference in Living Systems</em>.
          </DialogDescription>
        </DialogHeader>

        <div className="paper-summary">
          <p>
            The paper asks how living systems remain themselves while they
            develop, repair, learn, and even change the processes that change
            them. Its central proposal is that life may organize traces of the
            past and possibilities for the future so they can affect action in
            the present.
          </p>
          <p>
            Repair Garden brings one narrow part of that agenda to life: two
            visibly identical systems can carry different internal organization,
            and a controlled intervention can reveal whether that organization
            causally changes later repair.
          </p>
        </div>

        <div className="modal-causal-chain" aria-label="Experiment logic">
          <span>Same body</span>
          <ArrowRight aria-hidden="true" />
          <span>Change one hidden state</span>
          <ArrowRight aria-hidden="true" />
          <span>Repeat the wound</span>
          <ArrowRight aria-hidden="true" />
          <span>Compare repair</span>
        </div>

        <div className="modal-boundary">
          <Info aria-hidden="true" />
          <p>
            <strong>A model, not a biological claim.</strong> The internal target
            in this toy is engineered and explicit. The experiment does not show
            that real cells store a picture of the body or that Mote learns.
          </p>
        </div>

        <DialogFooter className="paper-modal-actions">
          {paper ? (
            <Button asChild variant="outline">
              <a href={paper.href} target="_blank" rel="noreferrer">
                <BookOpen aria-hidden="true" /> Read the full PDF
              </a>
            </Button>
          ) : null}
          <DialogClose asChild>
            <Button>
              Enter the experiment <ArrowRight aria-hidden="true" />
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TargetMiniMap({ state }: { state: GardenState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    const cellWidth = width / state.width;
    const cellHeight = height / state.height;
    for (let row = 0; row < state.height; row += 1) {
      for (let column = 0; column < state.width; column += 1) {
        const target = state.target[row * state.width + column] ?? 0;
        if (target < 0.04) continue;
        context.fillStyle = `rgba(201, 150, 255, ${0.18 + target * 0.7})`;
        context.fillRect(
          column * cellWidth,
          row * cellHeight,
          cellWidth + 0.35,
          cellHeight + 0.35,
        );
      }
    }
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      className="target-mini-map"
      width={96}
      height={72}
      aria-label={`${SHAPE_LABELS[state.targetShape]} target map`}
      role="img"
    />
  );
}

function InternalStateCard({
  state,
  changed,
}: {
  state: GardenState;
  changed: boolean;
}) {
  return (
    <section
      className={`internal-state-card ${changed ? "is-perturbed" : ""}`}
      aria-label={`Internal next target shape is ${state.targetShape}`}
    >
      <TargetMiniMap state={state} />
      <div className="internal-copy">
        <span className="internal-label">Internal future-state</span>
        <code>
          next_target_shape <b>= &quot;{SHAPE_LABELS[state.targetShape]}&quot;</b>
        </code>
        <small>Distinct from visible tissue</small>
      </div>
      <span className="lock-pill">
        <LockKeyhole aria-hidden="true" /> locked
      </span>
    </section>
  );
}

function OrganismCanvas({
  state,
  label,
  roleLabel,
  showTarget,
  perturbed,
  pulseKey = 0,
}: {
  state: GardenState;
  label: string;
  roleLabel: string;
  showTarget: boolean;
  perturbed: boolean;
  pulseKey?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
          context.fillStyle = `rgba(185, 112, 255, ${target * 0.12})`;
          context.fillRect(
            column * cellWidth,
            row * cellHeight,
            cellWidth + 0.5,
            cellHeight + 0.5,
          );
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
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${0.08 + body * 0.83})`;
        context.fillRect(
          column * cellWidth,
          row * cellHeight,
          cellWidth + 0.75,
          cellHeight + 0.75,
        );
      }
    }
    context.globalCompositeOperation = "source-over";

    for (let row = 0; row < state.height; row += 1) {
      for (let column = 0; column < state.width; column += 1) {
        const index = row * state.width + column;
        const wounded = state.woundMask[index] ?? 0;
        const body = state.body[index] ?? 0;
        if (wounded < 0.5 || body > 0.14) continue;
        context.fillStyle = "rgba(255, 83, 123, 0.16)";
        context.fillRect(
          column * cellWidth,
          row * cellHeight,
          cellWidth + 0.5,
          cellHeight + 0.5,
        );
      }
    }
  }, [showTarget, state]);

  const metrics = gardenMetrics(state);
  const repair = Math.max(0, Math.min(1, 1 - metrics.error));

  return (
    <article className={`organism-card ${perturbed ? "is-perturbed" : ""}`}>
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
          className="organism-canvas"
          role="img"
          aria-label={`${label}. ${roleLabel}. Repair ${percent(repair)}. Internal next target is ${state.targetShape}.`}
        />
        {pulseKey > 0 ? (
          <span key={pulseKey} className="signal-wave" aria-hidden="true" />
        ) : null}
        <span className="visible-layer-label">Visible tissue</span>
      </div>
      <div className="organism-status">
        <span>{roleLabel}</span>
        <span>{percent(repair)} lesion repair</span>
      </div>
      <InternalStateCard state={state} changed={perturbed} />
    </article>
  );
}

function StageNarration({
  stage,
  running,
  remaining,
  regionalDifference,
}: {
  stage: Stage;
  running: boolean;
  remaining: number;
  regionalDifference: number;
}) {
  const copy: Record<
    Stage,
    { eyebrow: string; title: string; body: string; note: string }
  > = {
    baseline: {
      eyebrow: "01 · Matched starting state",
      title: "Two Motes. One history.",
      body: "Both branches begin with the same visible tissue, the same clock, and the same locked internal future-state. The left is reserved for treatment; the right remains the control.",
      note: "Nothing differs yet—not the body, target, wound, or schedule.",
    },
    "first-wounded": {
      eyebrow: "02 · Calibration wound",
      title: "Same damage. Paused.",
      body: "An identical lesion was applied to both Motes. Advance them together to verify that matched bodies and matched internal states produce matched repair.",
      note: "Only cells inside the lesion mask are allowed to update.",
    },
    "first-repairing": {
      eyebrow: "02 · Calibration repair",
      title: "Advance in lockstep.",
      body: "Every click applies the same local cellular update to both sides at the same timepoint. Tissue outside the damaged region is frozen.",
      note: running
        ? `${remaining} synchronized steps remain in this schedule.`
        : "Paused. Compare both sides before the next step.",
    },
    matched: {
      eyebrow: "03 · Matched history confirmed",
      title: "The control works.",
      body: "After the same wound and the same repair schedule, the two visible bodies still match. Now change exactly one internal variable on the left.",
      note: "This first repair is calibration, not evidence of learning.",
    },
    perturbed: {
      eyebrow: "04 · Selective perturbation",
      title: "One hidden state changed.",
      body: "The left next_target_shape is now bloom. The right remains mote. No visible tissue changed, and both histories remain synchronized up to this intervention.",
      note: "Manipulated variable: left.next_target_shape only.",
    },
    "second-wounded": {
      eyebrow: "05 · Matched challenge",
      title: "Same later wound. Paused again.",
      body: "Both Motes received the same lesion at the same coordinates and timepoint. Their visible bodies still match; only the locked internal future-state differs.",
      note: "Step once, step five times, or continue the shared schedule.",
    },
    comparing: {
      eyebrow: "05 · Causal comparison",
      title: "Watch the lesion—not the whole body.",
      body: "Both sides receive the same update schedule. Because only damaged cells may change, any emerging difference stays localized to the shared wound region.",
      note: running
        ? `${remaining} synchronized steps remain.`
        : "Paused at the same timepoint on both sides.",
    },
    result: {
      eyebrow: "The causal result",
      title: "Same wound. Different repair.",
      body: `The regeneration paths differ by ${percent(regionalDifference)} inside the same lesion region. The targeted hidden-state perturbation is causally active in this engineered toy.`,
      note: "This demonstrates repair under hidden-state perturbation—not learning and not a literal cellular picture of anatomy.",
    },
  };
  const current = copy[stage];

  return (
    <div className={`narration-card ${stage === "result" ? "insight-panel" : ""}`}>
      <p className="eyebrow">{current.eyebrow}</p>
      <h1>{current.title}</h1>
      <p>{current.body}</p>
      <div className={stage === "perturbed" ? "status-note violet" : "status-note"}>
        {stage === "perturbed" ? (
          <Sparkles aria-hidden="true" />
        ) : stage === "result" ? (
          <FlaskConical aria-hidden="true" />
        ) : running ? (
          <Activity aria-hidden="true" />
        ) : (
          <CirclePause aria-hidden="true" />
        )}
        {current.note}
      </div>
    </div>
  );
}

function ResearchGuide({
  stage,
  leftState,
  rightState,
  running,
  remaining,
  showTarget,
  visibleDifference,
  targetDifference,
  regionalDifference,
}: {
  stage: Stage;
  leftState: GardenState;
  rightState: GardenState;
  running: boolean;
  remaining: number;
  showTarget: boolean;
  visibleDifference: number;
  targetDifference: number;
  regionalDifference: number;
}) {
  const [messages, setMessages] = useState<GuideChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  const quickQuestions: Record<Stage, string[]> = {
    baseline: ["What does same history mean here?", "Why show the hidden state?"],
    "first-wounded": ["Why pause after the wound?", "What cells can update?"],
    "first-repairing": ["How is this a cellular automaton?", "What is held constant?"],
    matched: ["What did the first repair establish?", "Is this learning?"],
    perturbed: ["What exactly changed on the left?", "Why is the body unchanged?"],
    "second-wounded": ["What outcome should I compare?", "What is the control?"],
    comparing: ["Why only examine the lesion?", "What conclusion is too strong?"],
    result: ["What did this establish?", "How does this relate to the paper?"],
  };

  const askGuide = async (event?: FormEvent, suggestedQuestion?: string) => {
    event?.preventDefault();
    const content = (suggestedQuestion ?? question).trim();
    if (!content || isAsking) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setQuestion("");
    setIsAsking(true);

    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          context: {
            stage,
            visibleDifference,
            regionalDifference,
            targetDifference,
            leftTarget: leftState.targetShape,
            rightTarget: rightState.targetShape,
            targetsRevealed: showTarget,
            running,
            stepsRemaining: remaining,
            repairScope: "damaged region only",
            protocolMatched: true,
          },
        }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        throw new Error(data.error ?? "The guide could not answer.");
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply ?? "" },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The Garden Guide could not answer just now.",
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <aside className="guide-panel research-guide" aria-label="Garden Guide">
      <header className="guide-header">
        <span className="guide-avatar" aria-hidden="true"><Bot /></span>
        <div>
          <strong>Garden Guide</strong>
          <small>Paper-grounded science companion</small>
        </div>
        <span className="guide-status">Live context</span>
      </header>

      <div className="guide-scroll" aria-live="polite">
        <StageNarration
          stage={stage}
          running={running}
          remaining={remaining}
          regionalDifference={regionalDifference}
        />

        {messages.length > 0 ? (
          <div className="guide-conversation">
            {messages.map((message, index) => (
              <div
                className={`guide-message ${message.role}`}
                key={`${message.role}-${index}`}
              >
                <span>{message.role === "user" ? "You" : "Guide"}</span>
                <p>{message.content}</p>
              </div>
            ))}
            {isAsking ? (
              <div className="guide-message assistant is-thinking">
                <span>Guide</span>
                <p><LoaderCircle aria-hidden="true" /> Reading this moment…</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="quick-questions" aria-label="Suggested questions">
        {quickQuestions[stage].map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => askGuide(undefined, prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className="guide-input" onSubmit={askGuide}>
        <MessageCircle aria-hidden="true" />
        <Input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask what is going on here…"
          aria-label="Ask the Garden Guide"
          maxLength={2_000}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!question.trim() || isAsking}
          aria-label="Send question"
        >
          <Send />
        </Button>
      </form>

      <div className="guide-sources">
        <BookOpen aria-hidden="true" />
        <span>Sources</span>
        {RESEARCH_SOURCES.map((source) => (
          <a key={source.id} href={source.href} target="_blank" rel="noreferrer">
            {source.label}
          </a>
        ))}
      </div>
    </aside>
  );
}

function ExperimentControls({
  stage,
  running,
  remaining,
  showTarget,
  onWound,
  onPerturb,
  onStep,
  onToggleRun,
  onShowTarget,
}: {
  stage: Stage;
  running: boolean;
  remaining: number;
  showTarget: boolean;
  onWound: () => void;
  onPerturb: () => void;
  onStep: (count: number) => void;
  onToggleRun: () => void;
  onShowTarget: (show: boolean) => void;
}) {
  const repairStage = [
    "first-wounded",
    "first-repairing",
    "second-wounded",
    "comparing",
  ].includes(stage);
  const completed = REPAIR_STEPS - remaining;

  return (
    <section className="experiment-controls" aria-label="Experiment controls">
      <div className="control-explanation">
        <span className="control-kicker">Synchronized protocol</span>
        <strong>
          {repairStage
            ? `Step ${completed} of ${REPAIR_STEPS}`
            : stage === "baseline"
              ? "Ready for calibration"
              : stage === "matched"
                ? "Matched history confirmed"
                : stage === "perturbed"
                  ? "One variable changed"
                  : "Comparison complete"}
        </strong>
        <small>Update scope · damaged cells only</small>
      </div>

      <div className="control-actions">
        {stage === "baseline" ? (
          <Button onClick={onWound}>
            <Scissors aria-hidden="true" /> Wound both identically
          </Button>
        ) : null}
        {stage === "matched" ? (
          <Button className="perturb-button" onClick={onPerturb}>
            <Radio aria-hidden="true" /> Perturb left hidden state
          </Button>
        ) : null}
        {stage === "perturbed" ? (
          <Button onClick={onWound}>
            <Scissors aria-hidden="true" /> Apply the same later wound
          </Button>
        ) : null}
        {repairStage ? (
          <>
            <Button variant="outline" onClick={() => onStep(1)} disabled={running}>
              <StepForward aria-hidden="true" /> Step +1
            </Button>
            <Button variant="outline" onClick={() => onStep(5)} disabled={running}>
              <StepForward aria-hidden="true" /> Step +5
            </Button>
            <Button onClick={onToggleRun}>
              {running ? (
                <><Pause aria-hidden="true" /> Pause</>
              ) : (
                <><Play aria-hidden="true" /> Continue</>
              )}
            </Button>
          </>
        ) : null}
      </div>

      <label className="target-overlay-toggle">
        <span>
          Target overlay
          <small>Violet map, separate from tissue</small>
        </span>
        <Switch
          checked={showTarget}
          onCheckedChange={onShowTarget}
          aria-label="Show target overlay on both motes"
        />
      </label>
    </section>
  );
}

export function RepairGarden() {
  const [{ lab, leftBranchId, rightBranchId }] = useState(() => {
    const nextLab = createGardenLab();
    const right = nextLab.rootBranchId;
    const left = nextLab.fork(right, { label: "Left treatment" });
    return { lab: nextLab, leftBranchId: left, rightBranchId: right };
  });

  const [introOpen, setIntroOpen] = useState(true);
  const [stage, setStage] = useState<Stage>("baseline");
  const [leftState, setLeftState] = useState(() => getBranchState(lab, leftBranchId));
  const [rightState, setRightState] = useState(() => getBranchState(lab, rightBranchId));
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [showTarget, setShowTarget] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  const syncViews = useCallback(() => {
    setLeftState(getBranchState(lab, leftBranchId));
    setRightState(getBranchState(lab, rightBranchId));
  }, [lab, leftBranchId, rightBranchId]);

  const finishSchedule = useCallback(
    (repairStage: Stage) => {
      setRunning(false);
      setRemaining(0);
      setStage(
        repairStage === "first-wounded" || repairStage === "first-repairing"
          ? "matched"
          : "result",
      );
      syncViews();
    },
    [syncViews],
  );

  const stepPair = useCallback(
    (count: number) => {
      if (
        ![
          "first-wounded",
          "first-repairing",
          "second-wounded",
          "comparing",
        ].includes(stage) ||
        running
      ) {
        return;
      }
      const actual = Math.min(count, remaining);
      for (let index = 0; index < actual; index += 1) {
        lab.step(leftBranchId, { alpha: 0.25 });
        lab.step(rightBranchId, { alpha: 0.25 });
      }
      syncViews();
      const nextRemaining = remaining - actual;
      if (nextRemaining <= 0) finishSchedule(stage);
      else {
        setRemaining(nextRemaining);
        setStage(
          stage === "first-wounded" || stage === "first-repairing"
            ? "first-repairing"
            : "comparing",
        );
      }
    },
    [
      finishSchedule,
      lab,
      leftBranchId,
      remaining,
      rightBranchId,
      running,
      stage,
      syncViews,
    ],
  );

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      lab.step(leftBranchId, { alpha: 0.25 });
      lab.step(rightBranchId, { alpha: 0.25 });
      syncViews();
      setRemaining((current) => {
        const next = current - 1;
        if (next <= 0) {
          window.clearInterval(timer);
          finishSchedule(stage);
          return 0;
        }
        return next;
      });
    }, 72);
    return () => window.clearInterval(timer);
  }, [finishSchedule, lab, leftBranchId, rightBranchId, running, stage, syncViews]);

  const woundBoth = useCallback(() => {
    if (stage !== "baseline" && stage !== "perturbed") return;
    lab.intervene(leftBranchId, "wound", PRESET_WOUND);
    lab.intervene(rightBranchId, "wound", PRESET_WOUND);
    syncViews();
    setRemaining(REPAIR_STEPS);
    setRunning(false);
    setStage(stage === "baseline" ? "first-wounded" : "second-wounded");
  }, [lab, leftBranchId, rightBranchId, stage, syncViews]);

  const perturbLeft = useCallback(() => {
    if (stage !== "matched") return;
    lab.intervene(leftBranchId, "rewrite-target", { shape: "bloom" });
    syncViews();
    setPulseKey((current) => current + 1);
    setStage("perturbed");
  }, [lab, leftBranchId, stage, syncViews]);

  const toggleRun = useCallback(() => {
    if (running) {
      setRunning(false);
      return;
    }
    if (
      ["first-wounded", "first-repairing", "second-wounded", "comparing"].includes(stage)
    ) {
      setStage(
        stage === "first-wounded" || stage === "first-repairing"
          ? "first-repairing"
          : "comparing",
      );
      setRunning(true);
    }
  }, [running, stage]);

  const visibleDifference = fieldDifference(leftState.body, rightState.body);
  const targetDifference = fieldDifference(leftState.target, rightState.target);
  const regionalDifference = maskedFieldDifference(
    leftState.body,
    rightState.body,
    leftState.woundMask,
    rightState.woundMask,
  );
  const perturbed = leftState.targetShape !== rightState.targetShape;
  const progressIndex =
    stage === "baseline"
      ? 0
      : ["first-wounded", "first-repairing"].includes(stage)
        ? 1
        : stage === "matched"
          ? 2
          : stage === "perturbed"
            ? 3
            : 4;

  const reset = () => window.location.reload();

  return (
    <main className="repair-app">
      <PaperIntro open={introOpen} onOpenChange={setIntroOpen} />

      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <div>
            <strong>Repair Garden</strong>
            <small>A hidden-state perturbation experiment</small>
          </div>
        </div>

        <nav className="concept-progress" aria-label="Experiment phases">
          {["Match", "Repair", "Perturb", "Challenge"].map((label, index) => (
            <span
              key={label}
              className={
                index < progressIndex
                  ? "is-done"
                  : index === Math.min(progressIndex, 3)
                    ? "is-current"
                    : ""
              }
            >
              <i>{index + 1}</i> {label}
            </span>
          ))}
        </nav>

        <div className="header-actions">
          <button type="button" onClick={() => setIntroOpen(true)}>
            <Info aria-hidden="true" /> About the paper
          </button>
          <button type="button" onClick={reset}>
            <RefreshCcw aria-hidden="true" /> Reset
          </button>
        </div>
      </header>

      <section className="experiment-shell">
        <div className="garden-stage">
          <div className="premise-strip" aria-label="Controlled variables">
            <span><b>Same</b> visible body</span>
            <span><b>Same</b> recorded protocol</span>
            <span><b>Same</b> clock</span>
            <span className={perturbed ? "is-manipulated" : ""}>
              <b>{perturbed ? "Changed" : "Same"}</b> internal future-state
            </span>
          </div>

          <div className="organism-grid is-split">
            <OrganismCanvas
              state={leftState}
              label="Left Mote"
              roleLabel="Treatment branch"
              showTarget={showTarget}
              perturbed={perturbed}
              pulseKey={pulseKey}
            />
            <OrganismCanvas
              state={rightState}
              label="Right Mote"
              roleLabel="Untreated control"
              showTarget={showTarget}
              perturbed={false}
            />
          </div>

          <div className="difference-readout" aria-live="polite">
            <span>
              <i className="swatch visible" aria-hidden="true" />
              Whole-body difference <strong>{percent(visibleDifference)}</strong>
            </span>
            <span>
              <i className="swatch lesion" aria-hidden="true" />
              Difference inside lesion <strong>{percent(regionalDifference)}</strong>
            </span>
            <span>
              <i className="swatch hidden" aria-hidden="true" />
              Internal target difference <strong>{percent(targetDifference)}</strong>
            </span>
          </div>

          <ExperimentControls
            stage={stage}
            running={running}
            remaining={remaining}
            showTarget={showTarget}
            onWound={woundBoth}
            onPerturb={perturbLeft}
            onStep={stepPair}
            onToggleRun={toggleRun}
            onShowTarget={setShowTarget}
          />
        </div>

        <ResearchGuide
          stage={stage}
          leftState={leftState}
          rightState={rightState}
          running={running}
          remaining={remaining}
          showTarget={showTarget}
          visibleDifference={visibleDifference}
          targetDifference={targetDifference}
          regionalDifference={regionalDifference}
        />
      </section>

      <section className="causal-summary" aria-label="Causal experiment design">
        <div>
          <p className="eyebrow">Causal design</p>
          <h2>One manipulated variable. Everything else held together.</h2>
        </div>
        <div className="causal-cards">
          <article>
            <span>Controlled</span>
            <strong>Visible anatomy</strong>
            <p>Both Motes begin and are wounded in the same observable state.</p>
          </article>
          <article>
            <span>Controlled</span>
            <strong>History + schedule</strong>
            <p>Both receive the same lesions and synchronized cellular updates.</p>
          </article>
          <article className="manipulation-card">
            <span>Manipulated</span>
            <strong>left.next_target_shape</strong>
            <p>The experimenter changes this locked internal variable only.</p>
          </article>
          <article>
            <span>Measured</span>
            <strong>Repair inside the lesion</strong>
            <p>Tissue outside the damaged region cannot drift toward the target.</p>
          </article>
        </div>
      </section>

      <footer className="model-footer">
        <div>
          <p className="eyebrow">Model boundary</p>
          <h2>A transparent causal toy, deliberately</h2>
        </div>
        <div className="assumption-grid">
          <p>
            <strong>What is fixed</strong>
            Two synchronized 64 × 48 cellular fields, one local 3 × 3 rule,
            identical lesion geometry, and the same update clock.
          </p>
          <p>
            <strong>What is manipulated</strong>
            Only the left branch&apos;s locked next_target_shape changes from mote
            to bloom. The right branch remains the untreated control.
          </p>
          <p>
            <strong>What this demonstrates</strong>
            Repair can reveal causally active hidden organization. It does not
            prove that real cells store shape pictures or that Mote learns.
          </p>
        </div>
        <div className="kernel-note">
          <span>Deterministic · lesion-local · replay-verifiable</span>
          <span>No learning rule is implemented</span>
        </div>
      </footer>
    </main>
  );
}
