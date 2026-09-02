import { describe, expect, it } from "vitest";
import { segment } from "./geometry.ts";
import { MAX_SPEED, STEP, ballAt, speedOf, step } from "./physics.ts";

// The rule these hold the game to is "a line you drew is solid". It sounds
// too obvious to test, which is exactly why it needed one: the version of
// step() that took a frame delta instead of a fixed STEP passed every other
// check in the repo and let a fast ball straight through a stroke. Nothing
// looks more like the game cheating than that.

describe("a drawn line is solid", () => {
  it("cannot be passed through at the fastest speed the game allows", () => {
    // Fired flat out at a wall, from the left. The ball may bounce, roll or
    // stop; the one thing it may never do is end up on the other side.
    const wall = segment(50, -400, 50, 400);
    const ball = ballAt(20, 60);
    ball.velocity.x = MAX_SPEED;

    for (let tick = 0; tick < 900; tick += 1) {
      step(ball, [wall]);
      expect(ball.at.x, `through the wall on tick ${tick}`).toBeLessThan(50);
    }
  });

  it("catches a ball that has been falling for a very long way", () => {
    // Worth having, but read the next test for why it is not the proof it
    // looks like. Deliberately removing the speed cap leaves this one green:
    // an uncapped ball moves further per step than the 4.8 unit window its
    // own radius gives it to be noticed in, so whether it tunnels comes down
    // to where the samples happen to land. Twice I raised the drop height and
    // twice it stayed green by luck. A test whose verdict is a coin toss is
    // not a test, so the cap is asserted directly below instead.
    const floor = segment(-4000, 100, 4000, 100);
    const ball = ballAt(80, -5000);

    for (let tick = 0; tick < 4000; tick += 1) step(ball, [floor]);
    expect(ball.at.y).toBeLessThan(100);
  });

  it("never lets the ball exceed the speed the cap promises", () => {
    // The guarantee the two tests above rest on. Asserted directly, because
    // inferring it from a ball that happened not to escape is what let a
    // missing speed cap through the whole suite once already.
    const ball = ballAt(80, -5000);
    for (let tick = 0; tick < 4000; tick += 1) {
      step(ball, []);
      expect(speedOf(ball)).toBeLessThanOrEqual(MAX_SPEED + 1e-9);
    }
  });
});

describe("the ball behaves like a ball", () => {
  it("rolls downhill rather than sitting on a slope", () => {
    const slope = segment(0, 50, 70, 84);
    const ball = ballAt(10, 40);

    const startX = ball.at.x;
    for (let tick = 0; tick < 240; tick += 1) step(ball, [slope]);
    expect(ball.at.x).toBeGreaterThan(startX + 20);
  });

  it("settles on flat ground instead of bouncing forever", () => {
    const ground = segment(0, 100, 160, 100);
    const ball = ballAt(80, 20);

    for (let tick = 0; tick < 1800; tick += 1) step(ball, [ground]);
    expect(speedOf(ball)).toBeLessThan(3);
    expect(ball.at.y).toBeGreaterThan(94);
    expect(ball.at.y).toBeLessThan(100);
  });

  it("runs on a fixed tick, so a slow frame cannot change the physics", () => {
    // Not a behaviour, a guarantee. STEP is a constant the loop divides real
    // time into, and this fails the moment somebody makes it a parameter.
    expect(STEP).toBeCloseTo(1 / 240);
    expect(MAX_SPEED * STEP).toBeLessThan(2.4);
  });
});
