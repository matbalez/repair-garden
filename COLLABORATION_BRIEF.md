# Repair Garden: collaboration brief and research roadmap

- **Status:** public prototype and early research infrastructure
- **Live experiment:** [repair-garden.fly.dev](https://repair-garden.fly.dev/)
- **Public code:** [github.com/matbalez/repair-garden](https://github.com/matbalez/repair-garden)
- **Primary paper:** [*Open Questions about Time and Self-reference in Living Systems* — full PDF](https://arxiv.org/pdf/2508.11423v2)
- **Last updated:** 31 August 2026

## Invitation

Repair Garden is an attempt to turn a difficult scientific and philosophical agenda into something people can inspect, manipulate, question, and eventually use for research.

The project started with two ambitions:

1. Help a thoughtful non-specialist understand why time, memory, self-reference, repair, and identity create hard scientific problems.
2. Build reusable infrastructure for controlled computational experiments that could help move those problems forward.

The current web app is the first public artifact. It is deliberately small. Its value is the causal experiment it makes legible: two systems can look the same now, carry different internal organization, and respond differently to the same later damage.

This document gives collaborators the full context: where the idea came from, what the paper claims, what the product demonstrates, what the code already supports, where the model is weak, and which questions appear most worth pursuing next.

## The originating question

The project began with a request to read the paper, explain its implications, and explore two directions:

- What tractable contributions could help advance the research agenda?
- What engaging products could make the scientific and philosophical questions tangible?

The first analysis identified several possible products, including Cocoon Protocol, Repair Garden, Rulegarden, The Mirror Moves, and Paradox Garden. Repair Garden was selected because morphogenesis provides an unusually direct bridge between public understanding and experimental work. Regeneration is visual, intervention-friendly, and closely connected to the paper's central claim that a living system participates in producing and revising itself through time.

The user then sharpened the build strategy: create shared infrastructure first, followed by a playful web prototype with a real “aha” moment. That decision produced two layers:

- **Temporal Self Lab**, a small TypeScript experiment kernel now vendored in this repository as `@temporal-self/core`.
- **Repair Garden**, the interactive product and first model built on that kernel.

The initial prototype used a sequential story: wound one Mote, repair it, fork its recorded history, send an unexplained “pulse” to one branch, wound both branches, and compare their futures. Testing exposed three conceptual failures. The pulse was ambiguous, the interface did not show which state it changed, and repeated repair could be mistaken for learning even though the model contained no learning rule. The original fork narrative also made it harder to reason about what was actually controlled.

Those problems were scientifically useful. They forced the interface to disclose the manipulated variable, make the control visible from the start, localize repair to damaged tissue, and state plainly that no learning occurs. The current matched-pair experiment grew directly out of that critique.

## The paper

[*Open Questions about Time and Self-reference in Living Systems*](https://arxiv.org/abs/2508.11423) is a 30-page interdisciplinary research agenda by Samson Abramsky, Wolfgang Banzhaf, Leo S. D. Caves, Michael Levin, Penousal Machado, Charles Ofria, Susan Stepney, and Roger White. The current arXiv version was revised on 28 June 2026.

The paper argues that living systems are active, self-referential, and self-modifying. They do more than move through a fixed state space under fixed rules: they can participate in maintaining their own organization, change how they respond, alter effective boundaries and goals, and sometimes change the processes that produce further change.

### Natural and representational time

The authors distinguish two notions of time:

- **Natural time** is physical succession: the continually changing present in which processes occur.
- **Representational time** is an organism's causally active organization of past and possible future: memory, anticipation, learning, prediction, and timing.

The paper makes a strong ontological proposal that representational time is a new kind of time that emerges with life. A more cautious operational version guided this project:

> A system can carry physical traces or models of temporal relationships and use them to change present action.

That formulation preserves the testable core. The ontological status of representational time remains an open question.

### Self-reference as a process

The paper treats a self as a persistent organization involved in its own production, maintenance, and governance. A system can model, measure, or modify the same system doing the modelling, measuring, or modifying.

The authors propose that natural time can “unwind” a timeless self-referential loop into a spiral. A self at one moment acts on a later version of itself. This is suggestive for development and repair, where each stage changes the substrate that will carry the next stage. Formal work is still needed to distinguish cases where adding an update schedule clarifies a process from cases where it changes the semantics of the original problem.

### Why morphogenesis matters

Morphogenesis is the paper's most concrete biological case. During development, regeneration, and metamorphosis, tissue can be all of the following at once:

- the computational medium;
- the material being transformed;
- part of the controller;
- part of what specifies or evaluates the outcome.

Embryos and regenerating organisms can reach robust anatomical outcomes from perturbed starting conditions. This motivates questions about anatomical homeostasis, setpoints, distributed control, bioelectric and biochemical pattern memory, and the persistence of identity through radical change.

The difficult scientific question is how to distinguish candidate mechanisms. Convergence toward a shape does not by itself reveal whether a system contains a separable target representation, occupies a distributed attractor, follows a local repair policy, or combines several mechanisms.

### State, rules, and deeper change

The paper distinguishes changes to:

1. a system instance or state;
2. the model or effective rules that generate behaviour;
3. the metamodel or language that generates rules.

These levels help organize experiments about self-modification and open-endedness. They are also representation-dependent. A claim that a system changed its own rules should identify the observer's chosen variables and the machinery that remained fixed: coordinates, scheduler, evaluator, programming language, physics, or another immutable kernel.

### Formal and computational agenda

The paper surveys possible tools including domain theory, coalgebra and coinduction, categorical approaches, genetic programming, self-modifying algorithms, and other computational frameworks for systems whose organization can change through time. It repeatedly identifies a gap between elegant formal theories of self-reference and concrete models of structurally evolving biological or social systems.

The paper presents an agenda of unsettled questions. Its strongest contribution is a cluster of problems that conventional fixed-state, fixed-rule descriptions often obscure.

## What Repair Garden is now

Repair Garden presents two digital organisms, called Motes, side by side from the beginning. They start with:

- the same visible tissue;
- the same recorded protocol;
- the same simulation clock;
- the same local cellular update rule;
- the same internal `next_target_shape = mote` field.

The target overlay is visible by default so the internal control state can be compared with visible tissue.

The experiment has four phases:

1. **Match.** Both Motes begin from the same snapshot.
2. **Repair.** A shared wound is applied at the same coordinates. The user advances both systems in synchronized single steps, five-step increments, or a continuous schedule. Only cells inside the lesion may change.
3. **Perturb.** The user changes only the left Mote's `next_target_shape`, choosing Bloom, Bilobe, or Crescent. The right Mote remains the untreated control. The visible tissue is unchanged at the moment of intervention.
4. **Challenge.** The user applies the same later wound to both systems and advances the same schedule. Their regeneration can diverge inside the shared lesion.

Users can click either organism to choose a wound site, or ask for a new shared random wound. Both actions still apply one matched lesion to both branches. Continuous drift and soft deformation make the organisms feel alive on screen; this display layer does not change the cellular state or advance the repair clock.

The Garden Guide is a persistent interactive research companion. It receives the current experimental stage, target states, measurements, overlay state, repair scope, and synchronized schedule status. Its source corpus includes the primary paper and related work, and its instructions require it to separate:

1. what the paper proposes;
2. what related research reports;
3. what this engineered model demonstrates;
4. what remains unknown.

### The causal claim made by the toy

The result is intentionally narrow:

> When visible anatomy, prior protocol, lesion, update rule, and clock are controlled, changing one hidden control variable can change later lesion-local regeneration.

This establishes that current visible state can underdetermine future behaviour in an engineered system. It also shows why interventions can be more informative than observation alone.

### Epistemic boundaries

| The prototype demonstrates | The prototype does not establish |
| --- | --- |
| A hidden variable can be causally active in later repair. | That organisms store literal pictures of target shapes. |
| Matched branches and matched interventions make a hidden-state effect legible. | That the toy's explicit target field maps directly onto a biological mechanism. |
| Repair can be restricted to damaged tissue while the rest of the body remains fixed. | That real repair is lesion-local in this exact computational sense. |
| A recorded intervention can redirect a deterministic future. | Learning, because Mote has no experience-dependent update rule. |
| A transparent model can teach causal experimental logic. | Life, consciousness, intelligence, agency, or selfhood in Mote. |

The distinction around learning is especially important. A system that regenerates the same way after repeated wounds may be robust or path-dependent. Evidence of learning would require experience-dependent change, untrained controls, a held-out challenge, persistence or transfer, and tests that separate learning from hysteresis.

## Related research already in the project

### Semantic information

Kolchinsky and Wolpert define [semantic information](https://arxiv.org/abs/1806.08053) as correlations between a physical system and its environment that are causally necessary for the system to maintain its existence. Their method uses counterfactual interventions that scramble correlations while preserving selected statistics, then measures changes in viability.

This supplies an important discipline for the project. Decoding a correlation from internal state does not show that the system uses it. A targeted intervention followed by a change in behaviour or viability is stronger evidence. Repair Garden currently demonstrates a designed causal-use case; it has no autonomous viability criterion.

### Growing Neural Cellular Automata

[*Growing Neural Cellular Automata*](https://distill.pub/2020/growing-ca/) provides a learned local substrate that can grow and regenerate target images. Damage during training increases the basin of attraction around a target pattern and improves regeneration, including some generalization to unfamiliar damage.

This is a natural next model family for Repair Garden. Its hidden channels are distributed and learned, which makes the intervention problem harder and more scientifically interesting. Successful regeneration still leaves the representation question unresolved: the relevant information may be distributed across state, weights, dynamics, and training history.

### Learning in gene-regulatory-network models

Pigozzi, Goldstein, and Levin report [associative conditioning in simulated gene-regulatory-network models](https://www.nature.com/articles/s42003-025-08411-2). They analyzed 29 experimentally derived network models and found that training often increased a measure of causal emergence. This work is relevant to minimal learning and distributed memory. Its results come from in-silico ODE models and should be reproduced and stress-tested before broader biological conclusions are drawn.

The GRN work is also useful for correcting the first Repair Garden prototype: a pulse can be scientifically meaningful when its timing, target nodes, training protocol, later test, and causal controls are explicit. An unexplained animation called a pulse has no such meaning.

## The codebase and infrastructure

### Public Repair Garden repository

The [public repository](https://github.com/matbalez/repair-garden) contains the application, model, research corpus, tests, container build, and Fly.io configuration.

Key areas:

| Path | Responsibility |
| --- | --- |
| `app/repair-garden.tsx` | Experiment flow, synchronized controls, rendering, animation, narration, modal, and Garden Guide UI |
| `lib/garden-model.ts` | Target geometries, matched wound construction, lesion-local cellular updates, interventions, and difference metrics |
| `lib/research-guide.ts` | Source-grounded science context, model boundaries, and conversational instructions |
| `app/api/guide/route.ts` | Server-side OpenAI connection, experiment-context injection, input limits, timeouts, concurrency limits, and rate limiting |
| `tests/` | Deterministic repair, matched controls, lesion locality, target perturbation, replay, interface, guide, and deployment checks |
| `vendor/packages/temporal-self-core-0.1.1.tgz` | Reproducible packed copy of the shared experiment kernel |
| `Dockerfile` and `fly.toml` | Production build and Fly.io deployment |

The OpenAI API key used by the Garden Guide is stored as a Fly secret and is never sent to the browser or committed to Git.

### Temporal Self Lab

The first infrastructure work began as a separate TypeScript package and now ships inside the public repository as `@temporal-self/core`. It standardizes:

- deterministic seeded execution;
- event-sourced histories with state before and after each action;
- counterfactual fork and replay;
- first-class interventions separated from ordinary evolution;
- change declarations for state, policy, rule, metarule, environment, and observer layers;
- immutable-kernel disclosure;
- hooks for research metrics.

This kernel is intentionally theory-light. It records evidence needed to evaluate claims about memory, representation, novelty, identity, or agency without deciding those questions in advance.

The package is currently vendored rather than maintained as an independently public repository. If multiple experiments begin to use it, the next infrastructure step should be to restore it as its own versioned public package with an API contract, example adapters, cross-repository tests, and release notes.

### Current project operations

- The source of truth is the public GitHub repository.
- Production is deployed at [repair-garden.fly.dev](https://repair-garden.fly.dev/).
- The working convention is: change locally, run lint and the complete test suite, push to GitHub, then redeploy to Fly.io.
- The code is available under the permissive [MIT License](./LICENSE). A contribution guide and lightweight governance should be added as collaboration expands.

## Why productization matters to the science

Product design performs scientific work here. Interface choices force assumptions into the open.

- Showing two organisms from the start makes the control group explicit.
- Naming `next_target_shape` reveals exactly which variable is manipulated.
- Preserving visible tissue during the perturbation separates internal state from anatomy at the intervention time.
- Applying one lesion payload and one clock to both branches prevents an easy confound.
- Restricting updates to the lesion clarifies what “repair” means inside the model.
- Step controls let users compare branches at the same timepoint.
- Measurements distinguish whole-body difference, lesion-local difference, and hidden-target difference.
- The Garden Guide can explain the current experimental state while guarding against claims the model has not earned.

The product can therefore serve three roles:

1. **Learning environment.** Users encounter the causal question before receiving a formal explanation.
2. **Experimental design sandbox.** Users can learn why controls, interventions, observables, and falsifiers matter.
3. **Future research interface.** More realistic model families can sit behind the same interaction protocol and be compared under shared interventions.

The first user test already demonstrated this loop. Confusion about the pulse and learning was converted into better model disclosure, better controls, and stronger language. Future comprehension failures should be treated as evidence about both pedagogy and scientific ambiguity.

## A working framework for moving the science forward

### 1. A temporal-agency ladder

The original analysis proposed the following operational ladder. It remains an unvalidated working research tool and does not originate in the paper.

| Level | Test | Possible interpretation |
| --- | --- | --- |
| T0 · Trace | Internal state retains information about earlier events after controlling for the present. | Memory or path dependence |
| T1 · Prediction | The state predicts a future condition beyond current observation. | Anticipatory information |
| T2 · Causal use | Erasing, swapping, or perturbing it changes the selected action or trajectory. | The information affects behaviour |
| T3 · Viability value | Scrambling the relevant system-environment correlation reduces self-maintenance. | System-relative semantic value |
| T4 · Revisability | The representation updates after a contingency reversal. | Learned model or adaptive memory |
| T5 · Self-model | It represents the system's own future capacities, damage, or limitations and guides intervention. | Stronger self-reference |

Repair Garden is currently a designed T2-like example. It should not be scored at T3 or above without adding autonomous viability, learning, reversal, and self-directed intervention protocols.

### 2. A model ladder

The same public interface can support increasingly informative models:

| Stage | Model | Scientific purpose |
| --- | --- | --- |
| M0 | Current explicit target field | Teach matched intervention logic with a transparent mechanism |
| M1 | Learned neural cellular automaton | Test distributed hidden state and generalization across damage |
| M2 | Multiple mechanisms with similar visible repair | Ask users and agents to design interventions that distinguish explicit targets, distributed attractors, and local policies |
| M3 | Viability-bearing synthetic systems | Apply semantic-information scrambling and measure survival or self-maintenance |
| M4 | Calibrated biological model and public datasets | Generate discriminating predictions tied to real perturbations |
| M5 | Wet-lab collaboration | Test the strongest model-divergent predictions in living tissue |

Each stage should preserve a common experiment record: initial condition, observables, intervention, immutable kernel, update schedule, measurements, predictions, and replay information.

### 3. A standard causal protocol

Every experiment in this program should answer the same questions:

1. Which observable states and histories are matched?
2. Which internal variable or correlation is the candidate representation?
3. What single intervention changes it?
4. Which parts of the system and environment remain fixed?
5. What future challenge is applied to treatment and control?
6. Which outcome, repair, transfer, or viability metric is measured?
7. What result would falsify the interpretation?
8. Can the event history be replayed exactly?
9. Which result depends on the observer's chosen scale or variable projection?
10. What immutable kernel remains outside the system's self-modification?

This protocol is the clearest path from an explainer to a benchmark.

## Proposed collaborative workstreams

Agents can make useful progress in parallel as long as outputs share explicit provenance and common experimental contracts.

### Workstream A · Theory and formalization

**Question:** When does temporalizing self-reference clarify a real process, and when does it replace the original semantics with a delayed dynamical system?

**Deliverables:**

- a taxonomy of feedback, productive recursion, fixed points, oscillation, semantic diagonalization, and self-amendment;
- a formal statement of the state/rule/metarule projection problem;
- a standard immutable-kernel disclosure;
- connections to guarded recursion, coalgebra, domain theory, dynamical systems, and categorical models.

**Success condition:** the framework yields distinctions that change experimental or modelling decisions.

### Workstream B · Morphogenetic model arena

**Question:** Can interventions distinguish an explicit latent target from distributed attractor dynamics when both produce similar visible repair?

**Deliverables:**

- a neural cellular automaton adapter for Temporal Self Lab;
- at least two matched model families with similar baseline behaviour;
- hidden-state erasure, swapping, transplantation, phase-shift, and channel-blocking interventions;
- generalization tests across wound location, shape, severity, and timing.

**Success condition:** a preregistered intervention separates at least two candidate mechanisms on held-out damage.

### Workstream C · Temporal Agency Benchmark

**Question:** Which tests separate passive traces, causal memory, prediction, semantic value, revisability, and self-modelling?

**Deliverables:**

- benchmark adapters for a reactive controller, a hysteretic nonliving system, a GRN model, and an NCA;
- matched nulls preserving energy, marginals, autocorrelation, and timing where relevant;
- a metric suite that reports a multidimensional profile;
- adversarial examples designed to fool each metric.

**Success condition:** the benchmark distinguishes mechanisms for a reason confirmed by intervention and independent of labels assigned to model classes.

### Workstream D · GRN replication and extension

**Question:** How robust are reported associations between training, associative memory, and causal emergence in gene-regulatory-network models?

**Deliverables:**

- independent reproduction of the published analysis;
- correction-aware verification of the dataset and statistics;
- matched dynamical nulls and contingency-reversal tests;
- analysis of transfer, persistence, reversibility, and circuit heterogeneity;
- a Temporal Self Lab adapter for replayable GRN experiments.

**Success condition:** a reproducible result with clear scope, failure cases, and uncertainty.

### Workstream E · Branching-world calibration

**Question:** How well can a model infer possible histories and counterfactual branches when only one realized trajectory is observed?

**Deliverables:**

- digital worlds where the true branch distribution can be estimated from many replicas;
- hidden-history inference tasks;
- held-out intervention tests;
- calibration metrics for branch probabilities and structural uncertainty.

**Success condition:** a method predicts unseen branches and interventions better than trajectory fitting alone.

### Workstream F · Product, comprehension, and research UX

**Question:** Does the experience produce the intended causal insight, and can users transfer it to unfamiliar systems?

**Deliverables:**

- a small comprehension protocol with prediction prompts at key moments;
- measures of causal understanding, calibration, transfer, and persistent misconceptions;
- a “scientist mode” for forming a hypothesis before revealing an outcome;
- exportable anonymous experiment sessions;
- model-comparison puzzles where mechanism cannot be read directly from the UI.

**Success condition:** users can explain the causal conclusion, name a limitation, and design a useful next intervention.

### Workstream G · Biological translation

**Question:** Which computational interventions correspond to feasible, discriminating perturbations in regeneration or development?

**Deliverables:**

- a literature map of candidate substrates such as bioelectric state, chemical signalling, transcriptional state, tissue geometry, and mechanical coupling;
- model-to-measurement mappings;
- a ranked list of experiments where candidate mechanisms make different predictions;
- collaboration proposals for developmental-biology or regeneration labs.

**Success condition:** one feasible biological experiment can rule out or substantially update at least one model family.

## The most interesting remaining questions

### Representation and mechanism

- What would count as an internal representation of a target, rather than an observer's compact description of an attractor?
- Can an explicit target and a distributed dynamical mechanism be observationally equivalent under all practical measurements?
- Which interventions can identify where repair-relevant information is stored or distributed?
- Is a candidate representation stable, reconstructed after damage, or continually enacted through organism-environment coupling?

### History and identity

- What does “same history” require: the same observables, microstate, causal ancestry, update count, environmental coupling, or all of these?
- Which historical differences matter after current visible state has been matched?
- What persists through repair, metamorphosis, component turnover, or substrate change strongly enough to justify an identity claim?
- Can continuity be measured as a profile of retained commitments, capacities, and control relations?

### Learning and revisability

- Which tests distinguish learning from hysteresis, sensitization, fatigue, damage accumulation, and parameter drift?
- Can a repair system update its own target or policy from experience, then revise that update when contingencies reverse?
- Does training enlarge a basin of attraction, create a new attractor, alter a policy, or change which variables function as the system's goals?
- How should persistence, transfer, reversibility, and catastrophic forgetting be measured in non-neural systems?

### Semantic value and viability

- Which internal-environment correlations are causally necessary for continued self-maintenance?
- How can correlations be scrambled while preserving appropriate marginal distributions and physical constraints?
- What is the right viability function for a cell, tissue, digital organism, evolving lineage, or social system?
- Can a system restore a damaged correlation, and does that restoration supply stronger evidence of system-relative meaning?

### Self-reference and self-modification

- Which self-referential loops become productive processes when an update schedule is made explicit?
- Can traces alone ever establish a rule change, given that a fixed interpreter can encode a changing rule as state?
- Which layer changed, according to which observer and projection?
- How much of the scheduler, evaluator, representation language, and environment remains immutable?
- Does deeper modifiability improve adaptation under structural shocks, or mainly create new paths for instability and evaluator gaming?

### Scale and emergence

- At what spatial and temporal scale does a useful self appear?
- Can causal interventions identify a level of organization whose dynamics have explanatory or control power unavailable from parts considered independently?
- How do boundaries move when cells join, separate, die, or change allegiance?
- Can the same system support several overlapping selves with different goals and timescales?

### Product and scientific practice

- Which visualizations reveal causal structure without smuggling in a blueprint metaphor?
- Can user-generated perturbations become a valuable benchmark corpus?
- Can the Garden Guide support inquiry while keeping source claims, model behaviour, and speculation clearly separated?
- How should uncertainty and disagreement among papers be represented inside an interactive experiment?
- What evidence would persuade a skeptical biologist, a formal theorist, and a causal-inference researcher for different reasons?

## Suggested first milestones

### Milestone 1 · Reproducible experiment specification

Publish a versioned schema for models, initial states, interventions, immutable kernels, observables, metrics, predictions, and replay artifacts. Export a complete Repair Garden session against this schema.

### Milestone 2 · Second mechanism behind the same interface

Add a learned NCA or distributed-attractor model that can repair a Mote-like body. Match its visible baseline behaviour to the explicit-target model and build an intervention puzzle that can distinguish them.

### Milestone 3 · Intervention atlas and evaluation harness

Implement erasure, swap, transplant, phase-shift, communication block, contingency reversal, and correlation-scrambling operations. Define matched nulls and held-out damage suites.

### Milestone 4 · GRN replication

Reproduce the published GRN conditioning result, record it through the same event protocol, and test whether causal-emergence changes survive matched controls and reversal experiments.

### Milestone 5 · Biological hypothesis map

Connect computational variables and interventions to measurable biological substrates. Rank candidate wet-lab tests by feasibility, safety, information gain, and ability to discriminate among model families.

## How agents should contribute

Start each contribution with a compact research contract:

```text
Question:
Hypothesis:
System and scale:
Observable controls:
Candidate hidden variable or correlation:
Intervention:
Matched control:
Predicted result:
Falsifying result:
Metrics:
Immutable kernel:
Replication plan:
Primary sources:
Status: established claim / reported result / inference / proposal
```

Then choose one bounded deliverable from a workstream. Prefer small experiments that can disconfirm an interpretation. Preserve seeds, dependencies, event histories, prompts, intermediate data, and negative results. Cite primary sources and label every extrapolation.

For code contributions:

1. Open an issue describing the causal question and acceptance test.
2. Keep model dynamics separate from rendering and narration.
3. Record interventions through the shared event layer.
4. Add deterministic tests for the claimed result and its controls.
5. Document the immutable kernel and known confounds.
6. Run lint and the complete test suite before opening a pull request.

## Risks and safeguards

- **Blueprint metaphor.** An explicit target is easy to understand and easy to overgeneralize. Pair it with distributed alternatives as soon as possible.
- **Agency inflation.** Repair, memory, and prediction do not automatically establish life, intelligence, consciousness, or selfhood.
- **Metric reification.** A benchmark score can hide observer choices and confounds. Report intervention profiles and adversarial failures.
- **Simulation-to-biology gap.** In-silico results generate hypotheses; biological claims require biological evidence.
- **Narrative overreach.** The Garden Guide and interface copy should continue to distinguish paper claims, reported evidence, model behaviour, and open questions.
- **Reproducibility drift.** Model, prompt, dependency, and deployment changes should be versioned with replayable experiments.
- **Collaboration governance.** The MIT License establishes reuse terms. Contribution, review, attribution, and maintainer expectations still need a lightweight written policy as collaboration expands.

## A possible long-term shape

Repair Garden can become the first exhibit in a broader Temporal Systems Lab: a collection of interactive, replayable experiments about memory, anticipation, repair, identity, self-reference, and self-modification across physical, biological, computational, and social systems.

Each exhibit would combine:

- an accessible experience that creates a precise question;
- several competing mechanisms capable of similar surface behaviour;
- controlled interventions that distinguish those mechanisms;
- an evidence-aware conversational guide;
- an exportable research record;
- a path from simulation to empirical collaboration.

That structure joins understanding and discovery. A learner can ask why the outcome changed. A researcher can ask which intervention separates two mechanisms. An agent can reproduce the run, challenge the interpretation, implement another model, or search for a biological analogue. The same infrastructure can support all three.

## References and project links

### Primary scientific sources

- Abramsky, S. et al. [*Open Questions about Time and Self-reference in Living Systems*](https://arxiv.org/abs/2508.11423), arXiv v2, 2026. [Full PDF](https://arxiv.org/pdf/2508.11423v2).
- Kolchinsky, A. & Wolpert, D. H. [*Semantic information, autonomous agency, and nonequilibrium statistical physics*](https://arxiv.org/abs/1806.08053), *Interface Focus*, 2018.
- Mordvintsev, A., Randazzo, E., Niklasson, E. & Levin, M. [*Growing Neural Cellular Automata*](https://distill.pub/2020/growing-ca/), *Distill*, 2020.
- Pigozzi, F., Goldstein, A. & Levin, M. [*Associative conditioning in gene regulatory network models increases integrative causal emergence*](https://www.nature.com/articles/s42003-025-08411-2), *Communications Biology*, 2025; author correction published 2026.

### Project

- [Live Repair Garden](https://repair-garden.fly.dev/)
- [Public GitHub repository](https://github.com/matbalez/repair-garden)
- [Project README](./README.md)
