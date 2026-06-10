/*
 * showcase.mjs — Render a DESIGN.md into a single, self-contained showcase page
 * (like design-extractor.com/gallery): a rendered design-system page with
 * Design / Preview / Source tabs.
 *   - Design  : rendered tokens — color swatches, type specimens, spacing,
 *               radii, components, and MOTION (motion lives in the design doc).
 *   - Preview : the sample site, inlined via <iframe srcdoc>.
 *   - Source  : the raw DESIGN.md + a Copy .md button.
 *
 * Usage:
 *   node showcase.mjs <DESIGN.md> [sample.html] [out.html]
 * (no external deps; no flags needed)
 */
import fs from "node:fs";
import path from "node:path";

const mdPath = process.argv[2];
const samplePath = process.argv[3] || "";
const outPath = process.argv[4] || path.join(path.dirname(mdPath || "."), "showcase.html");
if (!mdPath) { console.error("Usage: node showcase.mjs <DESIGN.md> [sample.html] [out.html]"); process.exit(1); }

const raw = fs.readFileSync(mdPath, "utf8");
const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
const fm = fmMatch ? fmMatch[1] : "";
const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;

/* ---- tolerant indentation YAML parser (nested maps of scalar strings) ---- */
function stripQuotes(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}
function splitTop(s, sep) { // split respecting quotes
  const out = []; let cur = "", q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; }
    else if (ch === '"' || ch === "'") { q = ch; cur += ch; }
    else if (ch === sep) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function parseInline(s) { // { k: v, k: "v, v" } -> object
  const obj = {}; const inner = s.slice(1, -1);
  for (const pair of splitTop(inner, ",")) {
    const ci = pair.indexOf(":"); if (ci === -1) continue;
    obj[stripQuotes(pair.slice(0, ci))] = stripQuotes(pair.slice(ci + 1).trim());
  }
  return obj;
}
function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^ */)[0].length;
    const rest = line.trim();
    const idx = rest.indexOf(":");
    if (idx === -1) continue;
    const key = stripQuotes(rest.slice(0, idx));
    let val = rest.slice(idx + 1).trim();
    let inlineObj = null;
    if (val[0] === '"' || val[0] === "'") {
      const q = val[0]; const end = val.indexOf(q, 1);
      val = end === -1 ? val.slice(1) : val.slice(1, end);
    } else if (val[0] === "{" && val[val.length - 1] === "}") {
      inlineObj = parseInline(val);
    } else {
      val = val.replace(/\s+#.*$/, "").trim(); // strip trailing comment
    }
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1].obj;
    if (inlineObj) parent[key] = inlineObj;
    else if (val === "") { const child = {}; parent[key] = child; stack.push({ indent, obj: child }); }
    else parent[key] = val;
  }
  return root;
}
const data = parseYaml(fm);

function resolve(v) {
  let s = v;
  for (let i = 0; i < 6; i++) {
    if (typeof s !== "string") break;
    const m = s.match(/^\{([^}]+)\}$/);
    if (!m) break;
    let cur = data;
    for (const seg of m[1].split(".")) { cur = cur == null ? null : cur[seg]; }
    if (cur == null || typeof cur !== "string") return s;
    s = cur;
  }
  return s;
}
const isColor = (s) => typeof s === "string" && /^(#|rgb|hsl)/i.test(s.trim());
const isLight = (hex) => {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return /rgba?\(\s*2[0-9]{2}/.test(hex); // rough for light rgb
  const n = parseInt(m[1], 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const countLeaves = (o) => !o || typeof o !== "object" ? 0 : Object.values(o).reduce((n, v) => n + (typeof v === "object" ? countLeaves(v) : 1), 0);

/* ---- render: color swatches ---- */
function swatch(name, value) {
  const hex = resolve(value);
  const c = isColor(hex) ? hex : "transparent";
  const border = isColor(hex) && isLight(hex) ? "border:1px solid #d8dade;" : "border:1px solid rgba(0,0,0,.06);";
  return `<div class="sw"><div class="sw-c" style="background:${esc(c)};${border}"></div>`
    + `<div class="sw-m"><span class="sw-n">${esc(name)}</span><code>${esc(hex)}</code></div></div>`;
}
function colorGroup(title, obj) {
  if (!obj || typeof obj !== "object") return "";
  let chips = "";
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "object") chips += Object.entries(v).map(([kk, vv]) => swatch(k + "." + kk, vv)).join("");
    else chips += swatch(k, v);
  }
  return `<h4 class="grp">${esc(title)}</h4><div class="sw-grid">${chips}</div>`;
}
function renderMap(title, obj) {
  if (!obj || typeof obj !== "object") return "";
  const flat = Object.entries(obj).filter(([, v]) => typeof v === "string");
  const groups = Object.entries(obj).filter(([, v]) => typeof v === "object");
  let h = title ? `<h3>${esc(title)}</h3>` : "";
  if (flat.length) h += `<div class="sw-grid">` + flat.map(([k, v]) => swatch(k, v)).join("") + `</div>`;
  h += groups.map(([k, v]) => colorGroup(k, v)).join("");
  return h;
}
function renderColors() {
  const c = data.colors || {};
  // Themed structure: colors.dark / colors.light, each grouped by role category.
  if (c.dark || c.light) {
    let html = "";
    if (c.dark) html += `<h3>Dark theme</h3>` + Object.entries(c.dark).map(([g, roles]) => colorGroup(g, roles)).join("");
    if (c.light) html += `<h3 class="theme-sep">Light theme <span class="theme-note">· inferred app theme</span></h3>` + Object.entries(c.light).map(([g, roles]) => colorGroup(g, roles)).join("");
    return html;
  }
  let html = "";
  if (c.primitive) html += `<h3>Primitive scales</h3>` + Object.entries(c.primitive).map(([hue, steps]) => colorGroup(hue, steps)).join("");
  if (c.semantic) html += renderMap("Semantic roles", c.semantic);
  if (!c.primitive && !c.semantic) html += renderMap("", c);
  return html;
}

/* ---- render: typography specimens ---- */
function renderType() {
  const t = data.typography || {};
  return Object.entries(t).map(([name, s]) => {
    const fam = s.fontFamily || "inherit";
    const style = `font-family:${fam};font-size:${s.fontSize||"16px"};font-weight:${s.fontWeight||400};`
      + `line-height:${s.lineHeight||1.4};letter-spacing:${s.letterSpacing||"normal"};`;
    const meta = [s.fontFamily ? String(s.fontFamily).split(",")[0].replace(/['"]/g, "") : "", s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing].filter(Boolean).join(" · ");
    return `<div class="ty"><div class="ty-spec" style="${esc(style)}">The quick brown fox jumps</div>`
      + `<div class="ty-meta"><span class="ty-n">${esc(name)}</span><code>${esc(meta)}</code></div></div>`;
  }).join("");
}

/* ---- render: spacing + radii ---- */
function renderSpacing() {
  const sp = data.spacing || {};
  return Object.entries(sp).map(([k, v]) =>
    `<div class="sp"><span class="sp-n">${esc(k)}</span><span class="sp-bar" style="width:${esc(v)}"></span><code>${esc(v)}</code></div>`
  ).join("");
}
function renderRadii() {
  const r = data.rounded || {};
  return `<div class="rad-grid">` + Object.entries(r).map(([k, v]) =>
    `<div class="rad"><div class="rad-b" style="border-radius:${esc(v)}"></div><span>${esc(k)}</span><code>${esc(v)}</code></div>`
  ).join("") + `</div>`;
}

/* ---- render: components ---- */
function renderComponents() {
  const c = data.components || {};
  const keys = Object.keys(c);
  if (!keys.length) return `<p class="muted">(none detected)</p>`;
  return `<div class="cmp-grid">` + keys.map((k) => {
    const o = c[k]; const bg = resolve(o.backgroundColor || "");
    const chip = isColor(bg) ? `<span class="cmp-chip" style="background:${esc(bg)};${isLight(bg) ? "border:1px solid #d8dade;" : ""}"></span>` : "";
    const bits = [o.rounded ? "r " + resolve(o.rounded) : "", o.height ? "h " + o.height : "", o.padding ? "p " + o.padding : ""].filter(Boolean).join(" · ");
    return `<div class="cmp">${chip}<div><span class="cmp-n">${esc(k)}</span><code>${esc(bits)}</code></div></div>`;
  }).join("") + `</div>`;
}

/* ---- render: motion ---- */
function renderMotion() {
  const m = data.motion;
  if (!m || typeof m !== "object") return "";
  const block = (title, obj) => obj && typeof obj === "object"
    ? `<div class="mo"><h4>${esc(title)}</h4><ul>` + Object.entries(obj).map(([k, v]) => `<li><span class="mo-k">${esc(k)}</span> <code>${esc(v)}</code></li>`).join("") + `</ul></div>`
    : (obj ? `<div class="mo"><h4>${esc(title)}</h4><code>${esc(obj)}</code></div>` : "");
  return `<div class="mo-grid">` + ["easing", "duration", "hover", "looping", "inventory"].map((k) => block(k, m[k])).join("") + `</div>`;
}

/* ---- minimal markdown -> HTML for the rule-driven body (the "decisions") ---- */
function inlineMd(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}
function renderMarkdown(src) {
  const lines = src.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  let html = "", i = 0, inUl = false, inOl = false;
  const closeLists = () => { if (inUl) { html += "</ul>"; inUl = false; } if (inOl) { html += "</ol>"; inOl = false; } };
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    // table
    if (t.startsWith("|") && lines[i + 1] && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      closeLists();
      const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(t);
      html += '<table class="md-tbl"><thead><tr>' + head.map((h) => `<th>${inlineMd(h)}</th>`).join("") + "</tr></thead><tbody>";
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        html += "<tr>" + cells(lines[i]).map((c) => `<td>${inlineMd(c)}</td>`).join("") + "</tr>";
        i++;
      }
      html += "</tbody></table>";
      continue;
    }
    if (!t) { closeLists(); i++; continue; }
    if (t === "---") { closeLists(); html += "<hr/>"; i++; continue; }
    let m;
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) {
      closeLists();
      const lvl = m[1].length;
      if (lvl === 1) { html += `<h2 class="md-h1">${inlineMd(m[2])}</h2>`; }
      else html += `<h${lvl} class="md-h">${inlineMd(m[2])}</h${lvl}>`;
      i++; continue;
    }
    if (t.startsWith(">")) { closeLists(); html += `<blockquote>${inlineMd(t.replace(/^>\s?/, ""))}</blockquote>`; i++; continue; }
    if ((m = t.match(/^[-*]\s+(.*)$/))) { if (!inUl) { closeLists(); html += "<ul>"; inUl = true; } html += `<li>${inlineMd(m[1])}</li>`; i++; continue; }
    if ((m = t.match(/^\d+\.\s+(.*)$/))) { if (!inOl) { closeLists(); html += "<ol>"; inOl = true; } html += `<li>${inlineMd(m[1])}</li>`; i++; continue; }
    closeLists();
    html += `<p>${inlineMd(t)}</p>`;
    i++;
  }
  closeLists();
  return html;
}

const _c = data.colors || {};
const counts = {
  colors: countLeaves(_c.dark || _c.light || _c.semantic || _c.primitive || _c),
  type: Object.keys(data.typography || {}).length,
  spacing: Object.keys(data.spacing || {}).length,
  radii: Object.keys(data.rounded || {}).length,
};

const sampleHtml = samplePath && fs.existsSync(samplePath) ? fs.readFileSync(samplePath, "utf8") : "";
const srcdoc = sampleHtml ? sampleHtml.replace(/&/g, "&amp;").replace(/"/g, "&quot;") : "";
const name = (data.name || "Design system").replace(/\bdesign\.md\b/i, "").replace(/-/g, " ").trim() || "Design system";
const intent = data.intent || {};
const description = intent["feels-like"] || data.description || "";

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(name)} — design.md</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet"/>
<style>
  :root{ --bg:#fff; --ink:#0b0c0e; --muted:#6b7280; --line:#e7e8ea; --soft:#f6f7f8; --accent:#5e6ad2;
    --font:Inter,-apple-system,system-ui,sans-serif; --mono:"JetBrains Mono",ui-monospace,monospace; }
  *{box-sizing:border-box;} body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);-webkit-font-smoothing:antialiased;}
  code{font-family:var(--mono);}
  header{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.85);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);}
  .bar{max-width:1080px;margin:0 auto;padding:12px 24px;display:flex;align-items:center;gap:16px;}
  .ttl{font-weight:700;font-size:15px;text-transform:capitalize;}
  .ttl small{color:var(--muted);font-family:var(--mono);font-weight:400;font-size:12px;text-transform:none;}
  .tabs{display:inline-flex;gap:2px;background:var(--soft);border:1px solid var(--line);border-radius:9999px;padding:4px;margin:0 auto;}
  .tab{border:0;background:transparent;color:var(--muted);font:inherit;font-size:13px;font-weight:600;padding:6px 16px;border-radius:9999px;cursor:pointer;}
  .tab.active{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08);}
  .copy{border:1px solid var(--line);background:#fff;color:var(--ink);font:inherit;font-size:13px;font-weight:600;border-radius:8px;padding:7px 12px;cursor:pointer;}
  main{max-width:1080px;margin:0 auto;padding:0 24px;}
  .view{display:none;} .view.active{display:block;}
  /* Design view */
  .hero{padding:40px 0 8px;}
  .hero h1{font-size:34px;font-weight:700;margin:0 0 10px;text-transform:capitalize;letter-spacing:-.5px;}
  .hero p{color:var(--muted);max-width:70ch;line-height:1.6;margin:0 0 18px;font-size:15px;}
  .counts{display:flex;gap:28px;padding:16px 0 8px;border-top:1px solid var(--line);}
  .counts b{font-size:22px;} .counts span{color:var(--muted);font-size:13px;margin-left:6px;}
  section.sec{padding:36px 0;border-top:1px solid var(--line);}
  section.sec > h2{font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin:0 0 20px;}
  h3{font-size:15px;margin:24px 0 12px;} h4.grp{font-size:12px;color:var(--muted);margin:18px 0 10px;text-transform:uppercase;letter-spacing:.5px;}
  h3.theme-sep{margin-top:36px;padding-top:24px;border-top:1px solid var(--line);} .theme-note{color:var(--muted);font-weight:400;font-size:12px;}
  .sw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;}
  .sw{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff;}
  .sw-c{height:56px;} .sw-m{padding:8px 10px;display:flex;flex-direction:column;gap:2px;}
  .sw-n{font-size:12px;font-weight:600;} .sw-m code{font-size:11px;color:var(--muted);}
  .ty{display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding:14px 0;border-bottom:1px solid var(--line);}
  .ty-spec{color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ty-meta{flex:none;text-align:right;display:flex;flex-direction:column;gap:3px;} .ty-n{font-size:12px;font-weight:600;} .ty-meta code{font-size:11px;color:var(--muted);}
  .sp{display:flex;align-items:center;gap:14px;padding:7px 0;} .sp-n{width:80px;font-size:13px;} .sp-bar{height:14px;background:var(--accent);border-radius:3px;} .sp code{color:var(--muted);font-size:12px;}
  .rad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:14px;}
  .rad{display:flex;flex-direction:column;gap:6px;align-items:flex-start;} .rad-b{width:100%;height:60px;background:var(--soft);border:1.5px solid var(--accent);} .rad span{font-size:13px;font-weight:600;} .rad code{font-size:11px;color:var(--muted);}
  .cmp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;}
  .cmp{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:12px;}
  .cmp-chip{width:28px;height:28px;border-radius:7px;flex:none;} .cmp-n{font-size:13px;font-weight:600;display:block;} .cmp code{font-size:11px;color:var(--muted);}
  .mo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
  .mo{border:1px solid var(--line);border-radius:10px;padding:16px;} .mo h4{margin:0 0 8px;font-size:13px;text-transform:capitalize;}
  .mo ul{margin:0;padding-left:0;list-style:none;} .mo li{font-size:13px;color:var(--muted);margin:5px 0;} .mo-k{font-weight:600;color:var(--ink);}
  .mo code{font-size:11.5px;color:var(--muted);}
  .muted{color:var(--muted);}
  .intent{font-size:14px;color:var(--ink);margin:2px 0;} .intent b{color:var(--ink);}
  /* Rendered markdown (the rules) */
  .md{font-size:14px;line-height:1.7;color:#2b2f36;max-width:80ch;}
  .md .md-h1{font-size:22px;margin:0 0 8px;color:var(--ink);}
  .md h2.md-h{font-size:17px;margin:28px 0 10px;color:var(--ink);}
  .md h3.md-h{font-size:14px;margin:18px 0 8px;color:var(--ink);}
  .md h4.md-h{font-size:13px;margin:14px 0 6px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}
  .md p{margin:8px 0;} .md ul,.md ol{margin:8px 0;padding-left:20px;} .md li{margin:4px 0;}
  .md blockquote{margin:14px 0;padding:12px 16px;background:var(--soft);border-left:3px solid var(--accent);border-radius:0 8px 8px 0;color:var(--ink);}
  .md code{background:var(--soft);border:1px solid var(--line);border-radius:4px;padding:1px 5px;font-size:.88em;}
  .md hr{border:0;border-top:1px solid var(--line);margin:24px 0;}
  .md-tbl{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;}
  .md-tbl th{text-align:left;padding:8px 10px;border-bottom:2px solid var(--line);color:var(--muted);font-weight:600;}
  .md-tbl td{padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top;}
  /* Preview view */
  .frame{border:1px solid var(--line);border-radius:12px;overflow:hidden;margin:24px 0;box-shadow:0 8px 40px rgba(0,0,0,.08);}
  .frame-bar{display:flex;gap:6px;align-items:center;padding:10px 14px;background:var(--soft);border-bottom:1px solid var(--line);}
  .frame-bar i{width:11px;height:11px;border-radius:50%;background:#d8dade;} .frame-bar span{margin-left:8px;color:var(--muted);font-size:12px;font-family:var(--mono);}
  iframe{width:100%;height:1400px;border:0;display:block;background:#fff;}
  /* Source view */
  .src-head{display:flex;align-items:center;justify-content:space-between;padding:20px 0 12px;}
  pre.src{margin:0 0 32px;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:22px;overflow:auto;max-height:78vh;font-family:var(--mono);font-size:12.5px;line-height:1.7;white-space:pre;color:#2b2f36;}
</style></head>
<body>
<header><div class="bar">
  <span class="ttl">${esc(name)} <small>· design.md</small></span>
  <span class="tabs">
    <button class="tab active" data-tab="design">Design</button>
    <button class="tab" data-tab="preview">Preview</button>
    <button class="tab" data-tab="source">Source</button>
  </span>
  <button class="copy" id="copy">Copy .md</button>
</div></header>
<main>
  <section id="view-design" class="view active">
    <div class="hero">
      <h1>${esc(name)}</h1>
      <p>${esc(description)}</p>
      ${intent["optimizes-for"] ? `<p class="intent"><b>Optimizes for:</b> ${esc(intent["optimizes-for"])}</p>` : ""}
      ${intent["reference-points"] ? `<p class="intent"><b>Reference points:</b> ${esc(intent["reference-points"])}</p>` : ""}
      <div class="counts">
        <div><b>${counts.colors}</b><span>Colors</span></div>
        <div><b>${counts.type}</b><span>Type styles</span></div>
        <div><b>${counts.spacing}</b><span>Spacing</span></div>
        <div><b>${counts.radii}</b><span>Radii</span></div>
      </div>
    </div>
    <section class="sec"><h2>Colors</h2>${renderColors()}</section>
    <section class="sec"><h2>Typography</h2>${renderType()}</section>
    <section class="sec"><h2>Spacing</h2>${renderSpacing()}</section>
    <section class="sec"><h2>Radii</h2>${renderRadii()}</section>
    ${Object.keys(data.components || {}).length ? `<section class="sec"><h2>Components</h2>${renderComponents()}</section>` : ""}
    ${data.motion ? `<section class="sec"><h2>Motion tokens</h2>${renderMotion()}</section>` : ""}
    ${body.trim() ? `<section class="sec"><h2>Guidelines &amp; rules</h2><div class="md">${renderMarkdown(body)}</div></section>` : ""}
  </section>

  <section id="view-preview" class="view">
    ${srcdoc
      ? `<div class="frame"><div class="frame-bar"><i></i><i></i><i></i><span>sample — generated from DESIGN.md</span></div><iframe srcdoc="${srcdoc}" title="preview"></iframe></div>`
      : `<p class="muted" style="padding:40px 0">No sample provided. Pass a sample HTML path as the 2nd argument to embed a live preview.</p>`}
  </section>

  <section id="view-source" class="view">
    <div class="src-head"><span class="muted" style="font-size:13px">Drop this DESIGN.md into any repo and tell your agent to use it.</span></div>
    <pre class="src" id="srcpre"></pre>
  </section>
</main>
<script type="text/plain" id="mdsrc">${raw.replace(/<\/script>/g, "<\\/script>")}</script>
<script>
  var md = document.getElementById('mdsrc').textContent.replace(/^\\n/, '');
  document.getElementById('srcpre').textContent = md;
  document.querySelectorAll('.tab').forEach(function(t){ t.addEventListener('click', function(){
    var id=t.getAttribute('data-tab');
    document.querySelectorAll('.tab').forEach(function(x){x.classList.toggle('active',x===t);});
    document.querySelectorAll('.view').forEach(function(v){v.classList.toggle('active', v.id==='view-'+id);});
  });});
  document.getElementById('copy').addEventListener('click', function(){ navigator.clipboard && navigator.clipboard.writeText(md); this.textContent='Copied'; var b=this; setTimeout(function(){b.textContent='Copy .md';},1200); });
</script>
</body></html>`;

fs.writeFileSync(outPath, html);
console.log("Wrote " + outPath + ` (colors:${counts.colors}, type:${counts.type}, spacing:${counts.spacing}, radii:${counts.radii}, motion:${data.motion ? "yes" : "no"})`);
