// Validates the content files.  Usage:  node check.js            (all phases)
//                                       node check.js 3 4        (only phases 3 and 4)
const fs = require("fs");
const path = require("path");
const dir = __dirname;
global.ROADMAP = [];
global.EXTRAS = {};
global.T = (t, d, u, c, h, n) => ({ t, d, u, c: (c || "").trim(), h, n: n || "" });
global.X = (t, d, k, u, c, h, l) => { const o = T(t, d, u, c, h); o.k = k || []; o.l = l || []; return o; };
global.EXTRA = (n, title, o) => {
  const key = n + "|" + title;
  if (EXTRAS[key]) problems.push("DUPLICATE entry: " + key);
  EXTRAS[key] = o;
};
const problems = [];
for (let i = 1; i <= 30; i++) {
  const f = path.join(dir, "data" + i + ".js");
  if (!fs.existsSync(f)) continue;
  try { eval(fs.readFileSync(f, "utf8")); } catch (e) { problems.push("SYNTAX ERROR in data" + i + ".js: " + e.message); }
}
for (const p of ROADMAP) for (const t of p.topics) {
  if (!t.t || !t.d || !t.u || !t.c || !t.h) problems.push("phase " + p.n + " / " + t.t + ": a basic field (title, explanation, use case, code, history) is empty");
  if (p.n > 10 && (!Array.isArray(t.d) || t.d.length < 2 || !t.k || t.k.length < 4 || !t.l || t.l.length < 2)) problems.push("phase " + p.n + " / " + t.t + ": needs 2+ explanation paragraphs, 4+ key points and 2+ links");
}

const want = process.argv.slice(2).map(Number);
const phases = ROADMAP.filter(p => !want.length || want.includes(p.n));
const isText = x => typeof x === "string" && x.trim().length > 0;

for (const p of phases) {
  const file = "deep" + String(p.n).padStart(2, "0") + ".js";
  if (!fs.existsSync(path.join(dir, file))) { problems.push("MISSING FILE " + file); continue; }
  try { eval(fs.readFileSync(path.join(dir, file), "utf8")); }
  catch (e) { problems.push("SYNTAX ERROR in " + file + ": " + e.message); continue; }
  const titles = new Set(p.topics.map(t => t.t));
  for (const key of Object.keys(EXTRAS)) {
    const [n, title] = [key.slice(0, key.indexOf("|")), key.slice(key.indexOf("|") + 1)];
    if (Number(n) === p.n && !titles.has(title)) problems.push(file + ": unknown title '" + title + "'");
  }
  let chars = 0;
  for (const t of p.topics) {
    const e = EXTRAS[p.n + "|" + t.t];
    const where = file + " / " + t.t + ": ";
    if (!e) { problems.push(where + "no EXTRA entry"); continue; }
    if (!Array.isArray(e.deep) || e.deep.length < 2 || !e.deep.every(isText)) problems.push(where + "deep needs at least 2 paragraphs of text");
    if (!Array.isArray(e.iq) || e.iq.length < 3) problems.push(where + "iq needs at least 3 questions");
    else e.iq.forEach((x, i) => {
      if (!x || !isText(x.q) || !isText(x.a)) problems.push(where + "iq[" + i + "] needs q and a text");
      if (x && x.c !== undefined && !isText(x.c)) problems.push(where + "iq[" + i + "].c must be non-empty text when present");
    });
    if (!Array.isArray(e.tips) || e.tips.length < 3 || !e.tips.every(isText)) problems.push(where + "tips needs at least 3 text items");
    chars += JSON.stringify(e).length;
  }
  console.log("phase " + p.n + " (" + p.title + "): " + p.topics.length + " topics, " + Math.round(chars / p.topics.length) + " chars per topic on average");
}
if (problems.length) { console.log("\nPROBLEMS:\n" + problems.join("\n")); process.exit(1); }
console.log("\nALL OK");
