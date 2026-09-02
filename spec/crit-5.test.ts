import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { BOARDS } from "../src/boards";
import { MIN_STROKE, draw, sink, spill, start } from "../src/rules";

// C5 - A game. These assert the mechanically checkable lines of the published
// spec.
//
// Two kinds of check live here, deliberately. The rules of the game are pure
// functions, so "it can be lost" and "play ends somewhere" are played out
// against the real module rather than grepped for: a test that drains the ink
// and then loses is proof, where a search for the string "lost" is not.
// Everything about the shipped page runs against the BUILT site (dist/), like
// the invariants, because what ships is what gets marked.
//
// Three spec lines are deliberately absent, because no test can hold me to
// them: "a stranger can pick it up and reach an ending inside five minutes",
// "one change you made came from playing the finished game rather than reading
// its code", and "you can account for how you directed, grounded and corrected
// the work". Those are for the pod, who play the thing cold while I stay quiet.
// "Deployed and live" is CI's deploy job, not this file.
const DIST = resolve("dist");

function files(dir: string = DIST): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

const shipped = files().map((path) => relative(DIST, path).split(sep).join("/"));

function shippedText(extension: string): string {
  return shipped
    .filter((name) => name.endsWith(extension))
    .map((name) => readFileSync(join(DIST, name), "utf8"))
    .join("\n");
}

const css = shippedText(".css");

const pages = shipped
  .filter((name) => name.endsWith(".html"))
  .map((name) => {
    const html = readFileSync(join(DIST, name), "utf8");
    return { name, html, doc: new JSDOM(html).window.document };
  });

function page(name: string) {
  const found = pages.find((p) => p.name === name);
  if (!found) throw new Error(`expected ${name} in dist/`);
  return found;
}

/** Everything a reader of this page can see, plus the copy a scraper reads. */
function copy(doc: Document): string {
  const body = doc.body.textContent ?? "";
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  return `${body}\n${description}`;
}

describe("spec: it can be lost", () => {
  // A wrong move is possible. Spending the ink on strokes that do not land the
  // ball is the wrong move, and it is unrecoverable by design.
  it("ends the run when the ball spills with no ink left to fix it", () => {
    let run = start();
    while (run.ink >= MIN_STROKE) run = draw(run, MIN_STROKE);
    expect(run.outcome).toBe("playing");
    expect(spill(run).outcome).toBe("lost");
  });

  it("lets a spill pass while there is still ink to draw with", () => {
    // Falling short is not the loss. Running dry is. Otherwise the first
    // failed attempt would end the game and nobody would learn anything.
    expect(spill(start()).outcome).toBe("playing");
  });

  it("refuses a stroke longer than the ink left, rather than going negative", () => {
    const run = start();
    expect(draw(run, run.ink + 1)).toEqual(run);
    expect(draw(run, run.ink).ink).toBe(0);
  });
});

describe("spec: play ends somewhere", () => {
  it("finishes after the last board", () => {
    let run = start();
    for (let index = 0; index < BOARDS.length; index += 1) {
      expect(run.outcome).toBe("playing");
      run = sink(run);
    }
    expect(run.outcome).toBe("won");
  });

  it("has more than one board, so clearing one is not the whole game", () => {
    expect(BOARDS.length).toBeGreaterThan(1);
  });

  it("does not carry on once the run is over", () => {
    let run = start();
    while (run.ink >= MIN_STROKE) run = draw(run, MIN_STROKE);
    const over = spill(run);
    expect(draw(over, 1)).toEqual(over);
    expect(sink(over)).toEqual(over);
  });
});

describe("spec: it teaches itself", () => {
  // The one line of the brief that cannot be faked. This cannot prove the
  // opening board is legible, but it can prove nothing on the page is doing
  // the teaching in words, which is the failure mode an agent reaches for.
  const INSTRUCTION =
    /\b(how to play|how it works|instructions?|tutorial|controls|your goal|the goal is|objective|the aim is|guide the ball|to begin|to start|get started|click to|tap to|drag to|press to|hold to|draw a line|use your)\b/i;

  for (const { name, doc } of pages) {
    it(`${name} explains nothing`, () => {
      expect(copy(doc).match(INSTRUCTION)?.[0]).toBeUndefined();
    });

    it(`${name} has no modal standing in for a tutorial`, () => {
      expect(doc.querySelectorAll("dialog").length).toBe(0);
      expect(
        doc.querySelector(
          '[class*="tutorial" i], [class*="instruction" i], [id*="howto" i]',
        ),
      ).toBeNull();
    });

    it(`${name} is nearly wordless`, () => {
      // A prose budget, because "no instructions" degrades one helpful
      // sentence at a time. The board is the tutorial, so the page has room
      // for a name and a link and nothing else.
      const words = (doc.body.textContent ?? "").split(/\s+/).filter(Boolean);
      expect(words.length, `${words.length} words on ${name}`).toBeLessThan(15);
    });
  }

  it("the README does not stand in for the instructions either", () => {
    // The brief rules this out by name, and it is the obvious place for the
    // explanation to reappear once the page cannot hold it.
    const readme = readFileSync(resolve("README.md"), "utf8");
    expect(readme.match(INSTRUCTION)?.[0]).toBeUndefined();
  });

  it("ships a playfield rather than a page about one", () => {
    expect(page("index.html").doc.querySelector("canvas")).toBeTruthy();
  });
});

describe("spec: playable at both marking viewports", () => {
  it("takes pointer input", () => {
    expect(shippedText(".js")).toMatch(/pointerdown/);
  });

  it("does not let a drawing gesture scroll the page away", () => {
    expect(
      css,
      "without touch-action, drawing on a phone pans the page instead",
    ).toMatch(/touch-action/);
  });
});

describe("spec: survives the GitHub Pages subpath", () => {
  // base is "./", so a root-absolute internal link resolves to the domain root
  // and 404s under /<repo>/. Passes locally, breaks deployed.
  for (const { name, doc } of pages) {
    it(`${name} uses relative internal links`, () => {
      const bad = [...doc.querySelectorAll("a[href]")]
        .map((a) => a.getAttribute("href") ?? "")
        .filter((href) => href.startsWith("/") && !href.startsWith("//"));
      expect(bad, "root-absolute links break under /<repo>/").toEqual([]);
    });
  }
});

describe("house style", () => {
  // Not from the published spec: standing rules for this prototype, carried
  // from C2 and C4. Tests rather than notes because the agent reaches for an
  // em dash by default, and a form is its reflex answer to any input.
  for (const { name, doc } of pages) {
    it(`${name} contains no em dashes`, () => {
      const offenders = copy(doc)
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.includes("—"));
      expect(offenders).toEqual([]);
    });

    it(`${name} has no form`, () => {
      expect(doc.querySelectorAll("form").length).toBe(0);
    });
  }
});

describe("spec: the repo shows the process", () => {
  it("has this week's reflection, under the name the marker reads", () => {
    expect(existsSync(resolve("reflections/crit-5.md"))).toBe(true);
  });
});
