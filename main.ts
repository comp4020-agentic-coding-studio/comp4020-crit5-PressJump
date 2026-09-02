import { play } from "./src/game.ts";

// The entry stays small. Everything that is actually the game lives in src/,
// where it can be tested without a canvas anywhere in sight.

const canvas = document.querySelector<HTMLCanvasElement>("#board");
const status = document.querySelector<HTMLElement>("#status");

if (canvas && status) play(canvas, status);
