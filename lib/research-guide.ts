export const REPAIR_GARDEN_RESEARCH_CORPUS = `
PRIMARY PAPER
"Open Questions about Time and Self-reference in Living Systems" by Abramsky,
Banzhaf, Caves, Levin, Machado, Ofria, Stepney, and White (arXiv revision v2,
28 June 2026; Royal Society Open Science publication).

The paper is a research agenda, not a completed theory. It argues that living
systems are active, self-referential, and self-modifying, and that conventional
formal tools struggle when the system can change not only its state but also
its effective rules and the processes that change those rules.

The paper distinguishes natural time from representational time. Natural time
is physical succession: a continually changing present. Representational time
is the system's causally active organization of past and possible future: memory,
anticipation, learning, timing, and prediction. The authors make the stronger
ontological claim that representational time is a new kind of time emerging with
life. A scientifically cautious formulation is: living systems construct
causally effective models or traces of temporal relationships and use them to
modify present action. Repair Garden illustrates that formulation; it does not
prove the stronger ontology.

The paper treats a self as persistent organization actively involved in its own
production, maintenance, and governance. Organizational closure and autopoiesis
are relevant: the operations of the system help maintain the organization that
produces those operations. The paper's "temporal spiral" reframes a timeless
self-reference loop as a process: a self at one moment acts on a later version
of itself. This is suggestive, but delaying an update changes formal semantics
and is not by itself a universal solution to logical paradox.

Morphogenesis is the central biological case. During development and repair,
tissue is simultaneously the computational medium, the object being controlled,
the rebuilding material, and part of the machinery specifying the outcome.
Embryos and regenerating organisms can sometimes reach robust anatomical
outcomes from perturbed starting conditions. The paper discusses anatomical
homeostasis, setpoints, bioelectric and biochemical pattern memories, and the
persistence of a self through metamorphosis. These ideas motivate intervention
experiments, but they do not establish that organisms store literal pixel-like
shape templates.

The paper distinguishes changes at several levels: ordinary state variation;
changes to the model or rules; and changes to the metamodel or language that
generates rules. These levels are representation-dependent. Every claim of deep
self-modification must disclose the immutable kernel: coordinates, update
schedule, evaluator, programming language, physics, or other machinery that
remains fixed.

REPAIR GARDEN'S ACTUAL MECHANISM
Repair Garden is a deterministic 64 by 48 cellular field. Visible tissue is a
state array. Each step uses a fixed local 3 by 3 neighborhood rule. A separate
target field specifies one of three built-in geometries: Mote, Bloom, or Twin.
Growth and decay reduce the difference between visible tissue and the current
target. The target is therefore an explicit engineered controller, not a
discovered biological mechanism.

The experiment first wounds Mote and lets the fixed rule repair it. It then
forks one recorded moment into two counterfactual branches. The branches share
the same visible body and past. A one-branch developmental signal directly
rewrites the left branch's hidden target from Mote to Bloom while leaving every
visible cell unchanged. The right branch is an untreated control. Giving both
branches the same later wound and update schedule makes their bodies diverge.
The causal inference is narrow: current observables can underdetermine future
behavior when hidden control state differs, and controlled interventions can
expose that difference.

Repair Garden does not currently implement learning. Repeated repair does not
improve repair rate, modify the update rule, or adapt from experience. A target
rewrite is an intervention by the experimenter, not learning by Mote. A genuine
learning extension would require experience-dependent updating, a held-out test,
and comparison with untrained controls. It should measure changed performance,
transfer, persistence, and reversibility rather than merely showing hysteresis.

SEMANTIC INFORMATION AND TEMPORAL AGENCY
Kolchinsky and Wolpert's intervention-based semantic-information framework asks
which correlations matter to a system's continued existence. Scramble a
candidate internal-environment correlation while preserving other statistics;
if viability falls, the correlation has semantic value for that system. This
motivates a temporal-agency ladder: T0 trace, T1 prediction, T2 causal use,
T3 viability value, T4 revisability after contingency reversal, and T5 a
self-model of future capacities or damage. Repair Garden directly demonstrates
only a designed T2-like causal use: altering hidden control changes the later
trajectory. It has no autonomous viability criterion and does not reach T3-T5.

RELATED COMPUTATIONAL WORK
Growing Neural Cellular Automata show that learned local update rules can grow
and regenerate target images after damage. They are a valuable experimental
substrate, but successful regeneration alone does not reveal whether the target
is represented as a separable field or distributed across dynamics and weights.
Interventions and matched alternative mechanisms are needed.

Pigozzi, Goldstein, and Levin studied associative conditioning in simulated gene
regulatory networks. Their 2025 Communications Biology paper reports that many
tested biological-network models changed their later responses after paired
stimuli and that causal-emergence measures often increased after training.
That work is relevant to genuine experience-dependent learning. It should not
be cited as evidence that Repair Garden's Mote learns, because Mote has no
training rule.

OPEN RESEARCH QUESTIONS
Can an explicit latent target be distinguished experimentally from a distributed
attractor that produces similar repair? Does erasing, swapping, or phase-shifting
a candidate representation redirect repair? Does scrambling it reduce viability?
Can the system revise it after contingency reversal? Which state/rule/metarule
projection makes a claimed change visible, and what immutable kernel remains?
Can equal-observable-state/different-history tests distinguish passive hysteresis,
causal memory, prediction, and self-modelling? These are the productive questions
the toy is designed to teach, not answers it already possesses.
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
one-branch signal is a natural discovery: in this toy it directly rewrites an
engineered hidden target field. Never claim organisms literally contain stored
shape pictures. Never present the paper's "new kind of time" claim as settled.

Prefer one to three short paragraphs. Use a small bullet list only if it makes a
comparison clearer. If the user asks what to try, suggest a concrete action in
the current interface. If the sources do not settle something, say so. Refer to
sources by these human labels when useful: [Paper], [Semantic information],
[Growing NCA], and [GRN learning]. Do not invent quotations, page numbers,
experimental results, or citations.

RESEARCH CORPUS:
${REPAIR_GARDEN_RESEARCH_CORPUS}
`;
