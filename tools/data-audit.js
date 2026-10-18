#!/usr/bin/env node
/* Data audit for js/data.js — zero dependencies, committed so numbers stay reproducible.
   Run from the repo root:  node tools/data-audit.js
   It parses the RAW / SPR / LG blocks directly (whitespace-tolerant for all
   Object.assign blocks, not just the first LG literal) and prints the audit. */
"use strict";
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "js", "data.js"), "utf8");

function block(name) {
  const start = src.indexOf(name);
  if (start < 0) throw new Error(name + " block not found");
  const first = src.indexOf("`", start);
  const last = src.indexOf("`", first + 1);
  return src.slice(first + 1, last);
}

const raw = block("const RAW=");
const rows = raw.split("\n").map(l => l.trim()).filter(Boolean);

// 1) total rows + malformed
const fields = rows.map(l => l.split("|"));
const malformed = rows.filter((_, i) => fields[i].length !== 8);
const players = fields.map(f => ({ n: f[0].trim(), nat: f[1], cl: f[4], r: f[7].trim() }));

// 2) duplicate names
const seen = new Set(); const dupes = [];
for (const p of players) { if (seen.has(p.n)) dupes.push(p.n); seen.add(p.n); }

// 3) LG tags — count every `?"code"` pair across ALL LG blocks (Object.assign included)
const lgAll = src.slice(src.indexOf("const LG="));
const pairs = [...lgAll.matchAll(/"([^"]+)"\s*:\s*"(PL|LL|SA|BL|L1|OT)"/g)];
const lg = {};
for (const [, name, code] of pairs) lg[name] = code; // later blocks override, same as Object.assign at runtime
const leagueCounts = {};
for (const code of ["PL", "LL", "SA", "BL", "L1", "OT"]) leagueCounts[code] = Object.values(lg).filter(c => c === code).length;
const totalTagged = Object.values(lg).length;
const noTag = players.filter(p => !lg[p.n]).map(p => p.n);
const tagsForUnknownPlayer = Object.keys(lg).filter(k => !seen.has(k));

// 4) SPR resolution
const spr = block("const SPR=").split("\n").map(l => l.trim()).filter(Boolean);
const sprEntries = spr.map(l => l.split("~")[0].split("|")[0].trim()); // first name|... column before the first marker
const sprUnresolved = sprEntries.filter(n => !seen.has(n));

// 5) tier split by rating flag (0 = current star, 1 = legend)
const stars = players.filter(p => p.r === "0").length;
const legends = players.filter(p => p.r === "1").length;

console.log("== YouKnowBall data audit (tools/data-audit.js) ==");
console.log("total rows:                " + rows.length);
console.log("duplicate names:           " + (dupes.length ? dupes.join(", ") : "0"));
console.log("malformed rows:            " + malformed.length);
console.log("league tags in LG blocks:  " + totalTagged + " (players without a tag: " + noTag.length + ")");
if (noTag.length) console.log("   missing tags for: " + noTag.join(", "));
if (tagsForUnknownPlayer.length) console.log("   tags pointing at unknown players: " + tagsForUnknownPlayer.join(", "));
console.log("league spread:             PL " + leagueCounts.PL + ", LL " + leagueCounts.LL + ", SA " + leagueCounts.SA
  + ", BL " + leagueCounts.BL + ", L1 " + leagueCounts.L1 + ", OT " + leagueCounts.OT
  + "  (sum " + (leagueCounts.PL + leagueCounts.LL + leagueCounts.SA + leagueCounts.BL + leagueCounts.L1 + leagueCounts.OT) + ")");
console.log("SPR entries:               " + sprEntries.length + " (unresolved: " + sprUnresolved.length + ")");
if (sprUnresolved.length) console.log("   unresolved: " + sprUnresolved.join(", "));
console.log("tier split (rating flag):  stars " + stars + " / legends " + legends);
const thin = Object.entries(leagueCounts).sort((a, b) => a[1] - b[1])[0];
console.log("thinnest league pool:      " + thin[0] + " with " + thin[1] + " players");
