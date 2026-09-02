import { FIELD, type Segment, type Vec, segment } from "./geometry.ts";

// Seven boards, in board units, on the 160 by 120 field.
//
// The order is the tutorial. Board one is a spout and a cup and nothing else,
// so the only thing that can possibly help is a mark on the board; board two
// puts a slope in the way so the world is seen to move the ball too; and from
// there each board asks for one thing the last one taught. Nothing anywhere
// says any of that.

export const CUP_SIDE = 11;

export interface Board {
  /** Where on the top edge the ball drops from. */
  spout: number;
  /** Top left of the cup square. */
  cup: Vec;
  walls: Segment[];
  /**
   * Board one only. After a few seconds of an untouched board, a dotted arc
   * fades in along this line and fades out again, and it is gone for good the
   * moment a pointer goes down. It is the shape of an answer rather than a
   * sentence about one, which is the only kind of teaching this brief allows.
   */
  ghost?: [Vec, Vec];
}

/** The cup is open at the top and solid on its other three sides. */
export function cupWalls(cup: Vec): Segment[] {
  const right = cup.x + CUP_SIDE;
  const floor = cup.y + CUP_SIDE;
  return [
    segment(cup.x, cup.y, cup.x, floor),
    segment(cup.x, floor, right, floor),
    segment(right, cup.y, right, floor),
  ];
}

/** True once the ball is far enough inside the cup to be caught by it. */
export function inCup(at: Vec, cup: Vec): boolean {
  return (
    at.x > cup.x &&
    at.x < cup.x + CUP_SIDE &&
    at.y > cup.y &&
    at.y < cup.y + CUP_SIDE
  );
}

/** Everything solid on a board: its own walls plus the cup it is built around. */
export function boardWalls(board: Board): Segment[] {
  return [...board.walls, ...cupWalls(board.cup)];
}

/** The ball has left play when it is outside the field by more than its own size. */
export function offField(at: Vec): boolean {
  return (
    at.y > FIELD.height + 8 ||
    at.x < -8 ||
    at.x > FIELD.width + 8 ||
    at.y < -60
  );
}

export const BOARDS: Board[] = [
  // 1. A spout, a cup, and one slope already on the board running into it.
  // That slope is the whole tutorial: it is a line, exactly like the ones the
  // player can make, and it is visibly the reason a ball that reaches it ends
  // up in the cup. The gap between the spout and the near end of it is the
  // question. Any mark that bridges that gap answers it, which is why this
  // board has to be the most forgiving one in the game by a distance.
  {
    spout: 22,
    cup: { x: 100, y: 100 },
    walls: [segment(32, 72, 100, 100)],
    ghost: [
      { x: 14, y: 52 },
      { x: 44, y: 74 },
    ],
  },

  // 2. The slope has moved to the ball's end, so now the world starts the
  // journey and the stroke has to finish it. Same idea, opposite half.
  {
    spout: 18,
    cup: { x: 126, y: 96 },
    walls: [segment(6, 38, 58, 52), segment(104, 90, 126, 96)],
  },

  // 3. A pillar in the middle. The stroke can no longer just point at the
  // cup, it has to build enough speed to clear something.
  {
    spout: 18,
    cup: { x: 128, y: 102 },
    walls: [segment(86, 120, 86, 62), segment(100, 92, 128, 102)],
  },

  // 4. A long shelf with the cup partway along it and nothing behind it, so
  // the fast stroke that cleared board three skips the cup and rolls off the
  // end. First board where more speed is the wrong answer.
  {
    spout: 34,
    cup: { x: 92, y: 99 },
    walls: [segment(50, 110, 160, 110)],
  },

  // 5. The cup is behind the spout, and a stub hanging from the ceiling
  // blocks the straight road back. The ball has to be sent under it.
  {
    spout: 132,
    cup: { x: 14, y: 98 },
    walls: [segment(76, 0, 76, 58), segment(46, 90, 25, 98)],
  },

  // 6. A roof with a gap in it. Nothing to do with speed or direction now,
  // only with arriving in the right place.
  {
    spout: 22,
    cup: { x: 72, y: 98 },
    walls: [segment(24, 72, 68, 72), segment(90, 72, 152, 72)],
  },

  // 7. The far corner, past a pillar and under a stub, on whatever ink is
  // left. This is where being frugal on boards one to six pays.
  {
    spout: 12,
    cup: { x: 138, y: 102 },
    walls: [
      segment(70, 120, 70, 88),
      segment(108, 0, 108, 38),
      segment(120, 94, 138, 102),
    ],
  },
];
