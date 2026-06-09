/*
 * motion.mjs — Capture a website's microinteractions (the MECHANISM, not video):
 *   - animation libraries in use (GSAP, Framer Motion, Lottie, Rive, AOS, Lenis)
 *   - CSS transitions + @keyframes (durations, easings)
 *   - hover/focus state deltas on real interactive elements (via real mouse move)
 *   - scroll-reveal / parallax (sample element opacity+transform top vs scrolled)
 *
 * Usage:
 *   node --experimental-websocket motion.mjs <url> [outDir]
 * Env: CHROME=/path/to/chrome
 * Output: <outDir>/motion.json
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const url = process.argv[2];
const outDir = path.resolve(process.argv[3] || "design-probe");
if (!url) { console.error("Usage: node --experimental-websocket motion.mjs <url> [outDir]"); process.exit(1); }
if (typeof WebSocket === "undefined") { console.error("Re-run with: node --experimental-websocket motion.mjs <url>"); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  for (const c of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ]) if (fs.existsSync(c)) return c;
  return "google-chrome";
}

const PORT = 9000 + Math.floor(Math.random() * 999);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "motion-"));
const chrome = spawn(findChrome(), [
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--window-size=1280,900", "about:blank",
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try { const j = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch {}
    await sleep(200);
  }
  throw new Error("Chrome DevTools endpoint not reachable");
}
function cdp(ws) {
  let id = 0; const pending = new Map();
  ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
  return (method, params = {}, sessionId) => new Promise((res) => { const mid = ++id; pending.set(mid, res); const p = { id: mid, method, params }; if (sessionId) p.sessionId = sessionId; ws.send(JSON.stringify(p)); });
}

(async () => {
  const ws = new WebSocket(await getWsUrl());
  await new Promise((r) => (ws.onopen = r));
  const send = cdp(ws);
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  const evalJS = async (expr, awaitPromise = false) =>
    (await S("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise })).result.value;

  await S("Page.enable");
  await S("Runtime.enable");
  await S("Page.navigate", { url });
  await sleep(6000);

  const out = { meta: { url }, libraries: {}, keyframes: [], transitions: [], hover: [], scroll: [] };

  // 1) Animation libraries
  out.libraries = await evalJS(`(() => ({
    gsap: !!window.gsap, scrollTrigger: !!(window.ScrollTrigger || (window.gsap && window.gsap.ScrollTrigger)),
    framerMotion: !!document.querySelector('[data-framer-name],[data-framer-component-type]') || !!window.__framer__,
    lottie: !!(window.lottie || window.bodymovin) || !!document.querySelector('lottie-player,[class*=lottie]'),
    rive: !!window.rive || !!document.querySelector('canvas[class*=rive]'),
    aos: !!window.AOS || !!document.querySelector('[data-aos]'),
    lenis: !!window.Lenis || document.documentElement.classList.contains('lenis') || !!document.querySelector('.lenis'),
    locomotive: !!document.querySelector('[data-scroll],[data-scroll-container]'),
    motionOne: !!window.Motion,
  }))()`);

  // 2) @keyframes + transition/animation tallies from stylesheets + computed
  const km = await evalJS(`(() => {
    const frames = []; const tr = {};
    for (const sheet of Array.from(document.styleSheets)) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of Array.from(rules || [])) {
        if (rule.type === CSSRule.KEYFRAMES_RULE && frames.length < 30) frames.push({ name: rule.name, css: rule.cssText.slice(0, 600) });
      }
    }
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.transitionDuration && cs.transitionDuration !== '0s') {
        const k = cs.transitionProperty + ' | ' + cs.transitionDuration + ' | ' + cs.transitionTimingFunction;
        tr[k] = (tr[k] || 0) + 1;
      }
    });
    return { frames, transitions: Object.entries(tr).sort((a,b)=>b[1]-a[1]).slice(0, 20) };
  })()`);
  out.keyframes = km.frames;
  out.transitions = km.transitions;

  // 3) Hover-state deltas via REAL mouse move
  const cands = await evalJS(`(() => {
    const pick = [...document.querySelectorAll('button, a[class], [class*=btn], [class*=card], [class*=Button], [class*=Card]')];
    const seen = new Set(); const list = [];
    for (const el of pick) {
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 16 || r.top < 60 || r.top > 820) continue; // visible, in viewport
      const cs = getComputedStyle(el);
      const sig = cs.backgroundColor + cs.color + (el.innerText||'').slice(0,12);
      if (seen.has(sig)) continue; seen.add(sig);
      const i = list.length;
      el.setAttribute('data-motion-idx', i);
      list.push({ i, tag: el.tagName.toLowerCase(), text: (el.innerText||'').trim().slice(0,24),
        cx: Math.round(r.left + r.width/2), cy: Math.round(r.top + r.height/2),
        base: { bg: cs.backgroundColor, color: cs.color, transform: cs.transform, boxShadow: cs.boxShadow, opacity: cs.opacity, borderColor: cs.borderColor, filter: cs.filter },
        transition: cs.transitionProperty + ' ' + cs.transitionDuration + ' ' + cs.transitionTimingFunction });
      if (list.length >= 12) break;
    }
    return list;
  })()`);

  for (const c of cands) {
    await S("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.cx, y: c.cy });
    await sleep(420);
    const after = await evalJS(`(() => { const el = document.querySelector('[data-motion-idx="${c.i}"]'); if (!el) return null; const cs = getComputedStyle(el); return { bg: cs.backgroundColor, color: cs.color, transform: cs.transform, boxShadow: cs.boxShadow, opacity: cs.opacity, borderColor: cs.borderColor, filter: cs.filter }; })()`);
    await S("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2 });
    await sleep(120);
    if (!after) continue;
    const changed = {};
    for (const k of Object.keys(c.base)) if (after[k] !== c.base[k]) changed[k] = { from: c.base[k], to: after[k] };
    if (Object.keys(changed).length) out.hover.push({ tag: c.tag, text: c.text, transition: c.transition, changed });
  }

  // 4) Scroll-reveal / parallax: sample below-the-fold elements, then after scroll
  const before = await evalJS(`(() => {
    const els = [...document.querySelectorAll('section, [class*=card], [class*=Card], h2, h3, [class*=reveal], [data-aos], [class*=fade]')];
    const list = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight) continue; // only below-the-fold (likely pre-animation)
      const cs = getComputedStyle(el);
      const i = list.length; el.setAttribute('data-scroll-idx', i);
      list.push({ i, tag: el.tagName.toLowerCase(), opacity: cs.opacity, transform: cs.transform });
      if (list.length >= 25) break;
    }
    return list;
  })()`);

  await evalJS(`(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));let h=document.body.scrollHeight;for(let y=0;y<=h;y+=500){scrollTo(0,y);await s(160);h=document.body.scrollHeight;}await s(400);})()`, true);

  const after = await evalJS(`(() => {
    const list = [];
    document.querySelectorAll('[data-scroll-idx]').forEach((el) => {
      const cs = getComputedStyle(el);
      list.push({ i: +el.getAttribute('data-scroll-idx'), opacity: cs.opacity, transform: cs.transform });
    });
    return list;
  })()`);
  const afterMap = Object.fromEntries(after.map((a) => [a.i, a]));
  for (const b of before) {
    const a = afterMap[b.i]; if (!a) continue;
    if (a.opacity !== b.opacity || a.transform !== b.transform)
      out.scroll.push({ tag: b.tag, opacity: { from: b.opacity, to: a.opacity }, transform: { from: b.transform, to: a.transform } });
  }
  out.scroll = out.scroll.slice(0, 12);

  fs.writeFileSync(path.join(outDir, "motion.json"), JSON.stringify(out, null, 2));
  console.log("Wrote " + path.join(outDir, "motion.json") +
    ` (libs: ${Object.entries(out.libraries).filter(([,v])=>v).map(([k])=>k).join(",")||"none"}; hover:${out.hover.length}; scroll:${out.scroll.length}; keyframes:${out.keyframes.length})`);
  chrome.kill(); ws.close(); process.exit(0);
})().catch((e) => { console.error("ERROR:", e.message); try { chrome.kill(); } catch {} process.exit(1); });
