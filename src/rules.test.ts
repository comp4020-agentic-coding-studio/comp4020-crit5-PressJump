import { describe, expect, it } from "vitest";
import { BOARDS } from "./boards.ts";
import {
  INK_MAX,
  INK_START,
  INK_TOPUP,
  MIN_STROKE,
  draw,
  sink,
  spill,
  start,
} from "./rules.ts";

// The focused test the spec asks for, on the one rule the whole game turns on:
// what ink costs and what it buys. The spec file next door proves the run can
// be lost and can be finished. This one is about the economy in between, which
// is the part that has to stay interesting for five minutes.

describe("ink is spent by the length of what you draw", () => {
  it("charges a stroke its own length", () => {
    expect(draw(start(), 40).ink).toBe(INK_START - 40);
  });

  it("charges a long stroke more than a short one", () => {
    expect(draw(start(), 80).ink).toBeLessThan(draw(start(), 20).ink);
  });

  it("refuses a stroke it cannot pay for, and charges nothing for refusing", () => {
    const nearlyDry = draw(start(), INK_START - 10);
    expect(draw(nearlyDry, 30)).toEqual(nearlyDry);
    expect(draw(nearlyDry, 30).ink).toBe(10);
  });
});

describe("what is left over is carried, not reset", () => {
  it("banks the difference between a frugal board and a wasteful one", () => {
    // The whole reason to think before drawing. Two players clear board one;
    // the one who spent less arrives at board two with more.
    const frugal = sink(draw(start(), 30));
    const wasteful = sink(draw(start(), 120));
    expect(frugal.ink - wasteful.ink).toBe(90);
    expect(frugal.board).toBe(wasteful.board);
  });

  it("tops the meter up on the way into the next board", () => {
    const spent = draw(start(), 150);
    expect(sink(spent).ink).toBe(INK_START - 150 + INK_TOPUP);
  });

  it("caps the meter, so hoarding has a ceiling", () => {
    // Without this, a player who solves the early boards cheaply arrives at
    // board seven unable to lose, and the last third of the game is over
    // before it starts.
    expect(sink(start()).ink).toBe(INK_MAX);
    expect(INK_START + INK_TOPUP).toBeGreaterThan(INK_MAX);
  });
});

describe("running dry is what ends a run", () => {
  it("survives a failed attempt while there is still ink", () => {
    const halfway = draw(start(), INK_START / 2);
    expect(spill(halfway).outcome).toBe("playing");
    expect(spill(halfway).ink).toBe(halfway.ink);
  });

  it("ends the run on the first spill after the ink runs out", () => {
    const dry = draw(start(), INK_START - MIN_STROKE + 1);
    expect(dry.outcome).toBe("playing");
    expect(spill(dry).outcome).toBe("lost");
  });

  it("leaves enough ink to be worth a stroke before calling it lost", () => {
    // The boundary. Exactly MIN_STROKE left is still a playable position,
    // because a stroke that long is still a stroke.
    const edge = draw(start(), INK_START - MIN_STROKE);
    expect(edge.ink).toBe(MIN_STROKE);
    expect(spill(edge).outcome).toBe("playing");
  });
});

describe("the ladder", () => {
  it("is long enough to teach something and short enough to finish", () => {
    // Five minutes is the brief. Boards take well under a minute each once
    // the mechanic has landed, and seven of them is the most that fits.
    expect(BOARDS.length).toBe(7);
  });

  it("gives every board a cup inside the field and a spout above it", () => {
    for (const [index, board] of BOARDS.entries()) {
      expect(board.spout, `board ${index + 1} spout`).toBeGreaterThan(0);
      expect(board.spout, `board ${index + 1} spout`).toBeLessThan(160);
      expect(board.cup.y, `board ${index + 1} cup`).toBeGreaterThan(60);
      expect(board.cup.y, `board ${index + 1} cup`).toBeLessThan(120);
    }
  });

  it("only shows the ghost on the first board", () => {
    // A hint on board four would be an instruction wearing a costume.
    expect(BOARDS.filter((board) => board.ghost).length).toBe(1);
    expect(BOARDS[0].ghost).toBeTruthy();
  });
});
