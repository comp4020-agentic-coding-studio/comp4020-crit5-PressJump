# Ink

A small browser game, built for COMP4020 crit 5. Seven boards, one meter of
ink, and a ball that falls.

Nothing in here says how it is played, and that is deliberate. The brief rules
that out anywhere, on screen or off, and a README is the obvious place for it
to reappear once the page is not allowed to carry it. `spec/crit-5.test.ts`
fails the build on either.

`PROCESS.md` is the account of how it was built, and it does give the game
away, so read the deployed page first if you would rather meet it cold.

## The sensors in here

- `pnpm check` runs the typecheck, the build, both linters and the tests.
- `node --experimental-strip-types scripts/solve-boards.ts` searches every
  board for strokes that land the ball, and reports how many work, which is
  the difficulty curve. The solutions it finds are pinned in
  `src/boards.test.ts` so `check` can prove the game is still finishable.
- `scripts/drive.ts` drives the real page in a real Chromium over the
  debugging protocol, at a real viewport, with real pointer events. It is how
  the parts of a game that no check can see get looked at.

## CI and Pages only turn on when you ship

Your repo starts private, and both CI jobs (`check` and `deploy`) are gated on
it being public. While private, a push to `main` runs nothing in CI ---
`pnpm check` (below) is your feedback loop until then. When you're ready, the
course's `/ship` skill flips the repo public, turns on GitHub Pages, and
dispatches the deploy for you; there's nothing to configure in the Pages
settings yourself. From that point, every push to `main` builds and deploys, and
the deploy step prints your live URL and checks it returns 200.

## What gets marked

The deployed site is the deliverable, assessed live in Chrome at two fixed
viewports --- see the course website's
[assessment page](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#marking-environment)
for the details.

## Quick start

```sh
mise install       # supported path: install the template's Node and pnpm
pnpm install
pnpm dev             # local dev server
pnpm check           # most of what CI runs (links, secrets and deploy are CI-only)
pnpm check:evidence  # the process-evidence check CI runs before you ship
pnpm build           # produce dist/ (what gets deployed)

# reproduce CI's links check before you push
pnpm dlx linkinator ./dist --silent --skip "^https?://(?!localhost|127)"
```

`mise` is the course's recommended runtime manager. If you use another manager
or the official installers, that is fine: provide the Node and pnpm versions in
`mise.toml`, then run the same commands. Tutor support reproduces runtime
problems with mise.

## What's here

- `index.html`, `styles.css`, `main.ts` --- a minimal starting site. Replace it.
- `mise.toml` --- the tested Node and pnpm versions for this template.
- `spec/` --- what the checks are for (`README.md`) and the shipped invariants
  (`invariants.test.ts`); the spec tests you write live alongside them.
- `CLAUDE.md` --- orients whoever works in this repo, you or a coding agent.
  Yours to grow.
- `PROCESS.md` --- a template for your process overview, showing the
  cited-moment format. Replace it with your own; `pnpm check:evidence` verifies
  your citations resolve.
- `.github/workflows/checks.yml` --- the CI sensors that run on every push once
  your repo is public, and the GitHub Pages deploy.
- `.githooks/pre-commit` --- blocks any commit that contains something shaped
  like an API key, so your COMP4020 key can't end up in a public repo. Installed
  automatically by `pnpm install`.

This template is SSG-agnostic: plain HTML/CSS/TypeScript on Vite, so you can add
Astro, Eleventy, or any static generator later without changing how it deploys.
The course plugin's `stack` skill performs the swap for you — to the course
default (Astro) or bare HTML/CSS — with the Pages base path, lockfile, and CI
link check handled.

See the course site for how the checks map to each week of the course.
