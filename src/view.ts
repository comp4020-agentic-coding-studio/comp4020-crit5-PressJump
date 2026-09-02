import { BOARDS, CUP_SIDE, type Board } from "./boards.ts";
import { FIELD, type Vec } from "./geometry.ts";
import { BALL_RADIUS } from "./physics.ts";
import { INK_MAX } from "./rules.ts";

// Everything is drawn in board units and the whole canvas is transformed once
// per resize, so nothing in here or anywhere else does pixel arithmetic. A
// board unit is a board unit on a 1920 desktop and on a 390px phone, which is
// what makes the game the same game at both marking viewports.

/** Room above the field for the ink meter, and below it for the seven pips. */
const TOP = 16;
const BOTTOM = 15;

const METER_Y = 5;
const METER_HEIGHT = 3.5;
const PIP = 5.5;
const PIP_GAP = 4;

export interface Scene {
  board: Board;
  /** Committed strokes, in the order they were drawn. */
  strokes: Vec[][];
  /** The stroke under the pointer right now, if any. */
  drafting: Vec[] | null;
  ball: Vec | null;
  /** What the meter shows, which is the run's ink minus the stroke in progress. */
  ink: number;
  cleared: number;
  /** 0 to 1. Board one's hint, and nothing else in the game uses it. */
  ghost: number;
  ending: "won" | "lost" | null;
  /** 0 to 1, drives the one pulsing mark that says the ending can be dismissed. */
  pulse: number;
}

interface Palette {
  paper: string;
  ink: string;
  line: string;
  brand: string;
}

export interface View {
  render(scene: Scene): void;
  /** Client coordinates to board units. Outside the field is still returned. */
  toBoard(clientX: number, clientY: number): Vec;
  resize(): void;
}

export function mount(canvas: HTMLCanvasElement): View {
  const maybe = canvas.getContext("2d");
  if (!maybe) throw new Error("this browser has no 2d canvas");
  // Narrowing does not survive into the hoisted functions below, so the
  // non-null type gets pinned here once rather than asserted at every use.
  const context: CanvasRenderingContext2D = maybe;

  let scale = 1;
  let originX = 0;
  let originY = 0;
  let palette = read(canvas);

  function resize(): void {
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(box.width * ratio));
    canvas.height = Math.max(1, Math.round(box.height * ratio));

    scale = Math.min(
      box.width / FIELD.width,
      box.height / (FIELD.height + TOP + BOTTOM),
    );
    originX = (box.width - FIELD.width * scale) / 2;

    // The field is one fixed shape at both marking viewports, so the game is
    // the same game on a desktop and on a phone rather than two games that
    // resemble each other. The cost is that a tall phone has slack, since the
    // board always fills the width and a 4:3 field is then only a third of
    // the height. Centring put half that slack above the board and pushed it
    // out of thumb reach; a little way down leaves the rest below it,
    // where a hand already is. On a desktop there is no slack and this is the
    // same as centring.
    const slack = box.height - (FIELD.height + TOP + BOTTOM) * scale;
    originY = slack * 0.12 + TOP * scale;

    context.setTransform(
      scale * ratio,
      0,
      0,
      scale * ratio,
      originX * ratio,
      originY * ratio,
    );
    palette = read(canvas);
  }

  function toBoard(clientX: number, clientY: number): Vec {
    const box = canvas.getBoundingClientRect();
    return {
      x: (clientX - box.left - originX) / scale,
      y: (clientY - box.top - originY) / scale,
    };
  }

  function render(scene: Scene): void {
    const box = canvas.getBoundingClientRect();
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = palette.paper;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();

    context.lineCap = "round";
    context.lineJoin = "round";

    meter(context, palette, scene.ink);
    pips(context, palette, scene.cleared);

    cup(context, palette, scene.board.cup);
    spout(context, palette, scene.board.spout);

    if (scene.ghost > 0 && scene.board.ghost) hint(context, palette, scene);

    context.strokeStyle = palette.ink;
    context.lineWidth = 1.5;
    for (const wall of scene.board.walls) {
      context.beginPath();
      context.moveTo(wall.a.x, wall.a.y);
      context.lineTo(wall.b.x, wall.b.y);
      context.stroke();
    }

    // The player's marks are drawn exactly like the board's own lines, on
    // purpose. Board one's slope has to read as the same kind of thing the
    // player can make, because that resemblance is the only tutorial there is.
    context.lineWidth = 1.9;
    for (const stroke of scene.strokes) polyline(context, stroke);
    if (scene.drafting) polyline(context, scene.drafting);

    if (scene.ball) {
      context.fillStyle = palette.ink;
      context.beginPath();
      context.arc(scene.ball.x, scene.ball.y, BALL_RADIUS, 0, Math.PI * 2);
      context.fill();
    }

    if (scene.ending) ending(context, palette, scene, box, scale);
  }

  new ResizeObserver(resize).observe(canvas);
  resize();

  return { render, toBoard, resize };
}

function read(canvas: HTMLCanvasElement): Palette {
  // The palette lives in styles.css and only there, so the one accent rule is
  // enforceable by reading one file.
  const style = getComputedStyle(canvas);
  const of = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    paper: of("--color-paper", "#f4f1ea"),
    ink: of("--color-ink", "#16151a"),
    line: of("--color-line", "#d8d1c4"),
    brand: of("--color-brand", "#1c6b5b"),
  };
}

function polyline(context: CanvasRenderingContext2D, points: readonly Vec[]) {
  if (points.length < 2) return;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.stroke();
}

function meter(
  context: CanvasRenderingContext2D,
  palette: Palette,
  ink: number,
) {
  const top = -TOP + METER_Y;
  context.fillStyle = palette.line;
  context.fillRect(0, top, FIELD.width, METER_HEIGHT);
  context.fillStyle = palette.brand;
  const width = Math.max(0, Math.min(1, ink / INK_MAX)) * FIELD.width;
  context.fillRect(0, top, width, METER_HEIGHT);
}

function pips(
  context: CanvasRenderingContext2D,
  palette: Palette,
  cleared: number,
) {
  const span = BOARDS.length * PIP + (BOARDS.length - 1) * PIP_GAP;
  let x = (FIELD.width - span) / 2;
  const y = FIELD.height + 6;

  for (let index = 0; index < BOARDS.length; index += 1) {
    if (index < cleared) {
      context.fillStyle = palette.brand;
      context.fillRect(x, y, PIP, PIP);
    } else {
      context.strokeStyle = palette.line;
      context.lineWidth = 1;
      context.strokeRect(x + 0.5, y + 0.5, PIP - 1, PIP - 1);
    }
    x += PIP + PIP_GAP;
  }
}

function cup(context: CanvasRenderingContext2D, palette: Palette, at: Vec) {
  context.fillStyle = palette.brand;
  context.fillRect(at.x, at.y, CUP_SIDE, CUP_SIDE);
}

function spout(context: CanvasRenderingContext2D, palette: Palette, x: number) {
  context.strokeStyle = palette.ink;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(x - 4, 0);
  context.lineTo(x - 4, -5);
  context.moveTo(x + 4, 0);
  context.lineTo(x + 4, -5);
  context.stroke();
}

function hint(
  context: CanvasRenderingContext2D,
  palette: Palette,
  scene: Scene,
) {
  const line = scene.board.ghost;
  if (!line) return;
  context.save();
  context.globalAlpha = scene.ghost * 0.42;
  context.strokeStyle = palette.ink;
  context.lineWidth = 1.6;
  context.setLineDash([3, 4]);
  context.beginPath();
  context.moveTo(line[0].x, line[0].y);
  context.lineTo(line[1].x, line[1].y);
  context.stroke();
  context.restore();
}

function ending(
  context: CanvasRenderingContext2D,
  palette: Palette,
  scene: Scene,
  box: DOMRect,
  scale: number,
) {
  // The whole canvas in board units, so the veil covers the meter and the pips
  // as well as the field.
  const left = -(box.width / scale - FIELD.width) / 2;
  const top = -TOP - 40;

  // Opaque, not a veil. At 93% the finished board showed through as a grey
  // ghost of itself and the ending read as an overlay on a game still going
  // rather than as the end of one.
  context.fillStyle = palette.paper;
  context.fillRect(left, top, box.width / scale, box.height / scale + 80);

  // The same seven marks that were under the board all game, grown large. A
  // run reads as five filled and two empty without a word being spent on it.
  const size = 12;
  const gap = 7;
  const span = BOARDS.length * size + (BOARDS.length - 1) * gap;
  let x = (FIELD.width - span) / 2;
  const y = FIELD.height / 2 - size / 2 - 6;

  for (let index = 0; index < BOARDS.length; index += 1) {
    if (index < scene.cleared) {
      context.fillStyle = palette.brand;
      context.fillRect(x, y, size, size);
    } else {
      context.strokeStyle = palette.line;
      context.lineWidth = 1.4;
      context.strokeRect(x + 0.7, y + 0.7, size - 1.4, size - 1.4);
    }
    x += size + gap;
  }

  // The one thing on this screen that moves, so it is the one thing that
  // reads as pressable. It breathes in size as well as in ink, because a mark
  // that only fades looks like it is going away rather than asking for a hand.
  context.save();
  context.globalAlpha = 0.45 + scene.pulse * 0.55;
  context.fillStyle = palette.brand;
  context.beginPath();
  context.arc(
    FIELD.width / 2,
    y + size + 26,
    3.6 + scene.pulse * 1.8,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}
