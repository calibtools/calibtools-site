#!/usr/bin/env node
/**
 * gen-apriltag.mjs
 *
 * Fetches AprilTag family .c files from the official AprilRobotics GitHub repo,
 * parses the uint64_t codedata[] arrays, and writes JSON dictionary files.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTDIR = join(__dirname, "..", "src", "lib", "dicts");

const BASE = "https://raw.githubusercontent.com/AprilRobotics/apriltag/master";

// The official repo uses "tagStandard41h12" and "tagStandard52h13" for the newer families.
// Output names use the short form (e.g. "41h12") for consistency.
const FAMILIES = [
  { file: "tag16h5.c",           name: "tag16h5",           outKey: "16h5",  nbits: 16, d: 4, minHamming: 5  },
  { file: "tag25h7.c",           name: "tag25h7",           outKey: "25h7",  nbits: 25, d: 5, minHamming: 7  },
  { file: "tag25h9.c",           name: "tag25h9",           outKey: "25h9",  nbits: 25, d: 5, minHamming: 9  },
  { file: "tag36h11.c",          name: "tag36h11",          outKey: "36h11", nbits: 36, d: 6, minHamming: 11 },
  { file: "tagStandard41h12.c",  name: "tagStandard41h12",  outKey: "41h12", nbits: 41, d: 7, minHamming: 12 },
  { file: "tagStandard52h13.c",  name: "tagStandard52h13",  outKey: "52h13", nbits: 52, d: 8, minHamming: 13 },
];

async function fetchSource(filename) {
  // Try repo root first, then apriltag/ subfolder
  const urls = [
    `${BASE}/${filename}`,
    `${BASE}/apriltag/${filename}`,
  ];
  for (const url of urls) {
    const res = await fetch(url);
    if (res.ok) {
      return await res.text();
    }
  }
  return null;
}

function parseCodes(source) {
  // The official files declare: static uint64_t codedata[N] = { ... };
  // Use a greedy match that spans the full array body.
  const arrayMatch = source.match(/uint64_t\s+codedata\s*\[\s*\d*\s*\]\s*=\s*\{([\s\S]*?)\};/);
  if (!arrayMatch) return null;

  const body = arrayMatch[1];
  const codes = [];
  const hexRe = /0x([0-9a-fA-F]+)/g;
  let m;
  while ((m = hexRe.exec(body)) !== null) {
    codes.push(m[1].toLowerCase().padStart(16, "0"));
  }
  return codes;
}

mkdirSync(OUTDIR, { recursive: true });

console.log("=== APRILTAG_CHECKSUMS ===");

for (const fam of FAMILIES) {
  const src = await fetchSource(fam.file);
  if (!src) {
    console.log(`  ${fam.name}: SKIPPED (not found)`);
    continue;
  }

  const codes = parseCodes(src);
  if (!codes || codes.length === 0) {
    console.log(`  ${fam.name}: SKIPPED (no codes parsed)`);
    continue;
  }

  const dict = {
    name: fam.name,
    nbits: fam.nbits,
    d: fam.d,
    minHamming: fam.minHamming,
    count: codes.length,
    codes,
  };

  const outPath = join(OUTDIR, `apriltag-${fam.outKey}.json`);
  writeFileSync(outPath, JSON.stringify(dict, null, 2) + "\n");

  console.log(`  ${fam.name}: count=${codes.length} code0=${codes[0]} code1=${codes[1] ?? "N/A"}  -> ${outPath}`);
}

console.log("=== END APRILTAG_CHECKSUMS ===");
