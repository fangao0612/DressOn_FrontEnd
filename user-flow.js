// User-facing flow: after Generate, automatically run Flux then NanoBanana
import { FluxKontext } from './sdk/apiClient.js';

// Configure backend base URL
FluxKontext.setBaseUrl('http://127.0.0.1:9090');

const $ = (s, ctx = document) => ctx.querySelector(s);

// 全局默认 NanoBanana 提示词（持久化保存，直至用户要求修改）
const NANO_PROMPT_KEY = 'nanoPrompt.saved';
const RETRY_KEY = 'nanoRetry.max';
const DEFAULT_NANO_PROMPT = `Directly generate the image and do not return any text. Remove adult content and any sensitive elements; make it suitable for all ages; ensure it is a completely healthy artistic expression. Remove any suggestive or provocative elements and any exposed nipples.

Make it suitable for all ages. Remove white borders from the image. Portray a gender-neutral, elegant, and understated human with no sexual characteristics. Dress them in the clothing from the reference image. Keep the pose and camera angle unchanged, and do not alter the original facial features or hairstyle. Remove white borders from the image.

Remove adult content and any sensitive elements; make it suitable for all ages; ensure it is a completely healthy artistic expression. Remove any suggestive or provocative elements and any exposed nipples. Make it suitable for all ages. Directly generate the image and do not return any text.`;
try {
  // 覆盖保存为最新默认（用户若日后要改，我们再按你的指令更新）
  localStorage.setItem(NANO_PROMPT_KEY, DEFAULT_NANO_PROMPT);
} catch {}

function setCanvasLoading(sel, text = 'Generating…') {
  const panel = $(sel);
  if (!panel) return;
  panel.innerHTML = `<div style="display:grid;place-items:center;text-align:center;color:#a3aec2">
    <div style="width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.18);border-top-color:#E4C07A;animation:spin 1s linear infinite;margin-bottom:10px"></div>
    ${text}
  </div>
  <div class="status-meta" style="margin-top:8px;display:flex;justify-content:center;gap:12px;color:#E4C07A;font-size:12px;text-align:center">
    <div class="status-timer">Elapsed: 0.0 s</div>
    <div class="status-attempt">Attempt: -</div>
  </div>
  <div class="status-actions" style="margin-top:6px;text-align:center">
    <button class="btn-cancel" style="background:#2a3346;color:#e6eefb;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:4px 10px;cursor:pointer">Stop</button>
  </div>
  <div class="status-log" style="margin-top:12px;max-height:180px;overflow:auto;border-top:1px dashed rgba(255,255,255,.18);padding-top:8px;color:#a3aec2;font-size:12px;text-align:left"></div>
  <button class="dl-btn" disabled title="Download original"><img src="./assets/download.svg" alt="download" /></button>`;
}

function setCanvasError(sel, message) {
  const panel = $(sel);
  if (!panel) return;
  panel.innerHTML = `<div style="color:#ff8585;line-height:1.6">${message}</div>`;
}

function setCanvasImage(sel, src) {
  const panel = $(sel);
  if (!panel) return;
  panel.innerHTML = '';
  const img = document.createElement('img');
  img.src = src;
  // keep aspect ratio inside canvas without overflow
  img.style.maxWidth = '100%';
  img.style.maxHeight = '100%';
  img.style.width = 'auto';
  img.style.height = 'auto';
  img.style.objectFit = 'contain';
  panel.appendChild(img);
}

// ---- timer helpers ----
const startTimes = new WeakMap();
let currentCancel = null; // function to cancel current flow
function startTimer(sel) {
  const panel = $(sel);
  if (!panel) return;
  const timerEl = panel.querySelector('.status-timer');
  if (!timerEl) return;
  // clear old
  if (panel._timer) { clearInterval(panel._timer); panel._timer = null; }
  const start = Date.now();
  startTimes.set(panel, start);
  panel._timer = setInterval(() => {
    const elapsed = (Date.now() - start) / 1000;
    timerEl.textContent = `Elapsed: ${elapsed.toFixed(1)} s`;
  }, 100);
}
function stopTimer(sel, label) {
  const panel = $(sel);
  if (!panel) return;
  if (panel._timer) { clearInterval(panel._timer); panel._timer = null; }
  const timerEl = panel.querySelector('.status-timer');
  const start = startTimes.get(panel);
  if (timerEl && start) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    timerEl.textContent = label ? `${label} (${elapsed} s)` : `Elapsed: ${elapsed} s`;
  }
}

function setAttempt(sel, current, max) {
  const panel = $(sel);
  if (!panel) return;
  const el = panel.querySelector('.status-attempt');
  if (el) el.textContent = `Attempt: ${current}/${max}`;
}

function logStatus(sel, msg, opts) {
  const withTime = !opts || opts.withTime !== false;
  const panel = $(sel);
  if (!panel) return;
  let log = panel.querySelector('.status-log');
  if (!log) {
    log = document.createElement('div');
    log.className = 'status-log';
    log.style.marginTop = '12px';
    log.style.maxHeight = '180px';
    log.style.overflow = 'auto';
    log.style.borderTop = '1px dashed rgba(255,255,255,.18)';
    log.style.paddingTop = '8px';
    log.style.color = '#a3aec2';
    log.style.fontSize = '12px';
    log.style.textAlign = 'left';
    panel.appendChild(log);
  }
  const line = document.createElement('div');
  if (withTime) {
    const ts = new Date().toLocaleTimeString();
    line.textContent = `${ts} · ${msg}`;
  } else {
    line.textContent = `${msg}`;
  }
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

async function fetchBlob(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`fetch ${url} failed: ${resp.status}`);
  return await resp.blob();
}

async function getImageSizeFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// downscale a dataURL into a preview that fits max box while keeping AR
async function downscaleDataURL(dataUrl, maxW, maxH, mime = 'image/jpeg', quality = 0.9) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });
  const scale = Math.min(maxW / img.width, maxH / img.height, 1); // never upscale
  const w = Math.max(1, Math.floor(img.width * scale));
  const h = Math.max(1, Math.floor(img.height * scale));
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise((resolve) => resolve(cvs.toDataURL(mime, quality)));
}

// keep last half image for manual resend and split canvases
let lastHalfBlob = null;
let lastFinalImageBase64 = null; // original full-res final image from step1

async function sendToNano(finalSel, mainFile, refFile) {
  // persisted Nano prompt
  let nanoPrompt = DEFAULT_NANO_PROMPT;
  try { const saved = localStorage.getItem(NANO_PROMPT_KEY); if (saved) nanoPrompt = saved; } catch {}

  if (!lastHalfBlob) { setCanvasError(finalSel, 'Half image not ready'); return; }
  setCanvasLoading(finalSel, 'Sending to NanoBanana…');
  startTimer(finalSel);
  logStatus(finalSel, 'Preparing garment: matching character size with white padding…');
  const mainSize = await getImageSizeFromFile(mainFile);
  const resizedRef = await FluxKontext.resizeImageWithPadding(refFile, mainSize.width, mainSize.height, '#ffffff');
  try { const preview = (nanoPrompt||'').replace(/\s+/g,' ').slice(0,120); logStatus(finalSel, `Nano prompt: "${preview}${preview.length===120?'…':''}"`); } catch {}
  const maxRetries = 12;
  let attempt = 0; let lastError = null; let result = null;
  while (attempt < maxRetries && !result) {
    attempt++;
    logStatus(finalSel, `Submitting to NanoBanana (attempt ${attempt}/${maxRetries})…`);
    try {
      const { task_id } = await FluxKontext.startNanoProcess(lastHalfBlob, [resizedRef], nanoPrompt || '');
      logStatus(finalSel, `Task created: ${task_id}`);
      const r = await FluxKontext.pollNanoResult(task_id, (j)=>{ if (j?.status) logStatus(finalSel, `Nano status: ${j.status}`); });
      if (r?.imageBase64) { result = r; break; }
      lastError = new Error(r?.error || 'No image from NanoBanana');
    } catch (e) {
      lastError = e;
      logStatus(finalSel, `Attempt ${attempt} failed: ${e?.message || e}`);
      if (e && e.debug !== undefined) { try { const dbg = typeof e.debug==='string'? e.debug : JSON.stringify(e.debug); logStatus(finalSel, `debug: ${String(dbg).slice(0,600)}${String(dbg).length>600?' …':''}`); } catch {} }
    }
  }
  if (result?.imageBase64) {
    stopTimer(finalSel, 'Done');
    setCanvasImage(finalSel, result.imageBase64);
    // ensure a working download button on Live Preview as well
    try {
      const panel2 = document.querySelector(finalSel);
      const old = panel2?.querySelector('.dl-btn');
      if (old) old.remove();
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dl-btn';
      btn.title = 'Download original';
      const icon = document.createElement('img');
      icon.src = './assets/download.svg';
      icon.alt = 'download';
      btn.appendChild(icon);
      const dataUrl = result.imageBase64;
      btn.onclick = () => {
        const a = document.createElement('a');
        a.href = dataUrl;
        const ts = new Date().toISOString().replace(/[:.]/g,'-');
        a.download = `final-${ts}.png`;
        document.body.appendChild(a); a.click(); a.remove();
      };
      panel2?.appendChild(btn);
    } catch {}
    logStatus(finalSel, 'Done');
  } else {
    stopTimer(finalSel, 'Failed'); setCanvasError(finalSel, `Generation failed: ${lastError?.message || 'No image from NanoBanana after 12 attempts'}`);
  }
}

// cache: last successful half image + main image signature
let __lastHalfBlob = null;
let __lastMainSig = null;
function __sigOf(file){
  return file ? `${file.name}|${file.size}|${file.lastModified||0}` : '';
}

// garment originals and padded cache
let __garmentOriginal = null;           // File or Blob (original garment as uploaded)
let __garmentOriginalName = null;       // original filename
let __garmentPaddedCache = null;        // Blob padded to current main size
let __garmentPaddedSig = null;          // signature of main used to produce padded

async function computePaddedGarment(mainFile, garmentOriginal){
  if (!mainFile || !garmentOriginal) return null;
  const mainSize = await getImageSizeFromFile(mainFile);
  const padded = await FluxKontext.resizeImageWithPadding(garmentOriginal, mainSize.width, mainSize.height, '#ffffff');
  __garmentPaddedCache = padded;
  __garmentPaddedSig = __sigOf(mainFile);
  return padded;
}

async function handleGenerate() {
  const targetSel = '#canvas1';
  const personInput = document.querySelector('.uploader[data-role="person"] .file-input');
  const clothesInput = document.querySelector('.uploader[data-role="clothes"] .file-input');
  // persisted Nano prompt
  let nanoPrompt = DEFAULT_NANO_PROMPT;
  try { const saved = localStorage.getItem(NANO_PROMPT_KEY); if (saved) nanoPrompt = saved; } catch {}

  const mainFile = personInput?.files?.[0];
  const garmentFile = clothesInput?.files?.[0] || __garmentOriginal; // 支持先上传 garment
  if (!mainFile) { setCanvasError(targetSel, 'Please upload Character Reference.'); return; }
  if (!garmentFile) { setCanvasError(targetSel, 'Please upload Garment Reference.'); return; }

  // 缓存 garment 原图（只在提供新文件时更新）
  if (clothesInput?.files?.[0]) {
    __garmentOriginal = clothesInput.files[0];
    __garmentOriginalName = __garmentOriginal.name || 'garment.png';
  }

  try {
    setCanvasLoading(targetSel, 'Running Flux (half image)…');
    startTimer(targetSel);
    const panel = document.querySelector(targetSel);
    const cancelBtn = panel?.querySelector('.btn-cancel');
    let cancelReject;
    const cancelPromise = new Promise((_, reject)=>{ cancelReject = reject; });
    currentCancel = () => { try { cancelReject?.(new Error('Cancelled by user')); } catch {} };
    cancelBtn?.addEventListener('click', ()=>{ currentCancel?.(); logStatus(targetSel, 'Cancelled by user'); });

    const currSig = __sigOf(mainFile);
    let halfBlob;
    let fluxMs = 0;

    // reuse half image if main not changed
    if (__lastHalfBlob && __lastMainSig === currSig) {
      logStatus(targetSel, 'Reuse cached half image (skip Flux)');
      halfBlob = __lastHalfBlob;
    } else {
      logStatus(targetSel, 'Uploading Character Reference…');
      const tFluxStart = performance.now();
      const fluxRes = await FluxKontext.runFlux(mainFile, 'remove clothes', { steps: 8 });
      logStatus(targetSel, 'Flux submitted. Waiting for half image…');
      const halfUrl = fluxRes?.halfImageUrl;
      if (!halfUrl) throw new Error('Flux did not return half image URL');
      logStatus(targetSel, 'Half image URL received. Fetching…');
      halfBlob = await fetchBlob(halfUrl);
      fluxMs = performance.now() - tFluxStart;
      logStatus(targetSel, `Flux time: ${(fluxMs/1000).toFixed(2)} s`);
      __lastHalfBlob = halfBlob; __lastMainSig = currSig;
    }

    // 计算/复用 padded garment：
    let paddedGarment = __garmentPaddedCache;
    if (!paddedGarment || __garmentPaddedSig !== currSig) {
      logStatus(targetSel, 'Recomputing garment padding to match character size…', { withTime:false });
      paddedGarment = await computePaddedGarment(mainFile, __garmentOriginal || garmentFile);
    }

    // 发送到 Nano
    logStatus(targetSel, 'Submitting to NanoBanana…', { withTime:false });
    const mainSize = await getImageSizeFromFile(mainFile); // 仅用于日志
    try { const preview = (nanoPrompt||'').replace(/\s+/g,' ').slice(0,120); logStatus(targetSel, `Nano prompt: "${preview}${preview.length===120?'…':''}"`, { withTime:false }); } catch {}

    const maxRetries = 6;
    let attempt = 0; let lastError = null; let result = null;
    while (attempt < maxRetries && !result) {
      attempt++;
      setAttempt(targetSel, attempt, maxRetries);
      logStatus(targetSel, `Submitting to NanoBanana (attempt ${attempt}/${maxRetries})…`, { withTime: false });
      try {
        const tNanoStart = performance.now();
        const { task_id } = await FluxKontext.startNanoProcess(halfBlob, [paddedGarment], nanoPrompt || '');
        logStatus(targetSel, `task_id: ${task_id}`, { withTime: false });
        const r = await Promise.race([
          FluxKontext.pollNanoResult(task_id, (j) => {
            if (j) {
              if (j.status) logStatus(targetSel, `status: ${j.status}`, { withTime: false });
              if (j.error) logStatus(targetSel, `error: ${j.error}`, { withTime: false });
              if (j.debug) { try { const dbg = typeof j.debug==='string'? j.debug : JSON.stringify(j.debug); logStatus(targetSel, `debug: ${String(dbg).slice(0,600)}${String(dbg).length>600?' …':''}`, { withTime: false }); } catch {} }
            }
          }),
          cancelPromise,
        ]);
        if (r?.imageBase64) {
          const nanoMs = performance.now() - tNanoStart;
          result = r;
          stopTimer(targetSel, 'Done');
          const panel2 = document.querySelector(targetSel);
          const cw = Math.max(1, (panel2?.clientWidth || 1024));
          const ch = Math.max(1, (panel2?.clientHeight || 768));
          let previewUrl = r.imageBase64;
          try { previewUrl = await downscaleDataURL(r.imageBase64, cw, ch, 'image/jpeg', 0.9); } catch {}
          setCanvasImage(targetSel, previewUrl);
          // remember original full-res for refine
          try { lastFinalImageBase64 = r.imageBase64; } catch {}
          // update download button
          try { const old = panel2.querySelector('.dl-btn'); if (old) old.remove(); const btn = document.createElement('button'); btn.type='button'; btn.className='dl-btn'; btn.title='Download original'; const icon=document.createElement('img'); icon.src='./assets/download.svg'; icon.alt='download'; btn.appendChild(icon); btn.onclick=()=>{ const a=document.createElement('a'); a.href=r.imageBase64; const ts=new Date().toISOString().replace(/[:.]/g,'-'); a.download=`final-${ts}.png`; document.body.appendChild(a); a.click(); a.remove(); }; panel2.appendChild(btn);} catch {}
          // auto-fill Refine Reference preview with the generated image (keep uploader behavior)
          try {
            const refine = document.querySelector('.uploader[data-role="refine"]');
            const prev = refine?.querySelector('.preview');
            if (prev) {
              let small = r.imageBase64;
              try { small = await downscaleDataURL(r.imageBase64, 270, 270, 'image/jpeg', 0.9); } catch {}
              prev.src = small; prev.hidden = false;
            }
          } catch {}
          logStatus(targetSel, `nano: ${(nanoMs/1000).toFixed(2)} s · flux+nano: ${((fluxMs+nanoMs)/1000).toFixed(2)} s`);
          break;
        }
        if (r instanceof Error) throw r;
        lastError = new Error(r?.error || 'No image from NanoBanana');
      } catch (e) {
        lastError = e; logStatus(targetSel, `error: ${e?.message || e}`, { withTime:false }); if (e && e.debug !== undefined) { try { const dbg = typeof e.debug==='string'? e.debug : JSON.stringify(e.debug); logStatus(targetSel, `debug: ${String(dbg).slice(0,600)}${String(dbg).length>600?' …':''}`, { withTime:false }); } catch {} } if (String(e?.message||e).includes('Cancelled')) break;
      }
    }
    if (!result) throw new Error(lastError?.message || 'No image from NanoBanana after 6 attempts');
  } catch (e) { const msg = e?.message || String(e); stopTimer(targetSel, 'Failed'); setCanvasError(targetSel, `Generation failed: ${msg}`); logStatus(targetSel, 'Final status: failed after maximum retries', { withTime:false }); if (/Failed to fetch|CORS/i.test(msg)) { console.warn('Hint: ensure backend allows 127.0.0.1:5174 and ComfyUI is up'); } }
}

// Bind button exclusively (remove any existing listeners like mockGenerate)
(() => {
  const btn = document.querySelector('.generate-btn');
  if (!btn) return;
  const cloned = btn.cloneNode(true); // remove existing listeners
  btn.parentNode.replaceChild(cloned, btn);
  cloned.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    handleGenerate();
  });
})();

// copy/paste handlers for Main Prompt
(() => {
  const ta = document.getElementById('prompt');
  const copyBtn = document.getElementById('copy-prompt');
  const pasteBtn = document.getElementById('paste-prompt');
  copyBtn?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(ta?.value || ''); } catch (e) { console.warn('copy failed', e); }
  });
  pasteBtn?.addEventListener('click', async () => {
    try { const text = await navigator.clipboard.readText(); if (ta) { ta.value = text || ''; ta.dispatchEvent(new Event('input', { bubbles:true })); } } catch (e) { console.warn('paste failed', e); }
  });
})();

// removed nano-only prompt persistence

// retry max persistence
(() => {
  const input = document.getElementById('retry-max');
  const save = document.getElementById('retry-save');
  try {
    const saved = localStorage.getItem(RETRY_KEY);
    if (saved && input) input.value = saved;
  } catch {}
  save?.addEventListener('click', (e) => {
    e.preventDefault();
    const val = Math.max(1, Math.min(10, parseInt(input?.value || '3', 10)));
    try { localStorage.setItem(RETRY_KEY, String(val)); } catch {}
    alert('已保存最大重试次数');
  });
})();

// spin keyframes (if not present)
const style = document.createElement('style');
style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
document.head.appendChild(style);

// dev: show a disabled download button even in idle state
(() => {
  const panel = document.querySelector('#canvas1');
  if (panel && !panel.querySelector('.dl-btn')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dl-btn';
    btn.disabled = true;
    btn.title = 'Download original';
    const icon = document.createElement('img');
    icon.src = './assets/download.svg';
    icon.alt = 'download';
    btn.appendChild(icon);
    panel.appendChild(btn);
  }
})();

// dev: also place a disabled download button in Live Preview when idle
(() => {
  const panel = document.querySelector('#canvas2');
  if (panel && !panel.querySelector('.dl-btn')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dl-btn';
    btn.disabled = true;
    btn.title = 'Download original';
    const icon = document.createElement('img');
    icon.src = './assets/download.svg';
    icon.alt = 'download';
    btn.appendChild(icon);
    panel.appendChild(btn);
  }
})();

// (removed) paste-from-output quick button — now using the standard uploader only

// ---- refine flow: use previous Output Gallery image + prompt, send to Nano, render in Live Preview ----
async function handleRefine(){
  const targetSel = '#canvas2';
  const promptEl = document.getElementById('prompt');
  const promptText = (promptEl?.value || '').trim();
  // half image: prefer original full-res from step1; fallback to the displayed image
  let halfDataUrl = lastFinalImageBase64;
  if (!halfDataUrl) {
    const img = document.querySelector('#canvas1 img');
    if (img && img.src) halfDataUrl = img.src;
  }
  if (!halfDataUrl) { setCanvasError(targetSel, 'No image in Output Gallery to refine.'); return; }

  // optional refine reference image
  const refineInput = document.querySelector('.uploader[data-role="refine"] .file-input');
  const refFile = refineInput?.files?.[0];

  try {
    setCanvasLoading(targetSel, 'Refining with NanoBanana…');
    startTimer(targetSel);
    const panel = document.querySelector(targetSel);
    const cancelBtn = panel?.querySelector('.btn-cancel');
    let cancelReject; const cancelPromise = new Promise((_, reject)=>{ cancelReject = reject; });
    currentCancel = () => { try { cancelReject?.(new Error('Cancelled by user')); } catch {} };
    cancelBtn?.addEventListener('click', ()=>{ currentCancel?.(); logStatus(targetSel, 'Cancelled by user'); });

    // convert dataURL to Blob
    const halfBlob = await (await fetch(halfDataUrl)).blob();
    const refs = refFile ? [refFile] : [];
    if (promptText) { try { const pvw = promptText.replace(/\s+/g,' ').slice(0,120); logStatus(targetSel, `Refine prompt: "${pvw}${pvw.length===120?'…':''}"`, { withTime:false }); } catch {} }

    const maxRetries = 6; let attempt = 0; let lastError = null; let result = null; const tStart = performance.now();
    while (attempt < maxRetries && !result) {
      attempt++; setAttempt(targetSel, attempt, maxRetries);
      logStatus(targetSel, `Submitting to NanoBanana (attempt ${attempt}/${maxRetries})…`, { withTime:false });
      try {
        const { task_id } = await FluxKontext.startNanoProcess(halfBlob, refs, promptText || '');
        logStatus(targetSel, `task_id: ${task_id}`, { withTime:false });
        const r = await Promise.race([
          FluxKontext.pollNanoResult(task_id, (j)=>{ if (j) { if (j.status) logStatus(targetSel, `status: ${j.status}`, { withTime:false }); if (j.error) logStatus(targetSel, `error: ${j.error}`, { withTime:false }); if (j.debug) { try { const dbg = typeof j.debug==='string'? j.debug : JSON.stringify(j.debug); logStatus(targetSel, `debug: ${String(dbg).slice(0,600)}${String(dbg).length>600?' …':''}`, { withTime:false }); } catch {} } } }),
          cancelPromise,
        ]);
        if (r?.imageBase64) {
          result = r; break;
        }
        if (r instanceof Error) throw r;
        lastError = new Error(r?.error || 'No image from NanoBanana');
      } catch (e) { lastError = e; logStatus(targetSel, `error: ${e?.message || e}`, { withTime:false }); if (String(e?.message||e).includes('Cancelled')) break; }
    }
    if (!result) throw new Error(lastError?.message || 'No image from NanoBanana after 6 attempts');

    // success → render into Live Preview and enable download
    const panel2 = document.querySelector(targetSel);
    const cw = Math.max(1, (panel2?.clientWidth || 1024));
    const ch = Math.max(1, (panel2?.clientHeight || 768));
    let previewUrl = result.imageBase64; try { previewUrl = await downscaleDataURL(result.imageBase64, cw, ch, 'image/jpeg', 0.9); } catch {}
    stopTimer(targetSel, 'Done');
    setCanvasImage(targetSel, previewUrl);
    try { const old = panel2.querySelector('.dl-btn'); if (old) old.remove(); const btn = document.createElement('button'); btn.type='button'; btn.className='dl-btn'; btn.title='Download original'; const icon=document.createElement('img'); icon.src='./assets/download.svg'; icon.alt='download'; btn.appendChild(icon); btn.onclick=()=>{ const a=document.createElement('a'); a.href=result.imageBase64; const ts=new Date().toISOString().replace(/[:.]/g,'-'); a.download=`refined-${ts}.png`; document.body.appendChild(a); a.click(); a.remove(); }; panel2.appendChild(btn);} catch {}
    const totalMs = performance.now() - tStart; logStatus(targetSel, `refine: ${(totalMs/1000).toFixed(2)} s`, { withTime:false });
  } catch (e) { const msg = e?.message || String(e); stopTimer(targetSel, 'Failed'); setCanvasError(targetSel, `Refine failed: ${msg}`); }
}

// bind Step2 Apply & Generate button
(() => {
  const btn = document.getElementById('refine-generate');
  if (!btn) return;
  const clone = btn.cloneNode(true); btn.parentNode.replaceChild(clone, btn);
  clone.addEventListener('click', (e)=>{ e.preventDefault(); e.stopImmediatePropagation(); handleRefine(); });
})();


