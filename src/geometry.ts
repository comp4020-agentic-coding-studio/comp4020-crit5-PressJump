// Plain geometry in board units. The board is a fixed 160 by 120 box that gets
// letterboxed into whatever viewport is showing it, so every number in the
// simulation and every number in a board definition means the same thing on a
// 1920 desktop and on a 390px phone. Pixels only exist in the view.

export interface Vec {
  x: number;
  y: number;
}

export interface Segment {
  a: Vec;
  b: Vec;
}

export const FIELD = { width: 160, height: 120 } as const;

export function segment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Segment {
  return { a: { x: ax, y: ay }, b: { x: bx, y: by } };
}

/** The point on a segment nearest p. Clamped, so an endpoint is a valid answer. */
export function nearestOn(point: Vec, line: Segment): Vec {
  const dx = line.b.x - line.a.x;
  const dy = line.b.y - line.a.y;
  const span = dx * dx + dy * dy;
  if (span === 0) return line.a;
  let t = ((point.x - line.a.x) * dx + (point.y - line.a.y) * dy) / span;
  t = Math.min(1, Math.max(0, t));
  return { x: line.a.x + dx * t, y: line.a.y + dy * t };
}

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** What a stroke costs: its own length, in board units. */
export function polylineLength(points: readonly Vec[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distance(points[index - 1], points[index]);
  }
  return total;
}

export function polylineSegments(points: readonly Vec[]): Segment[] {
  const lines: Segment[] = [];
  for (let index = 1; index < points.length; index += 1) {
    lines.push({ a: points[index - 1], b: points[index] });
  }
  return lines;
}
