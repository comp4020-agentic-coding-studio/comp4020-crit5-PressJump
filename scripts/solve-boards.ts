#!/usr/bin/env node
// A sensor, not part of the game. For each board it searches straight strokes
// on a coarse grid and reports what it found.
//
// Three things it tells me that nothing else can. That a board is solvable
// for the ink the game hands you, which is invisible until a player is stuck
// on board six with a full meter and no way through. Roughly how forgiving
// each board is, since the share of random lines that work is the difficulty
// curve I would otherwise be guessing at. And which solution to pin into
// src/boards.test.ts.
//
// Which one to pin took two goes to get right, and both were caught by
// playing rather than by reading. Pinning the CHEAPEST gave board seven a six
// degree ramp the ball creeps down for eleven seconds, a real solution no
// player would ever draw. Pinning the FASTEST gave board five a stroke that
// sank the ball here and left it resting against the outside of the cup in a
// real browser, because it was a knife edge with failures on every side of
// it. So the pin is now the most ROBUST one: the win with the most immediate
// neighbours that also win, speed breaking ties. That is the closest this
// search gets to "a stroke somebody could arrive at by aiming".
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

  // How knife edge each win is. A solution whose neighbours on the grid also
  // work is one a person could arrive at by aiming; a solution surrounded by
  // failures is a coincidence, and pinning one of those put a stroke in the
  // test suite that sank the ball headless and left it resting against the
  // outside of the cup in a real browser. Robustness first, speed to break
  // ties.
  const won = new Set(wins.map((win) => key(win.from, win.to)));
  const scored = wins.map((win) => ({
    ...win,
    neighbours: neighbours(win.from, win.to).filter((k) => won.has(k)).length,
  }));

  const best = [...scored].sort(
    (a, b) => b.neighbours - a.neighbours || a.seconds - b.seconds,
  )[0];
  const fastest = [...wins].sort((a, b) => a.seconds - b.seconds)[0];
  const rate = ((wins.length / tried) * 100).toFixed(1);

  console.log(
    `${name}: ${wins.length}/${tried} work (${rate}%)\n` +
      `  pin this  (${best.from.x},${best.from.y}) to (${best.to.x},${best.to.y})` +
      `  ${best.cost.toFixed(1)} ink, sinks in ${best.seconds.toFixed(1)}s,` +
      ` ${best.neighbours} of 8 neighbours also work\n` +
      `  fastest   (${fastest.from.x},${fastest.from.y}) to (${fastest.to.x},${fastest.to.y})` +
      `  ${fastest.cost.toFixed(1)} ink, sinks in ${fastest.seconds.toFixed(1)}s`,
  );
}

/** Grid neighbours are one step along the axes the search moves on. */
function key(from: Vec, to: Vec): string {
  return `${from.x},${from.y},${to.x},${to.y}`;
}

function step(values: number[], value: number, by: number): number | undefined {
  const at = values.indexOf(value);
  return at < 0 ? undefined : values[at + by];
}

function neighbours(from: Vec, to: Vec): string[] {
  const moves: [Vec, Vec][] = [];
  for (const by of [-1, 1]) {
    const fx = step(XS, from.x, by);
    const fy = step(YS, from.y, by);
    const tx = step(XS, to.x, by);
    const ty = step(YS, to.y, by);
    if (fx !== undefined) moves.push([{ x: fx, y: from.y }, to]);
    if (fy !== undefined) moves.push([{ x: from.x, y: fy }, to]);
    if (tx !== undefined) moves.push([from, { x: tx, y: to.y }]);
    if (ty !== undefined) moves.push([from, { x: to.x, y: ty }]);
  }
  // The search only stores each pair once, in the order the loops produced it.
  return moves.flatMap(([a, b]) => [key(a, b), key(b, a)]);
}
