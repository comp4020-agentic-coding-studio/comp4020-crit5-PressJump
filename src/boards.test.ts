import { describe, expect, it } from "vitest";
import { play } from "./attempt.ts";
import { BOARDS } from "./boards.ts";
import { type Vec, polylineLength, polylineSegments } from "./geometry.ts";
import { INK_MAX, draw, sink, start } from "./rules.ts";

// One straight stroke per board that lands the ball in the cup, found by
// scripts/solve-boards.ts searching a grid of them and kept here so the fast
// suite can prove the game is still finishable.
//
// These are the FASTEST solutions the search found, not the cheapest. The
// first version pinned the cheapest and board seven's was a six degree ramp
// the ball creeps down for eleven seconds. Green suite, and a board that felt
// broken the moment I played it in a browser. Fastest to sink is the closest
// thing the search has to "what a person would actually draw".
//
// This is the check I would have missed. Nudging a pillar four units to make a
// board look better is a one line change that can make it unwinnable, and
// nothing else in the repo would say a word about it: the build is green, the
// page renders, the ball falls. You find out when a player is stuck on board
// six with a full meter of ink and no way through.
/**
 * A stroke as a player actually makes it: a chain of short segments, not one
 * tidy line. The tests used to pass single segments and that hid a collision
 * bug worth a whole board, so they sample now.
 */
function stroke(from: Vec, to: Vec) {
  const points: Vec[] = [];
  for (let index = 0; index <= 24; index += 1) {
    const t = index / 24;
    points.push({
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    });
  }
  return polylineSegments(points);
}

const SOLUTIONS: [Vec, Vec][] = [
  [
    { x: 4, y: 16 },
    { x: 64, y: 88 },
  ],
  [
    { x: 16, y: 28 },
    { x: 124, y: 100 },
  ],
  [
    { x: 16, y: 16 },
    { x: 88, y: 64 },
  ],
  [
    { x: 16, y: 16 },
    { x: 64, y: 64 },
  ],
  [
    { x: 28, y: 100 },
    { x: 158, y: 28 },
  ],
  [
    { x: 4, y: 16 },
    { x: 40, y: 28 },
  ],
  [
    { x: 4, y: 28 },
    { x: 136, y: 100 },
  ],
];

describe("every board can be won", () => {
  it("has a known solution for each board", () => {
    expect(SOLUTIONS.length).toBe(BOARDS.length);
  });

  for (const [index, board] of BOARDS.entries()) {
    it(`board ${index + 1} sinks the ball for its pinned stroke`, () => {
      const [from, to] = SOLUTIONS[index];
      expect(play(board, stroke(from, to))).toBe("sunk");
    });

    it(`board ${index + 1} costs less than a full meter to solve`, () => {
      expect(polylineLength(SOLUTIONS[index])).toBeLessThan(INK_MAX);
    });
  }
});

describe("the whole run can be finished", () => {
  it("plays all seven boards on one meter of ink and wins", () => {
    // The end to end check, with no canvas and no player. It spends real ink
    // through the real rules and drops a real ball down every board, so if
    // the economy is ever tuned to where the game cannot be completed at all,
    // this is what says so.
    let run = start();

    for (const [index, board] of BOARDS.entries()) {
      const [from, to] = SOLUTIONS[index];
      const cost = polylineLength(SOLUTIONS[index]);

      expect(run.ink, `board ${index + 1} is unaffordable`).toBeGreaterThanOrEqual(cost);
      run = draw(run, cost);
      expect(run.outcome).toBe("playing");
      expect(play(board, stroke(from, to))).toBe("sunk");
      run = sink(run);
    }

    expect(run.outcome).toBe("won");
  });
});
