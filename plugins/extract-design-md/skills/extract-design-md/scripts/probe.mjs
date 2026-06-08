/*
 * probe.mjs — Extract REAL computed styles + screenshots from a live website
 * using the installed Chrome via the DevTools Protocol (no npm install).
 *
 * Usage:
 *   node --experimental-websocket probe.mjs <url> [outDir]
 *   (on Node >= 21 the --experimental-websocket flag can be omitted)
 *
 * Env:
 *   CHROME=/path/to/chrome   override the browser binary
 *
 * Output (in outDir, default ./design-probe):
 *   styles.json       computed styles of real elements + color/font frequencies
 *   full.png          full-page screenshot
 *   slice-*.png       readable 1280x1000 slices down the page
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const url = process.argv[2];
const outDir = path.resolve(process.argv[3] || "design-probe");
if (!url) {
  console.error("Usage: node --experimental-websocket probe.mjs <url> [outDir]");
  process.exit(1);
}
if (typeof WebSocket === "undefined") {
  console.error(
    "No global WebSocket. Re-run with: node --experimental-websocket probe.mjs <url>"
  );
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return "google-chrome"; // hope it's on PATH
}

const PORT = 9000 + Math.floor(Math.random() * 999);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "probe-"));
const chrome = spawn(findChrome(), [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "--window-size=1280,1000",
  "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await res.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome DevTools endpoint not reachable");
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
    }
  });
  return (method, params = {}, sessionId) =>
    new Promise((resolve) => {
      const mid = ++id;
      pending.set(mid, resolve);
      const payload = { id: mid, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });
}

// This runs in the page. Collects computed styles of real, visible elements.
const EXTRACT = `(() => {
  const out = { meta: {}, buttons: [], links: [], headings: {}, fonts: {} };
  const seenBtn = new Set();
  function rec(el) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;
    return {
      text: (el.innerText || "").trim().slice(0, 30),
      bg: cs.backgroundColor,
      color: cs.color,
      radius: cs.borderRadius,
      border: cs.borderStyle === "none" ? "none" : (cs.borderWidth + " " + cs.borderColor),
      padding: cs.padding,
      font: cs.fontFamily,
      weight: cs.fontWeight,
      size: cs.fontSize,
    };
  }
  document.querySelectorAll("button, a[class], [role=button], input[type=submit]").forEach((el) => {
    const k = rec(el);
    if (!k) return;
    const sig = k.bg + k.color + k.radius + k.text;
    if (seenBtn.has(sig)) return;
    seenBtn.add(sig);
    (el.tagName === "A" ? out.links : out.buttons).push(k);
  });
  ["h1", "h2", "h3"].forEach((t) => {
    const el = document.querySelector(t);
    if (el) {
      const cs = getComputedStyle(el);
      out.headings[t] = { font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, color: cs.color, tracking: cs.letterSpacing, line: cs.lineHeight };
    }
  });
  const b = getComputedStyle(document.body);
  out.body = { font: b.fontFamily, color: b.color, bg: b.backgroundColor };

  const tally = (sel, prop) => {
    const m = {};
    document.querySelectorAll(sel).forEach((el) => {
      const v = getComputedStyle(el)[prop];
      if (!v) return;
      if (prop.toLowerCase().includes("background") && (v === "rgba(0, 0, 0, 0)" || v === "transparent")) return;
      m[v] = (m[v] || 0) + 1;
    });
    return Object.entries(m).sort((a, c) => c[1] - a[1]).slice(0, 24);
  };
  out.bgColors = tally("*", "backgroundColor");
  out.textColors = tally("h1,h2,h3,h4,p,span,a,button,li,div", "color");
  out.borderColors = tally("*", "borderColor");
  out.radii = tally("*", "borderRadius");
  out.shadows = tally("*", "boxShadow").filter((s) => s[0] !== "none");

  const fam = {};
  document.querySelectorAll("h1,h2,h3,p,span,div,button,a,li").forEach((el) => {
    const f = getComputedStyle(el).fontFamily;
    if (f) fam[f] = (fam[f] || 0) + 1;
  });
  out.fonts = Object.entries(fam).sort((a, c) => c[1] - a[1]).slice(0, 12);

  // Theme-ish CSS custom properties declared on :root
  const vars = {};
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of Array.from(rules || [])) {
      if (rule.selectorText === ":root" && rule.style) {
        for (const name of Array.from(rule.style)) {
          if (name.startsWith("--")) vars[name] = rule.style.getPropertyValue(name).trim();
        }
      }
    }
  }
  out.cssVars = Object.entries(vars).slice(0, 120);
  out.meta = { url: location.href, title: document.title, w: innerWidth };
  return JSON.stringify(out);
})()`;

(async () => {
  const ws = new WebSocket(await getWsUrl());
  await new Promise((r) => (ws.onopen = r));
  const send = cdp(ws);
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);

  await S("Page.enable");
  await S("Runtime.enable");
  await S("Page.navigate", { url });
  await sleep(6000);

  // Scroll to trigger lazy/animated content, then return to top.
  await S("Runtime.evaluate", {
    expression: `(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));let h=document.body.scrollHeight;for(let y=0;y<=h;y+=600){scrollTo(0,y);await s(120);h=document.body.scrollHeight;}scrollTo(0,0);await s(300);})()`,
    awaitPromise: true,
  });
  await sleep(1200);

  const res = await S("Runtime.evaluate", { expression: EXTRACT, returnByValue: true });
  fs.writeFileSync(path.join(outDir, "styles.json"), res.result.value);

  // Full-page screenshot.
  const metrics = await S("Page.getLayoutMetrics");
  const fullH = Math.min(Math.ceil(metrics.cssContentSize.height), 12000);
  await S("Emulation.setDeviceMetricsOverride", { width: 1280, height: fullH, deviceScaleFactor: 1, mobile: false });
  await sleep(600);
  const full = await S("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  fs.writeFileSync(path.join(outDir, "full.png"), Buffer.from(full.data, "base64"));

  // Readable slices (1280x1000) down the page.
  await S("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  const slices = Math.min(6, Math.max(1, Math.ceil(fullH / 1000)));
  for (let i = 0; i < slices; i++) {
    const shot = await S("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: i * 1000, width: 1280, height: 1000, scale: 1 },
      captureBeyondViewport: true,
    });
    fs.writeFileSync(path.join(outDir, `slice-${i}.png`), Buffer.from(shot.data, "base64"));
  }

  console.log("Wrote " + outDir + " (styles.json, full.png, slice-0.." + (slices - 1) + ".png)");
  chrome.kill();
  ws.close();
  process.exit(0);
})().catch((e) => {
  console.error("ERROR:", e.message);
  try { chrome.kill(); } catch {}
  process.exit(1);
});
