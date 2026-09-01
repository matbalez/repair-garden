# Repair Garden

[Repair Garden](https://repair-garden.fly.dev) is an interactive model of repair under hidden-state perturbation. Two matched digital organisms begin with the same visible tissue and the same internal target. A visitor gives them the same wound and repair schedule, changes the left organism's hidden future target, and then repeats a matched wound to see whether regeneration diverges.

The experiment makes a specific causal question visible: can two organisms with the same visible anatomy respond differently because an internal control state has changed?

## Try the experiment

1. Apply a shared random calibration wound to both Motes.
2. Advance their repair together with **Step +1**, **Step +5**, or **Continue**.
3. Choose Bloom, Bilobe, or Crescent as the left Mote's `next_target_shape`. The right Mote remains the untreated control.
4. Apply another shared random wound and advance the same schedule on both sides.
5. Compare regeneration inside the damaged region.

The target overlay is visible by default, and the Garden Guide answers questions using the current experiment state and the research sources behind the project.

## What the model does

- Starts with two identical visible bodies and identical internal target fields.
- Applies the same randomly placed lesion to both sides.
- Restricts repair updates to cells inside the lesion.
- Lets the visitor perturb one named hidden variable on the left side.
- Keeps both branches synchronized for step-by-step comparison.
- Adds continuous, organic display motion without advancing the repair model.

This is an engineered cellular model with an explicit target field. It demonstrates a possible causal structure; it does not establish that real cells store anatomical targets in this form. Mote has no learning rule. Its body motion is visual, while repair changes only when the model advances.

## Research sources

- [Time, self-reference, and the biological construction of identity](https://arxiv.org/pdf/2508.11423v2)
- [Semantic information](https://arxiv.org/abs/1806.08053)
- [Growing Neural Cellular Automata](https://distill.pub/2020/growing-ca/)
- [Learning in gene-regulatory networks](https://www.nature.com/articles/s42003-025-08411-2)

## Project structure

- `app/repair-garden.tsx` — experiment interface, rendering, narration, and Garden Guide
- `app/api/guide/route.ts` — server-side OpenAI connection with public-endpoint safeguards
- `lib/garden-model.ts` — local repair dynamics, target shapes, wounds, and measurements
- `lib/research-guide.ts` — research-grounded instructions and model limits
- `tests/` — deterministic model, interface, and guide tests
- `vendor/packages/` — packed `@temporal-self/core` dependency for reproducible installs

## Run locally

Requires Node.js 22.13 or newer.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Add an OpenAI API key to `.env.local` to enable the Garden Guide. The simulation itself runs without an API key.

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
```

Before publishing changes:

```bash
npm run lint
npm test
```

## Deploy to Fly.io

The repository includes a production Dockerfile and `fly.toml` for the `repair-garden` Fly app.

```bash
fly apps create repair-garden
fly secrets set OPENAI_API_KEY=your_key_here
fly deploy
```

The API key is supplied as a Fly secret and is never bundled into the browser or committed to Git.
