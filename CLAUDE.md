# COMP4020 prototype

Your starter repo for a COMP4020 prototype: a static site in HTML/CSS/TypeScript
that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The deployed site
is what gets marked, not this repo.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec, and this repo's name tells you
which deliverable applies. Read both before you plan or build.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so the deployed head is the only place a broken one shows up.

## The checks

`pnpm check` runs them, and `pnpm check:evidence` is the extra gate before you
ship. CI runs the same plus links, secrets and the deploy.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## This file is yours

A starting point, not a rulebook: what you add to it is the harness, and the
harness is assessed. This file and the sensors you wire into `check` carry
across the course --- both come with you into next week's repo. The prototype
doesn't: source, and the tests answering this week's published spec, stay
behind. `spec/README.md` draws the line.

## Rules for this prototype (C5 --- a game)

Carried forward from C1, C2, A1 and C4: corrections that stuck, so they live
here rather than in another prompt. Carry this section forward to the next repo.

**The intent behind most of them: do not let the work look generated.** Accent
bars on every panel, a second colour for variety, and em dashes in every other
sentence are the tells. Plain, flat and restrained reads as normal work; the
default output does not.

### Copy and look

- **No em dashes and no colons in page copy, or in the reflection.** Use a
  comma, a semicolon or a full stop. `spec/crit-5.test.ts` fails the build on an
  em dash, because the agent reaches for one by default. Code comments are
  exempt; nobody reads those on the page. The reflection is not deployed but it
  is read, and a colon mid-sentence is the same tell.
- **One accent colour.** One hue plus the neutrals is the whole palette. Do not
  introduce a second hue for warnings, emphasis or variety. Weight, fill and
  scale carry emphasis instead.
- **No accent bar on any edge of a panel.** Not left, not top, not bottom, not
  right. A panel is a fill plus a hairline border, and emphasis comes from the
  heading and the fill.
- **Flat means flat.** Solid fills and hairline borders carry the depth. No
  gradients, no drop shadows.

### The build

- **Internal links must be relative** (`./about.html`, not `/about.html`).
  Vite's `base` is `./`, so a root-absolute link works on the dev server and
  404s under `<user>.github.io/<repo>/`. `spec/crit-5.test.ts` enforces this.
- **No `<form>` elements.** The site is static with no backend, so a form could
  only pretend to send.
- **Everything ships in the bundle.** No CDN scripts, no remote fonts, no remote
  images, no runtime `fetch`. A network dependency is a way for the deployed
  page to be broken while the local one looks fine.
- **Animation must stop when it is not being watched.** Anything animating
  pauses off screen (IntersectionObserver) and on `visibilitychange`, and
  honours `prefers-reduced-motion`. Precompute geometry; never rebuild it per
  frame.
- **Keep heavy data out of the entry.** `main.ts` stays small. Anything large
  loads behind a dynamic import, so a page that does not need it does not pay
  for it.

### Testing

- **A new test must first catch a deliberate bug.** Green on first run proves
  nothing about a test's teeth. Break the thing the test is meant to forbid,
  watch it fail, then restore. Added in A1 after four property tests all stayed
  green while the central mechanic was deleted.
- **Small screens are proven on a real phone.** 390px, no horizontal overflow.
  An emulated viewport is not proof on its own; an emulated 375px check once
  passed while a real phone showed a desktop page scaled up.

### This week

- **No instructions, anywhere.** No how-to copy on the page, no modal, no
  instructions section, nothing in the README standing in for one, and no
  tooltip doing it quietly. The opening board has to make the first move obvious
  with a shape rather than a sentence, and play teaches the rest.
  `spec/crit-5.test.ts` fails the build on instruction-shaped copy, because that
  copy is exactly what an agent adds when it thinks it is being helpful.
- **It can be lost, and it ends.** A wrong move has to be possible and play has
  to finish somewhere. An endless sandbox is last week's brief, not this one.
- **The simulation runs on a fixed timestep, never on frame time.** Substep it
  and the physics is the same on a 60Hz laptop, a 120Hz phone and in a test with
  no frames at all. Feed `requestAnimationFrame` deltas straight into it and a
  fast ball tunnels through a thin line, which reads to a player as the game
  cheating.
- **Trust the hand over the test suite.** Whether a board is fair, whether the
  ball is heavy enough, whether a stranger knows what to do in ten seconds. None
  of that shows up in a check. Play it before calling anything done.
- **This repo is not pushed.** No `git push`, no `/comp4020:ship`, no flipping
  it public, without being asked. The work stays local by the student's choice.
