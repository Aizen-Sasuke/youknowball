#!/usr/bin/env node
/* YouKnowBall data validator — plain Node ESM, zero dependencies.
   Loads js/data.js exactly the way the app does (plain script defining RAW, SPR, LG)
   and asserts the invariants the game relies on. Non-zero exit on any failure. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, "..", "js", "data.js");
const src = readFileSync(file, "utf8");

let data;
try {
  data = new Function(src + ";\nreturn { RAW, SPR, LG, CURRENT, DATA_UPDATED };")();
} catch (e) {
  console.error("FAIL  data.js does not evaluate:", e.message);
  process.exit(1);
}
const { RAW, SPR, LG, CURRENT, DATA_UPDATED } = data;

const LEAGUES = new Set(["PL", "LL", "SA", "BL", "L1", "OT"]);
const EXPECTED_ROWS = 279;

const fails = [];
let shown = 0;
const ok = (name, detail) => console.log("PASS  " + name + (detail ? "  — " + detail : ""));
const bad = (name, detail) => { console.log("FAIL  " + name + "  — " + detail); fails.push(name); };

// ---- parse RAW rows the same way app.js does (8 pipe-separated columns) ----
const rows = RAW.split("\n").map(l => l.trim()).filter(Boolean);
const recs = rows.map(l => {
  const f = l.split("|");
  return {
    line: l,
    n: (f[0] || "").trim(),
    nat: (f[1] || "").trim(),
    pos: (f[2] || "").trim(),
    yr: (f[3] || "").trim(),
    cl: (f[4] || "").trim(),
    fact: (f[5] || "").trim(),
    x: (f[6] || "").trim(),
    r: (f[7] || "").trim(),
    arity: f.length
  };
});

// ---- row count ----
if (recs.length === EXPECTED_ROWS) ok("row count", recs.length + " players (expected " + EXPECTED_ROWS + ")");
else bad("row count", "got " + recs.length + ", expected " + EXPECTED_ROWS);

// ---- duplicate names ----
{
  const seen = new Map();
  for (const p of recs) { if (seen.has(p.n)) seen.get(p.n).push(p); else seen.set(p.n, [p]); }
  const dups = [...seen.entries()].filter(([, v]) => v.length > 1);
  if (!dups.length) ok("no duplicate names", seen.size + " unique names");
  else bad("no duplicate names", dups.map(([k, v]) => k + " (" + v.length + "x)").join(", "));
}

// ---- column shape ----
{
  const badArity = recs.filter(p => p.arity !== 8);
  if (!badArity.length) ok("every row has 8 pipe-separated fields");
  else bad("every row has 8 pipe-separated fields", badArity.slice(0, 3).map(p => p.n + " has " + p.arity).join(", ") + (badArity.length > 3 ? " +" + (badArity.length - 3) + " more" : ""));
}

// ---- empty required fields (name, nationality, position, year, clubs, fact) ----
{
  const empties = [];
  for (const p of recs) {
    if (!p.n) empties.push("row " + (recs.indexOf(p) + 1) + ": name");
    if (!p.nat) empties.push(p.n || "row " + (recs.indexOf(p) + 1) + ": nationality");
    if (!p.pos) empties.push(p.n || "row " + (recs.indexOf(p) + 1) + ": position");
    if (!/^\d{4}$/.test(p.yr)) empties.push(p.n || "row " + (recs.indexOf(p) + 1) + ": year not 4 digits ('" + p.yr + "')");
    if (!p.cl) empties.push(p.n || "row " + (recs.indexOf(p) + 1) + ": clubs");
    if (!p.fact || /^Fact~\s*$/.test(p.fact) || /~\s*$/.test(p.fact)) empties.push(p.n || "row " + (recs.indexOf(p) + 1) + ": fact text empty");
  }
  if (!empties.length) ok("no empty required fields");
  else bad("no empty required fields", empties.length + " problem(s): " + empties.slice(0, 5).join("; ") + (empties.length > 5 ? "; ..." : ""));
}

// ---- every player has a league tag: LG covers RAW completely ----
{
  const missing = recs.filter(p => !(p.n in LG));
  const stray = Object.keys(LG).filter(k => !recs.some(p => p.n === k));
  if (!missing.length) ok("every player has a league tag");
  else bad("every player has a league tag", missing.length + " missing: " + missing.slice(0, 6).map(p => p.n).join(", ") + (missing.length > 6 ? " ..." : ""));
  if (!stray.length) ok("no stray LG keys");
  else bad("no stray LG keys", stray.length + " not in RAW: " + stray.slice(0, 6).join(", ") + (stray.length > 6 ? " ..." : ""));
}

// ---- league codes within the known set ----
{
  const badCodes = Object.entries(LG).filter(([, v]) => !LEAGUES.has(v));
  if (!badCodes.length) ok("league codes within {PL, LL, SA, BL, L1, OT}");
  else bad("league codes within {PL, LL, SA, BL, L1, OT}", badCodes.slice(0, 6).map(([k, v]) => k + "=\"" + v + "\"").join(", "));
}

// ---- SPR entries resolve to real players ----
{
  const names = new Set(recs.map(p => p.n));
  const spLines = SPR.split("\n").map(l => l.trim()).filter(Boolean);
  const unknown = [];
  for (const l of spLines) {
    const n = (l.split("~")[0] || "").trim();
    if (n && !names.has(n)) unknown.push(n);
  }
  SPR.split("\n").map(l => l.trim()).filter(Boolean).length; // (reported below)
  if (!unknown.length && spLines.length) ok("every SPR entry resolves to a real player", spLines.length + " special entries");
  else if (!spLines.length) bad("every SPR entry resolves to a real player", "SPR is empty");
  else bad("every SPR entry resolves to a real player", unknown.length + " unknown: " + unknown.slice(0, 6).join(", ") + (unknown.length > 6 ? " ..." : ""));
}

// ---- tier values only "0" or "1" ----
{
  // tier column is `r` (last field); app stores tier:+r and treats non-1 as hard tier 2
  const badTier = recs.filter(p => !["0", "1"].includes(p.r));
  if (!badTier.length) ok("tier values only \"0\" or \"1\"");
  else bad("tier values only \"0\" or \"1\"", badTier.slice(0, 6).map(p => p.n + "=\"" + p.r + "\"").join(", ") + (badTier.length > 6 ? " +" + (badTier.length - 6) : ""));
}

// ---- Wikidata enrichment: DATA_UPDATED is a plain ISO date ----
{
  if (typeof DATA_UPDATED === "string" && /^\d{4}-\d{2}-\d{2}$/.test(DATA_UPDATED)
      && !Number.isNaN(Date.parse(DATA_UPDATED)))
    ok("DATA_UPDATED is a valid YYYY-MM-DD date", DATA_UPDATED);
  else bad("DATA_UPDATED is a valid YYYY-MM-DD date", "got " + JSON.stringify(DATA_UPDATED));
}

// ---- Wikidata enrichment: CURRENT keys resolve to real players and carry a value ----
{
  const names = new Set(recs.map(p => p.n));
  const entries = Object.entries(CURRENT || {});
  const stray = entries.filter(([k]) => !names.has(k)).map(([k]) => k);
  const empty = entries.filter(([, v]) => typeof v !== "string" || !v.trim()).map(([k]) => k);
  const retired = entries.filter(([, v]) => v === "Retired").length;
  if (!entries.length) bad("CURRENT has entries", "CURRENT is empty");
  else if (stray.length) bad("every CURRENT key resolves to a real player", stray.length + " stray: " + stray.slice(0, 6).join(", ") + (stray.length > 6 ? " ..." : ""));
  else ok("every CURRENT key resolves to a real player", entries.length + " entries (" + retired + " retired, " + (entries.length - retired) + " current clubs)");
  if (empty.length) bad("every CURRENT value is a non-empty string", empty.slice(0, 6).join(", "));
  else if (entries.length) ok("every CURRENT value is a non-empty string");
}

console.log("");
if (fails.length) {
  console.error(fails.length + " check(s) FAILED: " + fails.join(", "));
  process.exit(1);
}
console.log("All data checks passed — " + recs.length + " players, " + Object.keys(LG).length + " league tags, " + SPR.split("\n").filter(l => l.trim()).length + " special clues, " + Object.keys(CURRENT || {}).length + " current-club entries.");
