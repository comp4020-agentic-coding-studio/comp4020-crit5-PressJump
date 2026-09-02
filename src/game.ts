import { type Attempt, advance, drop } from "./attempt.ts";
import { BOARDS, boardWalls } from "./boards.ts";
import {
  FIELD,
  type Segment,
  type Vec,
  distance,
  polylineLength,
  polylineSegments,
} from "./geometry.ts";
import { STEP } from "./physics.ts";
import { MIN_STROKE, type Run, draw, sink, spill, start } from "./rules.ts";
import { type Scene, type View, mount } from "./view.ts";

// The loop, the input and the state that ties the rules to the canvas. The
// rules themselves are next door in rules.ts with no clock and no canvas
// anywhere near them, which is why a whole losing run can be played in a test
// in under a millisecond.

/** Points closer together than this are the same point, for ink and for physics. */
const SAMPLE = 1.3;

/** Beats between one attempt ending and the next ball appearing. */
const AFTER_SPILL = 0.45;
const AFTER_SINK = 0.85;

/** Board one only. How long an untouched board waits before showing its hint. */
const HINT_AFTER = 4;

export function play(canvas: HTMLCanvasElement, status: HTMLElement): void {
  const view: View = mount(canvas);
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  let run: Run = start();
  let board = BOARDS[run.board];
  let walls: Segment[] = boardWalls(board);
  let strokes: Vec[][] = [];
  let attempt: Attempt = drop(board);
  let waiting = 0;

  let drafting: Vec[] | null = null;
  let draftCost = 0;
  let pointer = -1;

  let untouched = 0;
  let everDrew = false;
  let clock = 0;

  let frame = 0;
  let last = 0;
  let carried = 0;
  let onScreen = true;

  function scene(): Scene {
    return {
      board,
      strokes,
      drafting,
      ball: attempt.ended && waiting > 0 ? null : attempt.ball.at,
      ink: run.ink - draftCost,
      cleared: Math.min(run.board, BOARDS.length),
      ghost: ghostAlpha(),
      ending: run.outcome === "playing" ? null : run.outcome,
      pulse: still.matches ? 1 : (Math.sin(clock * 2.4) + 1) / 2,
    };
  }

  function ghostAlpha(): number {
    if (everDrew || board.ghost === undefined) return 0;
    if (untouched < HINT_AFTER) return 0;
    if (still.matches) return 1;
    // Breathes in and out rather than sitting there, so it reads as a
    // suggestion rather than as part of the board.
    return (Math.sin((untouched - HINT_AFTER) * 1.5) + 1) / 2;
  }

  function toBoard(event: PointerEvent): Vec {
    const at = view.toBoard(event.clientX, event.clientY);
    return {
      x: Math.max(0, Math.min(FIELD.width, at.x)),
      y: Math.max(0, Math.min(FIELD.height, at.y)),
    };
  }

  function announce(): void {
    // Nothing visible, and empty in the shipped HTML so the page ships
    // wordless. A screen reader still gets told which board this is and how
    // the run finished, because none of that is an instruction.
    if (run.outcome === "won") status.textContent = "Finished, seven of seven.";
    else if (run.outcome === "lost")
      status.textContent = `Run over, ${run.board} of ${BOARDS.length}.`;
    else status.textContent = `Board ${run.board + 1} of ${BOARDS.length}.`;
  }

  function restart(): void {
    run = start();
    everDrew = true;
    goTo(run.board);
  }

  function goTo(index: number): void {
    board = BOARDS[index];
    walls = boardWalls(board);
    strokes = [];
    attempt = drop(board);
    waiting = 0;
    untouched = 0;
    announce();
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (run.outcome !== "playing") {
      restart();
      return;
    }
    if (pointer >= 0) return;
    pointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    everDrew = true;
    drafting = [toBoard(event)];
    draftCost = 0;
    event.preventDefault();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!drafting || event.pointerId !== pointer) return;
    const at = toBoard(event);
    const from = drafting[drafting.length - 1];
    const added = distance(from, at);
    if (added < SAMPLE) return;

    // Stop extending rather than refusing the whole stroke. A line that will
    // not grow any further with your finger still moving is a clearer way to
    // say the meter is empty than anything written down.
    if (draftCost + added > run.ink) return;

    drafting.push(at);
    draftCost += added;
    event.preventDefault();
  });

  const finish = () => {
    if (!drafting) return;
    const stroke = drafting;
    drafting = null;
    draftCost = 0;
    pointer = -1;

    const cost = polylineLength(stroke);
    if (cost < MIN_STROKE) return;

    const spent = draw(run, cost);
    if (spent === run) return;
    run = spent;
    strokes.push(stroke);
    walls = [...boardWalls(board), ...strokes.flatMap(polylineSegments)];
  };

  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);

  function tick(now: number): void {
    frame = 0;
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    clock += elapsed;
    if (!everDrew) untouched += elapsed;

    if (run.outcome === "playing") simulate(elapsed);
    view.render(scene());
    schedule();
  }

  function simulate(elapsed: number): void {
    if (waiting > 0) {
      waiting -= elapsed;
      if (waiting <= 0) {
        if (attempt.ended === "sunk") {
          const next = run.board;
          if (next < BOARDS.length) goTo(next);
        } else {
          attempt = drop(board);
        }
      }
      return;
    }

    // Fixed steps, always. carried holds the fraction of a step left over
    // from the last frame so the simulation runs at the same rate whatever
    // the display is doing.
    carried = Math.min(carried + elapsed, 0.25);
    while (carried >= STEP) {
      carried -= STEP;
      const ending = advance(attempt, board, walls);
      if (!ending) continue;

      if (ending === "sunk") {
        run = sink(run);
        waiting = AFTER_SINK;
      } else {
        run = spill(run);
        waiting = AFTER_SPILL;
      }
      // The board on screen does not change until the beat between attempts
      // is over, so the board announcement waits for goTo to actually make
      // the change. Only an ended run is worth saying immediately.
      if (run.outcome !== "playing") announce();
      break;
    }
  }

  function schedule(): void {
    if (frame || !onScreen) return;
    frame = requestAnimationFrame(tick);
  }

  function pause(): void {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  // Nothing animates that nobody is looking at, and a ball does not keep
  // falling into a cup in a background tab.
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) {
        last = performance.now();
        schedule();
      } else pause();
    },
    { threshold: 0 },
  ).observe(canvas);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else {
      last = performance.now();
      schedule();
    }
  });

  announce();
  last = performance.now();
  schedule();
}
