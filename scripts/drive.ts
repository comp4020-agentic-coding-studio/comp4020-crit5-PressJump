#!/usr/bin/env node
// A way to actually look at the game, and to actually play it, from here.
//
// There is no browser automation on this machine, but there is a Chromium
// (Edge), and Chromium will take instructions over its own debugging protocol
// on a socket. So this drives the real page in a real browser: it sets a real
// viewport, dispatches real pointer events at real coordinates, and reads
// back real pixels. Everything the checks in this repo cannot see about a
// game, this can be pointed at.
//
// Used as: node --experimental-strip-types scripts/drive.ts <script.ts>
// where the script exports a default function taking the session.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find((path) => existsSync(path));

const PORT = 9333;

export interface Session {
  send(method: string, params?: Record<string, unknown>): Promise<any>;
  screenshot(path: string): Promise<void>;
  evaluate<T>(expression: string): Promise<T>;
  viewport(width: number, height: number): Promise<void>;
  goto(url: string): Promise<void>;
  drag(points: [number, number][], stepMs?: number): Promise<void>;
  click(x: number, y: number): Promise<void>;
  wait(ms: number): Promise<void>;
  close(): void;
}

export async function open(): Promise<Session> {
  if (!EDGE) throw new Error("no chromium on this machine");
  const profile = mkdtempSync(join(tmpdir(), "drive-"));

  const browser = spawn(
    EDGE,
    [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  const target = await poll(async () => {
    const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const targets = (await response.json()) as {
      type: string;
      webSocketDebuggerUrl?: string;
    }[];
    return targets.find((t) => t.type === "page")?.webSocketDebuggerUrl;
  });

  const socket = new WebSocket(target);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("cdp")), {
      once: true,
    });
  });

  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  >();
  const loaded: (() => void)[] = [];

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const slot = pending.get(message.id)!;
      pending.delete(message.id);
      if (message.error) slot.reject(new Error(JSON.stringify(message.error)));
      else slot.resolve(message.result);
      return;
    }
    if (message.method === "Page.loadEventFired") {
      while (loaded.length) loaded.pop()!();
    }
  });

  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<any>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  const wait = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  const session: Session = {
    send,
    wait,
    async viewport(width, height) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
    },
    async goto(url) {
      const settled = new Promise<void>((resolve) => loaded.push(resolve));
      await send("Page.navigate", { url });
      await settled;
      await wait(350);
    },
    async evaluate<T>(expression: string) {
      const result = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error(JSON.stringify(result.exceptionDetails));
      }
      return result.result.value as T;
    },
    async screenshot(path) {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(path, Buffer.from(shot.data, "base64"));
    },
    async drag(points, stepMs = 16) {
      const [first, ...rest] = points;
      await send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: first[0],
        y: first[1],
        button: "left",
        clickCount: 1,
        buttons: 1,
      });
      for (const [x, y] of rest) {
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x,
          y,
          button: "left",
          buttons: 1,
        });
        await wait(stepMs);
      }
      const last = points[points.length - 1];
      await send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: last[0],
        y: last[1],
        button: "left",
        clickCount: 1,
        buttons: 0,
      });
    },
    async click(x, y) {
      await session.drag([
        [x, y],
        [x, y],
      ]);
    },
    close() {
      socket.close();
      browser.kill();
    },
  };

  return session;
}

async function poll<T>(attempt: () => Promise<T | undefined>): Promise<T> {
  for (let tries = 0; tries < 80; tries += 1) {
    try {
      const value = await attempt();
      if (value) return value;
    } catch {
      // The browser has not opened its socket yet.
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("chromium never came up");
}
