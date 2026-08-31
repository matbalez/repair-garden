import { RESEARCH_GUIDE_INSTRUCTIONS } from "@/lib/research-guide";

const STAGES = new Set([
  "baseline",
  "first-wounded",
  "first-repairing",
  "matched",
  "perturbed",
  "second-wounded",
  "comparing",
  "result",
]);

type GuideMessage = {
  role: "user" | "assistant";
  content: string;
};

type GuideContext = {
  stage?: string;
  visibleDifference?: number;
  regionalDifference?: number;
  targetDifference?: number;
  leftTarget?: string;
  rightTarget?: string;
  targetsRevealed?: boolean;
  running?: boolean;
  stepsRemaining?: number;
  repairScope?: string;
  protocolMatched?: boolean;
};

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeMessages(value: unknown): GuideMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (message): message is GuideMessage =>
        Boolean(message) &&
        typeof message === "object" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 2_000),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-10);
}

function contextSummary(value: unknown) {
  const context =
    value && typeof value === "object" ? (value as GuideContext) : {};
  const stage = STAGES.has(context.stage ?? "") ? context.stage : "unknown";
  return [
    `Stage: ${stage}`,
    `Visible branch difference: ${Math.round(
      finiteNumber(context.visibleDifference) * 100,
    )}%`,
    `Regeneration difference inside the shared lesion: ${Math.round(
      finiteNumber(context.regionalDifference) * 100,
    )}%`,
    `Hidden target difference: ${Math.round(
      finiteNumber(context.targetDifference) * 100,
    )}%`,
    `Left target: ${String(context.leftTarget ?? "not yet available").slice(0, 30)}`,
    `Right target: ${String(context.rightTarget ?? "not yet available").slice(0, 30)}`,
    `Target overlay revealed: ${Boolean(context.targetsRevealed)}`,
    `Simulation running: ${Boolean(context.running)}`,
    `Synchronized steps remaining: ${Math.round(
      finiteNumber(context.stepsRemaining),
    )}`,
    `Repair update scope: ${String(context.repairScope ?? "unknown").slice(0, 60)}`,
    `Protocol matched across branches: ${Boolean(context.protocolMatched)}`,
  ].join("\n");
}

function extractText(response: Record<string, unknown>) {
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = Array.isArray((item as { content?: unknown }).content)
        ? ((item as { content: unknown[] }).content ?? [])
        : [];
      return content.flatMap((part) => {
        if (!part || typeof part !== "object") return [];
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? [text] : [];
      });
    })
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "The live research guide is built but its model connection has not been configured yet.",
        code: "guide_not_connected",
      },
      { status: 503 },
    );
  }

  let payload: { messages?: unknown; context?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages = safeMessages(payload.messages);
  if (messages.length === 0 || messages.at(-1)?.role !== "user") {
    return Response.json({ error: "Ask the guide a question first." }, { status: 400 });
  }

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      instructions: `${RESEARCH_GUIDE_INSTRUCTIONS}\n\nCURRENT EXPERIMENT CONTEXT:\n${contextSummary(
        payload.context,
      )}`,
      input: messages,
      max_output_tokens: 700,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
      store: false,
    }),
  });

  const data = (await upstream.json()) as Record<string, unknown>;
  if (!upstream.ok) {
    console.error("Garden Guide model request failed", upstream.status);
    return Response.json(
      { error: "The Garden Guide could not answer just now. Please try again." },
      { status: 502 },
    );
  }

  const reply = extractText(data);
  if (!reply) {
    return Response.json(
      { error: "The Garden Guide returned an empty answer. Please try again." },
      { status: 502 },
    );
  }

  return Response.json({ reply });
}
