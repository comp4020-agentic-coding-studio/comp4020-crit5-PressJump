import { BOARDS } from "./boards.ts";

// The rules, with no canvas and no clock anywhere near them. Everything the
// game can be judged on lives in these four functions, which is what lets the
// spec tests play a whole losing run in a millisecond.
//
// The economy is the mechanic. Ink is spent by the length of what you draw and
// it does NOT reset between boards, it is topped up. So a board solved with a
// short clever stroke banks the difference against a later one, and a board
// solved by scribbling costs you the board after it. That is the choice that
// has to carry five minutes, and it is legible without a word because the
// meter is right there while you draw.
//
// The top-up is deliberately a little LESS than a comfortable stroke costs.
// At 140 it was more, and the arithmetic quietly refilled the meter faster
// than anyone could spend it: playing through, the bar sat within a few
// percent of full from board one to board seven and the stakes were purely
// decorative. At 80 a run that draws big confident lines visibly drains, a
// run that aims drifts upwards, and neither of those needed explaining.

export const INK_START = 300;
export const INK_TOPUP = 80;
export const INK_MAX = 420;

/** Shorter than this is a tap, not a stroke. Taps cost nothing and draw nothing. */
export const MIN_STROKE = 6;

export type Outcome = "playing" | "won" | "lost";

export interface Run {
  /** Index into BOARDS. */
  board: number;
  ink: number;
  outcome: Outcome;
}

export function start(): Run {
  return { board: 0, ink: INK_START, outcome: "playing" };
}

/** Spend ink on a stroke. A stroke you cannot afford is refused, not clipped. */
export function draw(run: Run, length: number): Run {
  if (run.outcome !== "playing") return run;
  if (length > run.ink) return run;
  return { ...run, ink: run.ink - length };
}

/** The ball reached the cup. */
export function sink(run: Run): Run {
  if (run.outcome !== "playing") return run;
  const board = run.board + 1;
  if (board >= BOARDS.length) return { ...run, board, outcome: "won" };
  return { ...run, board, ink: Math.min(INK_MAX, run.ink + INK_TOPUP) };
}

/**
 * The ball left the field, or came to rest and is never going anywhere. Free
 * while there is ink left, because the first failed attempt is how anyone
 * works out what the ball does. Fatal once there is not, because from there
 * the ball will fail identically forever.
 */
export function spill(run: Run): Run {
  if (run.outcome !== "playing") return run;
  if (run.ink >= MIN_STROKE) return run;
  return { ...run, outcome: "lost" };
}
