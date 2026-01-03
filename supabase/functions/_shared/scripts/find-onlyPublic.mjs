// scripts/find-onlyPublic.mjs
// Recherche "onlyPublic" dans le repo sans ripgrep.
// Usage: node scripts/find-onlyPublic.mjs
// Optionnel: node scripts/find-onlyPublic.mjs onlyPublic

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TERM = (process.argv[2] || "onlyPublic").trim();

const INCLUDE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".json",
]);

const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  ".vercel",
  ".netlify",
  "coverage",
]);

function isBinaryLikely(buf) {
  // Heuristique simple : si beaucoup de NUL bytes, c'est binaire
  let nul = 0;
  const max = Math.min(buf.length, 8000);
  for (let i = 0; i < max; i++) if (buf[i] === 0) nul++;
  return nul > 0;
}

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const ent of entries) {
    const full = path.join(dir, ent.name);

    if (ent.isDirectory()) {
      if (SKIP_DIR.has(ent.name)) continue;
      walk(full, out);
      continue;
    }

    if (!ent.isFile()) continue;

    const ext = path.extname(ent.name).toLowerCase();
    if (!INCLUDE_EXT.has(ext)) continue;

    out.push(full);
  }
}

function findInFile(file, term) {
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    return [];
  }
  if (isBinaryLikely(buf)) return [];

  const text = buf.toString("utf8");
  const lines = text.split(/\r?\n/);

  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const idx = lines[i].indexOf(term);
    if (idx !== -1) {
      // Extrait contextuel : 2 lignes avant/après
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length - 1, i + 2);
      const context = [];
      for (let k = start; k <= end; k++) {
        const prefix = k === i ? ">>" : "  ";
        context.push(`${prefix} ${String(k + 1).padStart(5, " ")} | ${lines[k]}`);
      }
      hits.push({
        line: i + 1,
        col: idx + 1,
        context: context.join("\n"),
      });
    }
  }
  return hits;
}

function rel(p) {
  const r = path.relative(ROOT, p);
  return r || p;
}

function main() {
  const files = [];
  walk(ROOT, files);

  const results = [];
  for (const f of files) {
    const hits = findInFile(f, TERM);
    if (hits.length) results.push({ file: f, hits });
  }

  if (!results.length) {
    console.log(`No matches for "${TERM}" in ${ROOT}`);
    process.exit(0);
  }

  console.log(`Matches for "${TERM}" in ${ROOT}`);
  console.log("=".repeat(80));

  for (const r of results) {
    for (const h of r.hits) {
      console.log(`${rel(r.file)}:${h.line}:${h.col}`);
      console.log(h.context);
      console.log("-".repeat(80));
    }
  }

  console.log(`Total files matched: ${results.length}`);
}

main();
