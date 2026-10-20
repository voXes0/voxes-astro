#!/usr/bin/env node
/**
 * Re-syncs the flower with the art: copies the path data of the flower's paths out of
 * an Inkscape SVG into the `<flower-src>` block of src/fab/pieces/flower.ts.
 *
 *   pnpm fab:flower [art/scene.svg]
 *
 * The paths are found by their ids (the keys in that block: path1, path2, ... as they
 * are in art/scene.svg), so keep the ids when you edit a petal in Inkscape. They must
 * sit at the top level of the file with no transform (as they do now). Dependency-free.
 * Prints which paths changed; nothing else in flower.ts is touched.
 */
import { readFileSync, writeFileSync } from "node:fs";

const svgPath = process.argv[2] ?? "art/scene.svg";
const target = new URL("../src/fab/pieces/flower.ts", import.meta.url);
const ts = readFileSync(target, "utf8");
const block = /(\/\/ <flower-src>[^\n]*\n)const SRC = \{\n([\s\S]*?)\};\n(\/\/ <\/flower-src>)/;
const m = ts.match(block);
if (!m) throw new Error("flower.ts: <flower-src> block not found");
const current = Object.fromEntries(
  [...m[2].matchAll(/^\s*(\w+): "([^"]*)",$/gm)].map((x) => [x[1], x[2]]),
);
const ids = Object.keys(current);

// Walk the SVG tags: remember which <g> transforms are open and each <path>'s own attributes.
const svg = readFileSync(svgPath, "utf8");
const attr = (tag, name) => tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`))?.[1];
const found = {};
const open = [];
for (const t of svg.matchAll(/<(\/?)(g|path)\b[^>]*?(\/?)>/gs)) {
  const [tag, closing, name, selfClosed] = t;
  if (name === "g") {
    if (closing) open.pop();
    else if (!selfClosed) open.push(attr(tag, "transform") ?? "");
    continue;
  }
  const id = attr(tag, "id");
  if (!ids.includes(id)) continue;
  if (open.some(Boolean) || attr(tag, "transform"))
    throw new Error(`${id}: sits inside a transformed group or has a transform; keep the flower paths at the top level with no transform`);
  found[id] = (attr(tag, "d") ?? "").replace(/\s+/g, " ").trim();
}
const missing = ids.filter((id) => !found[id]);
if (missing.length) throw new Error(`not found in ${svgPath}: ${missing.join(", ")} (ids must stay as they are)`);

const changed = ids.filter((id) => found[id] !== current[id]);
const body = ids.map((id) => `  ${id}: ${JSON.stringify(found[id])},\n`).join("");
writeFileSync(target, ts.replace(block, `$1const SRC = {\n${body}};\n$3`));
console.log(changed.length ? `updated: ${changed.join(", ")}` : "flower already matches the art");
