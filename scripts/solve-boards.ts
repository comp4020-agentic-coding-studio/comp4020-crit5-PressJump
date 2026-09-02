#!/usr/bin/env node
// A sensor, not part of the game. For each board it searches straight strokes
// on a coarse grid and reports what it found: how many work at all, the one
// that lands the ball soonest, and the one that costs least ink.
//
// Three things it tells me that nothing else can. That a board is solvable
// for the ink the game hands you, which is invisible until a player is stuck
// on board six with a full meter and no way through. Roughly how forgiving
// each board is, since the share of random lines that work is the difficulty
// curve I would otherwise be guessing at. And which solution to pin into
// src/boards.test.ts.
//
// Pin the FASTEST, never the cheapest. Cheapest picks degenerate answers: on
// board seven it found a six degree ramp across the whole board that the ball
// creeps down for eleven seconds. It is a real solution and no player would
// ever draw it, so pinning it made the suite green while the board felt
// broken to play.
//
// Strokes are sampled into a chain of short segments, because that is what
// comes off a finger and a single tidy segment does not behave the same way.
import { advance, drop } from "../src/attempt.ts";
import { BOARDS, type Board, boardWalls } from "../src/boards.ts";
import { type Vec, polylineLength, polylineSegments } from "../src/geometry.ts";
import { INK_MAX } from "../src/rules.ts";

const XS = [4, 16, 28, 40, 52, 64, 76, 88, 100, 112, 124, 136, 148, 158];
const YS = [16, 28, 40, 52, 64, 76, 88, 100];

const points: Vec[] = XS.flatMap((x) => YS.map((y) => ({ x, y })));

function sample(from: Vec, to: Vec): Vec[] {
  const path: Vec[] = [];
  for (let index = 0; index <= 24; index += 1) {
    const t = index / 24;
    path.push({
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    });
  }
  return path;
}

function attempt(board: Board, from: Vec, to: Vec) {
  const walls = [...boardWalls(board), ...polylineSegments(sample(from, to))];
  const ball = drop(board);
  for (;;) {
    const ending = advance(ball, board, walls);
    if (ending) return { ending, seconds: ball.elapsed };
  }
}

for (const [index, board] of BOARDS.entries()) {
  let tried = 0;
  const wins: { from: Vec; to: Vec; cost: number; seconds: number }[] = [];

  for (let a = 0; a < points.length; a += 1) {
    for (let b = a + 1; b < points.length; b += 1) {
      const from = points[a];
      const to = points[b];
      const cost = polylineLength([from, to]);
      if (cost > INK_MAX) continue;
      tried += 1;
      const result = attempt(board, from, to);
      if (result.ending === "sunk") {
        wins.push({ from, to, cost, seconds: result.seconds });
      }
    }
  }

  const name = `board ${index + 1}`;
  if (wins.length === 0) {
    console.log(`${name}: NO straight stroke on the grid solves it`);
    continue;
  }

  const fastest = [...wins].sort((a, b) => a.seconds - b.seconds)[0];
  const cheapest = [...wins].sort((a, b) => a.cost - b.cost)[0];
  const rate = ((wins.length / tried) * 100).toFixed(1);

  console.log(
    `${name}: ${wins.length}/${tried} work (${rate}%)\n` +
      `  pin this  (${fastest.from.x},${fastest.from.y}) to (${fastest.to.x},${fastest.to.y})` +
      `  ${fastest.cost.toFixed(1)} ink, sinks in ${fastest.seconds.toFixed(1)}s\n` +
      `  cheapest  (${cheapest.from.x},${cheapest.from.y}) to (${cheapest.to.x},${cheapest.to.y})` +
      `  ${cheapest.cost.toFixed(1)} ink, sinks in ${cheapest.seconds.toFixed(1)}s`,
  );
}
