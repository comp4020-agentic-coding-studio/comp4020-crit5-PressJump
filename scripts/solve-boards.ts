#!/usr/bin/env node
// A sensor, not part of the game. For each board it searches straight strokes
// on a coarse grid and reports the cheapest one that lands the ball in the
// cup, plus how many of the strokes it tried worked at all.
//
// Two things it tells me that nothing else can. First, that a board is
// solvable for the ink the game hands you, which is invisible until a player
// is stuck on board six with a full meter and no way through. Second, roughly
// how forgiving each board is: a board where 40% of random lines work is
// board one, and a board where 0.3% work is the last one. That ratio is the
// difficulty curve, and I would otherwise be guessing at it.
//
// Slow (tens of seconds), so it is a script rather than a check. The
// solutions it finds get pinned into src/boards.test.ts, which is fast.
import { play } from "../src/attempt.ts";
import { BOARDS } from "../src/boards.ts";
import { type Vec, polylineLength } from "../src/geometry.ts";
import { INK_MAX } from "../src/rules.ts";

const XS = [4, 16, 28, 40, 52, 64, 76, 88, 100, 112, 124, 136, 148, 158];
const YS = [16, 28, 40, 52, 64, 76, 88, 100];

const points: Vec[] = XS.flatMap((x) => YS.map((y) => ({ x, y })));

for (const [index, board] of BOARDS.entries()) {
  let tried = 0;
  let worked = 0;
  let best: { from: Vec; to: Vec; cost: number } | undefined;

  for (let a = 0; a < points.length; a += 1) {
    for (let b = a + 1; b < points.length; b += 1) {
      const from = points[a];
      const to = points[b];
      const cost = polylineLength([from, to]);
      if (cost > INK_MAX) continue;
      tried += 1;
      if (play(board, [{ a: from, b: to }]) !== "sunk") continue;
      worked += 1;
      if (!best || cost < best.cost) best = { from, to, cost };
    }
  }

  const rate = tried === 0 ? 0 : (worked / tried) * 100;
  if (!best) {
    console.log(`board ${index + 1}: NO straight stroke on the grid solves it`);
    continue;
  }
  console.log(
    `board ${index + 1}: cheapest ${best.cost.toFixed(1)} ink ` +
      `(${best.from.x},${best.from.y}) to (${best.to.x},${best.to.y}) | ` +
      `${worked}/${tried} strokes work (${rate.toFixed(1)}%)`,
  );
}
