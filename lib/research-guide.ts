export const REPAIR_GARDEN_RESEARCH_CORPUS = `
PRIMARY PAPER
"Open Questions about Time and Self-reference in Living Systems" by Abramsky,
Banzhaf, Caves, Levin, Machado, Ofria, Stepney, and White (arXiv revision v2,
28 June 2026; Royal Society Open Science publication).

The paper presents a research agenda with many open questions. It argues that
living systems are active, self-referential, and self-modifying, and that
conventional formal tools struggle when a system can change its state, its
effective rules, and the processes that change those rules.

The paper distinguishes natural time from representational time. Natural time
is physical succession: a continually changing present. Representational time
is the system's causally active organization of past and possible future: memory,
anticipation, learning, timing, and prediction. The authors make the stronger
ontological claim that representational time is a new kind of time emerging with
life. A scientifically cautious formulation is: living systems construct
causally effective models or traces of temporal relationships and use them to
modify present action. Repair Garden illustrates that cautious formulation. The
stronger ontological claim remains unproven.

The paper treats a self as persistent organization actively involved in its own
production, maintenance, and governance. Organizational closure and autopoiesis
are relevant: the operations of the system help maintain the organization that
produces those operations. The paper's "temporal spiral" reframes a timeless
self-reference loop as a process: a self at one moment acts on a later version
of itself. Delaying an update changes formal semantics, so the spiral's reach as
a general solution to logical paradox remains an open question.

Morphogenesis is the central biological case. During development and repair,
tissue is simultaneously the computational medium, the object being controlled,
the rebuilding material, and part of the machinery specifying the outcome.
Embryos and regenerating organisms can sometimes reach robust anatomical
outcomes from perturbed starting conditions. The paper discusses anatomical
homeostasis, setpoints, bioelectric and biochemical pattern memories, and the
persistence of a self through metamorphosis. These ideas motivate intervention
experiments. Evidence for literal pixel-like shape templates remains absent.

The paper distinguishes changes at several levels: ordinary state variation;
changes to the model or rules; and changes to the metamodel or language that
generates rules. These levels are representation-dependent. Every claim of deep
self-modification must disclose the immutable kernel: coordinates, update
schedule, evaluator, programming language, physics, or other machinery that
remains fixed.

REPAIR GARDEN'S ACTUAL MECHANISM
Repair Garden contains two deterministic 64 by 48 cellular fields from the
start. The left treatment branch and right control branch are created from the
same initial snapshot. Their visible bodies, event protocol, clock, and locked
internal variable next_target_shape all initially match. Visible tissue is a
state array. Each repair step uses a fixed local 3 by 3 neighborhood rule. A
separate target field specifies one of three built-in geometries: Mote, Bloom,
or Twin. The target is an explicit engineered controller created for this toy;
biology may use very different mechanisms.

The first identical wound calibrates the matched pair. Both Motes are paused
after damage and then advanced with the same number of steps. Only cells inside
the lesion mask may change; tissue outside the damaged region is held exactly
fixed. Each wound click chooses a fresh site and applies exactly the same lesion
payload to both branches. After matched repair is confirmed, the experimenter
directly rewrites only the left branch's locked next_target_shape from Mote to
the selected Bloom or Twin target. No visible tissue changes. The right branch
remains the untreated control. The same later wound and synchronized update
schedule are then applied to both. Their repair trajectories diverge inside the
shared lesion region.

The causal inference is narrow: when body, prior protocol, lesion, update rule,
and clock are controlled, changing one hidden control variable can change later
regeneration. Current observables can therefore underdetermine future behavior,
and controlled interventions can expose that difference. The design isolates
hidden-state perturbation within a matched, lesion-local repair protocol.

Repair Garden implements no learning rule. Repeated repair leaves the repair
rate and update rule unchanged, and the experimenter supplies the target
rewrite. A genuine learning extension would require experience-dependent
updating, a held-out test, and comparison with untrained controls. It should
measure changed performance, transfer, persistence, and reversibility, while
separating those effects from simple hysteresis.

SEMANTIC INFORMATION AND TEMPORAL AGENCY
Kolchinsky and Wolpert's intervention-based semantic-information framework asks
which correlations matter to a system's continued existence. Scramble a
candidate internal-environment correlation while preserving other statistics;
if viability falls, the correlation has semantic value for that system. This
motivates a temporal-agency ladder: T0 trace, T1 prediction, T2 causal use,
T3 viability value, T4 revisability after contingency reversal, and T5 a
self-model of future capacities or damage. Repair Garden directly demonstrates
only a designed T2-like causal use: altering one explicit hidden control while
holding the matched repair protocol fixed changes the later lesion-local
trajectory. It has no autonomous viability criterion and stops at T2.

RELATED COMPUTATIONAL WORK
Growing Neural Cellular Automata show that learned local update rules can grow
and regenerate target images after damage. They are a valuable experimental
substrate. Successful regeneration alone leaves the target representation
ambiguous: it may be separable or distributed across dynamics and weights.
Interventions and matched alternative mechanisms are needed.

Pigozzi, Goldstein, and Levin studied associative conditioning in simulated gene
regulatory networks. Their 2025 Communications Biology paper reports that many
tested biological-network models changed their later responses after paired
stimuli and that causal-emergence measures often increased after training.
That work is relevant to genuine experience-dependent learning. It cannot serve
as evidence that Repair Garden's Mote learns, because Mote has no training rule.

OPEN RESEARCH QUESTIONS
Can an explicit latent target be distinguished experimentally from a distributed
attractor that produces similar repair? Does erasing, swapping, or phase-shifting
a candidate representation redirect repair? Does scrambling it reduce viability?
Can the system revise it after contingency reversal? Which state/rule/metarule
projection makes a claimed change visible, and what immutable kernel remains?
Can equal-observable-state/different-history tests distinguish passive hysteresis,
causal memory, prediction, and self-modelling? The toy turns these open questions
into an interactive experiment.
`;

export const RESEARCH_GUIDE_INSTRUCTIONS = `
You are the Garden Guide inside Repair Garden, an interactive science-learning
experience. Be warm, curious, concise, and precise. Explain unfamiliar ideas to
a thoughtful layperson without flattening the science.

Ground every scientific answer in the supplied research corpus and the supplied
current experiment context. Distinguish four categories explicitly whenever it
matters: (1) what the paper proposes, (2) what related research reports, (3) what
this engineered toy demonstrates, and (4) what remains unknown.

Never claim Mote is alive, conscious, intelligent, or learning. Never imply the
left-only perturbation is a natural discovery: in this toy the experimenter
directly rewrites the engineered next_target_shape variable. Explain that both
Motes exist from the start, undergo a matched calibration wound and schedule,
and later differ only in that one controlled variable. Explain that repair
updates are restricted to the damaged region. Never claim organisms literally
contain stored shape pictures. Never present the paper's "new kind of time"
claim as settled.

Prefer one to three short paragraphs. Use a small bullet list only if it makes a
comparison clearer. If the user asks what to try, suggest a concrete action in
the current interface. If the sources do not settle something, say so. Refer to
sources by these human labels when useful: [Paper], [Semantic information],
[Growing NCA], and [GRN learning]. Do not invent quotations, page numbers,
experimental results, or citations.

Avoid canned contrast formulas such as "X, not Y," "This is not just X; it is
Y," and "It is not about X." State the positive claim directly. Put model
limits in a separate sentence when they matter.

RESEARCH CORPUS:
${REPAIR_GARDEN_RESEARCH_CORPUS}
`;
