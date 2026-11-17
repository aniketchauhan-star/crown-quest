#!/usr/bin/env node
// Make voice lines in the TTS studio "Ai Wala Human By Aamir" (docs/VOICEOVER.md), one at a time
// through its Single Generation tab, in the game's one voice: Female Teacher (Standard), Hindi.
//
//   node tools/vo_studio.mjs              every line of tools/vo_script.json with no clip yet
//   node tools/vo_studio.mjs vo030 vo031  just these lines
//
// Each finished MP3 is kept in tools/studio_out/ at once (a rerun skips those), and at the end
// they are zipped and handed to tools/vo_build.py. It stops at the first error the studio shows,
// such as "Exceeded monthly Gemini API spending cap" (the studio owner's billing: waiting is the
// only fix). Needs Node 22+ and Playwright's cached headless shell (no npm install). On battery
// run it as `caffeinate -i node tools/vo_studio.mjs` so the Mac doesn't sleep mid-run.
// Never plays a sound (--mute-audio).
//
// 2026-11-17: written while the studio was capped. Its settings and its error message were
// checked against the live page; saving a finished clip has not been seen working yet.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO = 'https://ai-wala-human-by-aamir-809572708022.asia-southeast1.run.app/';
const LANG = process.env.VO_LANG || 'hi';
const VOICE = process.env.VO_VOICE || 'Female Teacher (Standard)';
const SHELL = process.env.CHROME || path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'tools', 'studio_out');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'vo_script.json'), 'utf8'));
const want = process.argv.slice(2);
const lines = script.filter(e => want.length ? want.includes(e.id) : !fs.existsSync(path.join(ROOT, 'assets', 'vo', e.id + '.ogg')));
if (!lines.length) { console.log('Nothing to make.'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });

// ---- a bare CDP connection to the headless shell
const port = 9300 + Math.floor(Math.random() * 600);
const prof = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'vo-studio-'));
const proc = spawn(SHELL, [`--remote-debugging-port=${port}`, '--disable-gpu', '--mute-audio', `--user-data-dir=${prof}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const keep = setInterval(() => {}, 1000); // Node's fetch alone does not keep the loop alive
const quit = async code => {
  try { ws.close(); } catch {}
  const gone = new Promise(r => proc.once('exit', r)); proc.kill(); await Promise.race([gone, sleep(3000)]);
  try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
  clearInterval(keep); process.exit(code);
};
let page;
for (let i = 0; i < 60 && !page; i++) {
  try { page = (await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(2000) })).json()).find(t => t.type === 'page'); } catch {}
  if (!page) await sleep(250);
}
if (!page) { console.error('The headless shell did not start: ' + SHELL); proc.kill(); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map(); const errors = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 300));
};
const send = (method, params = {}, ms = 30000) => new Promise((res, rej) => {
  const i = ++seq, t = setTimeout(() => { pend.delete(i); rej(new Error('timeout ' + method)); }, ms);
  pend.set(i, m => { clearTimeout(t); m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result); });
  ws.send(JSON.stringify({ id: i, method, params }));
});
const run = async (expr, ms = 60000) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, ms);
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
};

await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: STUDIO });
await sleep(8000);

let made = 0;
for (const L of lines) {
  const mp3 = path.join(OUT, L.id + '.mp3');
  if (fs.existsSync(mp3)) { console.log(L.id, 'already made'); made++; continue; }
  errors.length = 0;
  const setup = await run(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const btn = re => [...document.querySelectorAll('button')].find(b => re.test(b.innerText.trim()));
    const set = (el, v) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    btn(/Single Generation/)?.click(); await wait(300);
    set(document.querySelectorAll('select')[0], ${JSON.stringify(LANG)}); await wait(200);
    set(document.querySelectorAll('select')[1], ${JSON.stringify(VOICE)}); await wait(200);
    set(document.querySelector('textarea'), ${JSON.stringify(L.spoken)});
    set([...document.querySelectorAll('input')].find(i => i.type !== 'file'), ${JSON.stringify(L.id)});
    for (let k = 0; k < 6 && !/mp3/i.test(btn(/^\\.[A-Z0-9]{3,4}$/i)?.innerText || 'mp3'); k++) { btn(/^\\.[A-Z0-9]{3,4}$/i).click(); await wait(200); }
    window.__voOld = document.querySelector('audio')?.src || '';
    return [document.querySelectorAll('select')[0].value, document.querySelectorAll('select')[1].value, btn(/^\\.[A-Z0-9]{3,4}$/i)?.innerText].join(' / ');
  })()`);
  if (setup !== `${LANG} / ${VOICE} / .MP3`) { console.error(L.id, 'the studio page has changed (' + setup + '): update tools/vo_studio.mjs'); await quit(1); }
  await run(`[...document.querySelectorAll('button')].find(b => /GENERATE VOICEOVER/i.test(b.innerText)).click(), 1`);
  let r = null; const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    await sleep(2000);
    r = await run(`(async () => {
      const a = document.querySelector('audio');
      if (a && a.src && a.src !== window.__voOld) {
        const u = new Uint8Array(await (await fetch(a.src)).arrayBuffer()); let s = '';
        for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
        return { b64: btoa(s) };
      }
      const busy = [...document.querySelectorAll('button')].some(b => /generating|processing/i.test(b.innerText));
      const err = [...document.querySelectorAll('div,p,span')].filter(e => !e.children.length && /error|exceed|failed|spending cap|too many/i.test(e.innerText)).map(e => e.innerText)[0];
      return { busy, err };
    })()`);
    if (r.b64 || (!r.busy && r.err && Date.now() - t0 > 6000)) break;
  }
  if (!r || !r.b64) {
    console.error(L.id, 'not made:', (r && r.err) || 'no clip after 3 minutes');
    errors.slice(0, 2).forEach(e => console.error('  ' + e));
    break;
  }
  fs.writeFileSync(mp3, Buffer.from(r.b64, 'base64'));
  made++; console.log(L.id, 'made', `(${made}/${lines.length})`, L.line);
  await sleep(3000); // the studio's proxy allows 100 requests per 15 minutes per IP, shared with others
}

const mp3s = fs.readdirSync(OUT).filter(f => /^vo\d+\.mp3$/.test(f));
if (mp3s.length) {
  const zip = path.join(OUT, 'studio.zip');
  fs.rmSync(zip, { force: true });
  execFileSync('zip', ['-j', '-q', zip, ...mp3s.map(f => path.join(OUT, f))]);
  console.log(`\n${mp3s.length} clip(s) in tools/studio_out/. Into the game: python3 tools/vo_build.py tools/studio_out/studio.zip`);
  console.log('Then check their pauses and Devanagari (docs/VOICEOVER.md, "Checking every clip").');
}
await quit(made === lines.length ? 0 : 1);
