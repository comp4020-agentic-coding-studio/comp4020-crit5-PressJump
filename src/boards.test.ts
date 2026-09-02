import { describe, expect, it } from "vitest";
import { play } from "./attempt.ts";
import { BOARDS } from "./boards.ts";
import { type Vec, polylineLength } from "./geometry.ts";
import { INK_MAX, draw, sink, start } from "./rules.ts";

// One straight stroke per board that lands the ball in the cup, found by
// scripts/solve-boards.ts searching a grid of them and kept here so the fast
// suite can prove the game is still finishable.
//
// This is the check I would have missed. Nudging a pillar four units to make a
// board look better is a one line change that can make it unwinnable, and
// nothing else in the repo would say a word about it: the build is green, the
// page renders, the ball falls. You find out when a player is stuck on board
// six with a full meter of ink and no way through.
const SOLUTIONS: [Vec, Vec][] = [
  [
    { x: 16, y: 16 },
    { x: 28, y: 28 },
  ],
  [
    { x: 16, y: 16 },
    { x: 28, y: 28 },
  ],
  [
    { x: 16, y: 16 },
    { x: 88, y: 40 },
  ],
  [
    { x: 28, y: 16 },
    { x: 52, y: 28 },
  ],
  [
    { x: 52, y: 76 },
    { x: 136, y: 52 },
  ],
  [
    { x: 16, y: 16 },
    { x: 28, y: 28 },
  ],
  [
    { x: 4, y: 40 },
    { x: 112, y: 52 },
  ],
];

describe("every board can be won", () => {
  it("has a known solution for each board", () => {
    expect(SOLUTIONS.length).toBe(BOARDS.length);
  });

  for (const [index, board] of BOARDS.entries()) {
    it(`board ${index + 1} sinks the ball for its pinned stroke`, () => {
      const [from, to] = SOLUTIONS[index];
      expect(play(board, [{ a: from, b: to }])).toBe("sunk");
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
      expect(play(board, [{ a: from, b: to }])).toBe("sunk");
      run = sink(run);
    }

    expect(run.outcome).toBe("won");
  });
});
