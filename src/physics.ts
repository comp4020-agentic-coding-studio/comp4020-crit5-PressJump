import { type Segment, type Vec, nearestOn } from "./geometry.ts";

// A circle and a pile of static line segments. That is the whole simulation,
// and it is deliberately hand written rather than pulled from a physics
// library: the only two behaviours the game needs are "bounces" and "rolls
// downhill", and both fall out of splitting the ball's velocity into a normal
// and a tangential part at the point of contact.
//
// STEP is fixed and small on purpose. Feeding requestAnimationFrame deltas
// straight in is the obvious thing to do and it is wrong twice over: the game
// plays differently on a 120Hz phone than on a 60Hz laptop, and a ball moving
// faster than its own radius in one step lands on the far side of a line
// without ever touching it. A player reads that as the game cheating. With
// STEP at 1/240 and speed capped, the ball moves at most MAX_SPEED * STEP,
// which is 1.08 board units, comfortably inside its 2.4 unit radius.
export const STEP = 1 / 240;
export const GRAVITY = 240;
export const MAX_SPEED = 260;
export const BALL_RADIUS = 2.4;

const RESTITUTION = 0.32;

// Small, because it is charged on every contact and contact on a ramp is
// continuous at 240Hz. The first version scrubbed the whole velocity vector
// by 6% per contact and the ball crawled down a 26 degree slope like it was
// rolling through sand. It only scrubs across the surface now, never into it.
const FRICTION = 0.012;

export interface Ball {
  at: Vec;
  velocity: Vec;
}

export function ballAt(x: number, y: number): Ball {
  return { at: { x, y }, velocity: { x: 0, y: 0 } };
}

export function speedOf(ball: Ball): number {
  return Math.hypot(ball.velocity.x, ball.velocity.y);
}

/** One fixed tick. Never call this with a variable timestep. */
export function step(ball: Ball, walls: readonly Segment[]): void {
  ball.velocity.y += GRAVITY * STEP;

  const speed = speedOf(ball);
  if (speed > MAX_SPEED) {
    const scale = MAX_SPEED / speed;
    ball.velocity.x *= scale;
    ball.velocity.y *= scale;
  }

  ball.at.x += ball.velocity.x * STEP;
  ball.at.y += ball.velocity.y * STEP;

  // Twice, because resolving against one line can push the ball into another.
  // A corner between two of the player's strokes is the common case.
  resolve(ball, walls);
  resolve(ball, walls);
}

function resolve(ball: Ball, walls: readonly Segment[]): void {
  for (const wall of walls) {
    const near = nearestOn(ball.at, wall);
    let nx = ball.at.x - near.x;
    let ny = ball.at.y - near.y;
    let gap = Math.hypot(nx, ny);
    if (gap >= BALL_RADIUS) continue;

    if (gap < 1e-6) {
      // Dead centre on the line, so "away from it" has no direction. Use the
      // line's own normal rather than dividing by zero and losing the ball.
      const tx = wall.b.x - wall.a.x;
      const ty = wall.b.y - wall.a.y;
      const span = Math.hypot(tx, ty) || 1;
      nx = -ty / span;
      ny = tx / span;
      gap = 0;
    } else {
      nx /= gap;
      ny /= gap;
    }

    ball.at.x += nx * (BALL_RADIUS - gap);
    ball.at.y += ny * (BALL_RADIUS - gap);

    const into = ball.velocity.x * nx + ball.velocity.y * ny;
    if (into >= 0) continue;

    // Split the velocity at the contact point. The part going into the
    // surface bounces back scaled by RESTITUTION; the part running along it
    // keeps almost all of itself, and that surviving tangential part is the
    // whole reason a ball rolls down a ramp rather than sticking to it.
    const tangentX = ball.velocity.x - into * nx;
    const tangentY = ball.velocity.y - into * ny;
    ball.velocity.x = tangentX * (1 - FRICTION) - into * RESTITUTION * nx;
    ball.velocity.y = tangentY * (1 - FRICTION) - into * RESTITUTION * ny;
  }
}
