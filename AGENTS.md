# Project rules
- Stack: TypeScript strict, pnpm workspaces, Babylon.js (client), Colyseus on Node (server), Vitest.
- Gameplay logic lives ONLY in packages/shared. Client and server import it. Never duplicate sim logic.
- packages/shared must not import Babylon, DOM, or Node-only APIs.
- The server is authoritative. Clients send inputs, never state.
- All tunable numbers go in packages/shared/src/constants.ts.
- Use a fixed timestep. No Date.now() or Math.random() in sim code. Use the seeded RNG and tick counters.
- Do not add dependencies without stating why in the PR/summary.
- Every task must: pass `pnpm typecheck`, `pnpm lint`, `pnpm test`; add tests for new sim logic.
- Work on one milestone task at a time. Do not implement features from later milestones.
- Do not use localStorage for anything gameplay-related.
- After each task, summarize: files changed, how to run, how it was verified, open questions.

## Story mode rules
- Story content (beats, dialogue, cutscenes) is JSON under packages/shared/src/content and validated by zod. Do not hardcode story text in code.
- The StoryDirector is server-side and deterministic. Clients never advance the story themselves.
- Cutscene gameplay locks are applied by the server. The camera and visuals are client-only.
- Do not change PvP behavior. Campaign code lives in CampaignRoom and story-specific modules.
