import { type Board, boardWalls, inCup, offField } from "./boards.ts";
import type { Segment } from "./geometry.ts";
import { STEP, ballAt, speedOf, step } from "./physics.ts";
import type { Ball } from "./physics.ts";

// One drop of the ball, from the spout to whatever happens to it. The game
// loop and the headless board solver both run through here, so a board that
// the solver says is winnable is winnable with the same arithmetic the player
// gets. Two implementations of "did that go in" would be two chances to be
// wrong about it.

export type Ending = "sunk" | "spilled" | "resting";

/** Slower than this for REST_FOR seconds and the ball is never going anywhere. */
const REST_SPEED = 4;
const REST_FOR = 1.1;

/** A ball still in play after this long is stuck in a pocket of its own making. */
const PATIENCE = 16;

export interface Attempt {
  ball: Ball;
  ended: Ending | null;
  still: number;
  elapsed: number;
}

export function drop(board: Board): Attempt {
  return {
    ball: ballAt(board.spout, -4),
    ended: null,
    still: 0,
    elapsed: 0,
  };
}

/** One fixed tick of an attempt. Returns the ending, if this tick was the end. */
export function advance(
  attempt: Attempt,
  board: Board,
  walls: readonly Segment[],
): Ending | null {
  if (attempt.ended) return attempt.ended;

  step(attempt.ball, walls);
  attempt.elapsed += STEP;

  if (inCup(attempt.ball.at, board.cup)) return end(attempt, "sunk");
  if (offField(attempt.ball.at)) return end(attempt, "spilled");

  attempt.still = speedOf(attempt.ball) < REST_SPEED ? attempt.still + STEP : 0;
  if (attempt.still >= REST_FOR) return end(attempt, "resting");
  if (attempt.elapsed >= PATIENCE) return end(attempt, "resting");

  return null;
}

function end(attempt: Attempt, ending: Ending): Ending {
  attempt.ended = ending;
  return ending;
}

/** Run a whole attempt with no frames involved. The solver and the tests use this. */
export function play(board: Board, stroke: readonly Segment[]): Ending {
  const walls = [...boardWalls(board), ...stroke];
  const attempt = drop(board);
  for (;;) {
    const ending = advance(attempt, board, walls);
    if (ending) return ending;
  }
}
