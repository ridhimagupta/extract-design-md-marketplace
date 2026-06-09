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

/* ---- tolerant indentation YAML parser (nested maps of scalar strings) ---- */
function stripQuotes(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
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
    // Take the quoted span if quoted (preserves '#' in hex); else strip a trailing "# comment".
    if (val[0] === '"' || val[0] === "'") {
      const q = val[0]; const end = val.indexOf(q, 1);
      val = end === -1 ? val.slice(1) : val.slice(1, end);
    } else {
      val = val.replace(/\s+#.*$/, "").trim();
    }
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1].obj;
    if (val === "") { const child = {}; parent[key] = child; stack.push({ indent, obj: child }); }
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
function renderColors() {
  const c = data.colors || {};
  let html = "";
  if (c.primitive) html += `<h3>Primitive scales</h3>` + Object.entries(c.primitive).map(([hue, steps]) => colorGroup(hue, steps)).join("");
  if (c.semantic) html += `<h3>Semantic roles</h3>` + Object.entries(c.semantic).map(([grp, roles]) => colorGroup(grp, roles)).join("");
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

const counts = {
  colors: countLeaves(data.colors && data.colors.primitive) + countLeaves(data.colors && data.colors.semantic),
  type: Object.keys(data.typography || {}).length,
  spacing: Object.keys(data.spacing || {}).length,
  radii: Object.keys(data.rounded || {}).length,
};

const sampleHtml = samplePath && fs.existsSync(samplePath) ? fs.readFileSync(samplePath, "utf8") : "";
const srcdoc = sampleHtml ? sampleHtml.replace(/&/g, "&amp;").replace(/"/g, "&quot;") : "";
const name = (data.name || "Design system").replace(/-/g, " ");
const description = data.description || "";

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
    <section class="sec"><h2>Components</h2>${renderComponents()}</section>
    ${data.motion ? `<section class="sec"><h2>Motion</h2>${renderMotion()}</section>` : ""}
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
