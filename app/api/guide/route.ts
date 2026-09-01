import { RESEARCH_GUIDE_INSTRUCTIONS } from "@/lib/research-guide";

const MAX_BODY_BYTES = 64_000;
const MAX_ACTIVE_REQUESTS = 4;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_MAX_ADDRESSES = 5_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const requestCounts = new Map<string, RateLimitEntry>();
let activeRequests = 0;
let lastRateLimitCleanup = 0;

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

function clientAddress(request: Request) {
  const flyAddress = request.headers.get("fly-client-ip")?.trim();
  if (flyAddress) return flyAddress.slice(0, 100);

  const forwardedAddress = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return (forwardedAddress || "unknown").slice(0, 100);
}

function claimRateLimitSlot(address: string) {
  const now = Date.now();

  if (now - lastRateLimitCleanup >= 60_000) {
    for (const [storedAddress, entry] of requestCounts) {
      if (entry.resetAt <= now) requestCounts.delete(storedAddress);
    }
    lastRateLimitCleanup = now;
  }

  const current = requestCounts.get(address);

  if (!current || current.resetAt <= now) {
    if (!current && requestCounts.size >= RATE_LIMIT_MAX_ADDRESSES) {
      return { allowed: false, retryAfter: 60 };
    }
    requestCounts.set(address, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

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

async function handlePost(request: Request) {
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

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return Response.json(
      { error: "That question is too large. Please send a shorter message." },
      { status: 413 },
    );
  }

  const rateLimit = claimRateLimitSlot(clientAddress(request));
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "The Garden Guide has received several questions. Please try again soon." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
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

  if (activeRequests >= MAX_ACTIVE_REQUESTS) {
    return Response.json(
      { error: "The Garden Guide is busy. Please try again in a moment." },
      { status: 503, headers: { "Retry-After": "2" } },
    );
  }

  activeRequests += 1;
  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(25_000),
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
  } catch {
    return Response.json(
      { error: "The Garden Guide could not answer just now. Please try again." },
      { status: 502 },
    );
  } finally {
    activeRequests -= 1;
  }
}

export { handlePost as POST };
