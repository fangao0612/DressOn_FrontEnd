// User-facing flow: after Generate, automatically run Flux then NanoBanana
import { FluxKontext } from './sdk/apiClient.js';

const DOWNLOAD_ICON = new URL('./assets/download.svg', import.meta.url).href;

// Configure backend base URL：优先 localStorage / window 全局变量，其次环境变量，最后回退本地 9091
try {
  let candidate;
  if (typeof window !== 'undefined') {
    candidate = (typeof window.localStorage !== 'undefined' && window.localStorage.getItem('API_HOST'))
      || window.FLUX_KONTEXT_BASE_URL;
  }
  if (!candidate && typeof process !== 'undefined' && process.env) {
    candidate = process.env.NEXT_PUBLIC_API_HOST
      || process.env.NEXT_PUBLIC_BACKEND_BASE_URL
      || process.env.NEXT_PUBLIC_BASE_URL
      || process.env.API_HOST;
  }
  if (!candidate) {
    try {
      const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
      if (env) {
        candidate = env.VITE_API_HOST || env.VITE_BACKEND_BASE_URL || env.VITE_BASE_URL || candidate;
      }
    } catch (_) {
      // 忽略 import.meta 在某些打包环境不存在的情况
    }
  }
  if (candidate) {
    FluxKontext.setBaseUrl(candidate);
  }
} catch {
  // 保留 apiClient.js 中的默认值逻辑
}

const $ = (s, ctx = document) => ctx.querySelector(s);

// 全局默认 NanoBanana 提示词（持久化保存，直至用户要求修改）
const NANO_PROMPT_KEY = 'nanoPrompt.saved';
const RETRY_KEY = 'nanoRetry.max';
const DEFAULT_NANO_PROMPT = `Directly generate the image and do not return any text. Remove adult content and any sensitive elements; make it suitable for all ages; ensure it is a completely healthy artistic expression. Remove any suggestive or provocative elements and any exposed nipples.

Make it suitable for all ages. Remove white borders from the image. Portray a gender-neutral, elegant, and understated human with no sexual characteristics. Dress them in the clothing from the reference image. Keep the pose and camera angle unchanged, and do not alter the original facial features or hairstyle. Remove white borders from the image.

Remove adult content and any sensitive elements; make it suitable for all ages; ensure it is a completely healthy artistic expression. Remove any suggestive or provocative elements and any exposed nipples. Make it suitable for all ages. Directly generate the image and do not return any text.`;
try {
  // 仅在不存在时写入默认值，不覆盖用户已保存的提示词
  const existing = localStorage.getItem(NANO_PROMPT_KEY);
  if (!existing) localStorage.setItem(NANO_PROMPT_KEY, DEFAULT_NANO_PROMPT);
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
  <button class="dl-btn" disabled title="Download original"><img src="${DOWNLOAD_ICON}" alt="download" /></button>`;
}

function setCanvasError(sel, message) {
  const panel = $(sel);
  if (!panel) return;
  panel.innerHTML = `<div style="color:#ff8585;line-height:1.6">${message}</div>`;
}

function setCanvasImage(sel, src) {
  const panel = $(sel);
  if (!panel) {
    console.error('[DEBUG] Panel not found:', sel);
    return;
  }

  // Add debug border to canvas
  panel.style.border = '3px solid red';

  console.log('[DEBUG] Canvas dimensions:', {
    selector: sel,
    width: panel.clientWidth,
    height: panel.clientHeight,
    offsetWidth: panel.offsetWidth,
    offsetHeight: panel.offsetHeight,
    scrollWidth: panel.scrollWidth,
    scrollHeight: panel.scrollHeight,
    computedStyles: {
      width: window.getComputedStyle(panel).width,
      height: window.getComputedStyle(panel).height,
      flex: window.getComputedStyle(panel).flex,
      display: window.getComputedStyle(panel).display,
      overflow: window.getComputedStyle(panel).overflow
    }
  });

  panel.innerHTML = '';
  const img = document.createElement('img');
  img.src = src;


  // 默认约束，确保自适应不裁剪
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.maxWidth = '100%';
  img.style.maxHeight = '100%';
  img.style.objectFit = 'contain';
  img.style.objectPosition = 'center';

  // Log image dimensions after load
  img.onload = () => {
    console.log('[DEBUG] Image loaded:', {
      src: src.substring(0, 100) + '...',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(3),
      clientWidth: img.clientWidth,
      clientHeight: img.clientHeight,
      renderedAspectRatio: (img.clientWidth / img.clientHeight).toFixed(3),
      offsetWidth: img.offsetWidth,
      offsetHeight: img.offsetHeight,
      computedStyles: {
        width: window.getComputedStyle(img).width,
        height: window.getComputedStyle(img).height,
        maxWidth: window.getComputedStyle(img).maxWidth,
        maxHeight: window.getComputedStyle(img).maxHeight,
        objectFit: window.getComputedStyle(img).objectFit,
        objectPosition: window.getComputedStyle(img).objectPosition
      }
    });

    const panelWidth = panel.clientWidth || panel.offsetWidth;
    const panelHeight = panel.clientHeight || panel.offsetHeight;
    if (panelWidth && panelHeight && img.naturalWidth && img.naturalHeight) {
      const scale = Math.min(panelWidth / img.naturalWidth, panelHeight / img.naturalHeight, 1);
      img.style.width = `${Math.round(img.naturalWidth * scale)}px`;
      img.style.height = `${Math.round(img.naturalHeight * scale)}px`;
    } else {
      img.style.width = 'auto';
      img.style.height = 'auto';
    }
  };

  panel.appendChild(img);

  console.log('[DEBUG] Image element added to canvas');
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
  const maxRetries = 1;
  let attempt = 0; let lastError = null; let result = null;
  while (attempt < maxRetries && !result) {
    attempt++;
    setAttempt(finalSel, attempt, maxRetries);
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
      icon.src = DOWNLOAD_ICON;
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
let __garmentOriginalSig = null;        // signature of garment original

async function computePaddedGarment(mainFile, garmentOriginal){
  if (!mainFile || !garmentOriginal) return null;
  const mainSize = await getImageSizeFromFile(mainFile);
  const padded = await FluxKontext.resizeImageWithPadding(garmentOriginal, mainSize.width, mainSize.height, '#ffffff');
  __garmentPaddedCache = padded;
  __garmentPaddedSig = __sigOf(mainFile);
  __garmentOriginalSig = __sigOf(garmentOriginal);
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
      // 后端代理返回的 base64 优先
      const halfB64 = fluxRes?.halfImageBase64;
      if (halfB64) {
        logStatus(targetSel, 'Half image received via backend proxy');
        const tBlobStart = performance.now();
        halfBlob = await (await fetch(halfB64)).blob();
        const blobMs = performance.now() - tBlobStart;
        logStatus(targetSel, `Half image blob conversion: ${(blobMs/1000).toFixed(2)} s`);
      } else {
        const halfUrl = fluxRes?.halfImageUrl;
        if (!halfUrl) throw new Error('Flux did not return half image');
        logStatus(targetSel, 'Half image URL received. Fetching…');
        halfBlob = await fetchBlob(halfUrl);
      }
      fluxMs = performance.now() - tFluxStart;
      logStatus(targetSel, `Flux total time: ${(fluxMs/1000).toFixed(2)} s`);
      __lastHalfBlob = halfBlob; __lastMainSig = currSig;
    }

    // 计算/复用 padded garment：检查主图和garment是否都没变
    const currentGarmentSig = __sigOf(__garmentOriginal || garmentFile);
    let paddedGarment = __garmentPaddedCache;
    const needRecompute = !paddedGarment || 
                          __garmentPaddedSig !== currSig ||  // 主图变了
                          __garmentOriginalSig !== currentGarmentSig; // garment变了
    if (needRecompute) {
      logStatus(targetSel, 'Recomputing garment padding to match character size…', { withTime:false });
      const tPaddingStart = performance.now();
      paddedGarment = await computePaddedGarment(mainFile, __garmentOriginal || garmentFile);
      const paddingMs = performance.now() - tPaddingStart;
      logStatus(targetSel, `Garment padding complete: ${(paddingMs/1000).toFixed(2)} s`);
      console.log('[garment cache] Padded garment recomputed');
    } else {
      logStatus(targetSel, 'Reusing cached padded garment');
      console.log('[garment cache] Reusing cached padded garment');
    }

    // 发送到 Nano
    logStatus(targetSel, 'Submitting to NanoBanana…', { withTime:false });
    const mainSize = await getImageSizeFromFile(mainFile); // 仅用于日志
    try { const preview = (nanoPrompt||'').replace(/\s+/g,' ').slice(0,120); logStatus(targetSel, `Nano prompt: "${preview}${preview.length===120?'…':''}"`, { withTime:false }); } catch {}

    const maxRetries = 1;
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
          // If result is a URL (not data:), use it directly for fast display
          // Browser will handle async download, avoiding the 80s delay from downscaleDataURL
          let previewUrl = r.imageBase64;
          if (!r.imageBase64.startsWith('data:')) {
            // It's a URL - use it directly
            previewUrl = r.imageBase64;
          } else {
            // It's base64 data - downscale it
            try { previewUrl = await downscaleDataURL(r.imageBase64, cw, ch, 'image/jpeg', 0.9); } catch {}
          }
          setCanvasImage(targetSel, previewUrl);
          // remember original full-res for refine
          try { lastFinalImageBase64 = r.imageBase64; } catch {}
          // update download button
          try { const old = panel2.querySelector('.dl-btn'); if (old) old.remove(); const btn = document.createElement('button'); btn.type='button'; btn.className='dl-btn'; btn.title='Download original'; const icon=document.createElement('img'); icon.src=DOWNLOAD_ICON; icon.alt='download'; btn.appendChild(icon); btn.onclick=()=>{ const a=document.createElement('a'); a.href=r.imageBase64; const ts=new Date().toISOString().replace(/[:.]/g,'-'); a.download=`final-${ts}.png`; document.body.appendChild(a); a.click(); a.remove(); }; panel2.appendChild(btn);} catch {}
          // auto-fill Refine Reference preview with the generated image (keep uploader behavior)
          try {
            const refine = document.querySelector('.uploader[data-role="refine"]');
            const prev = refine?.querySelector('.preview');
            if (prev) {
              let small = r.imageBase64;
              // If it's a URL, use it directly; if base64, downscale it
              if (!r.imageBase64.startsWith('data:')) {
                small = r.imageBase64;
              } else {
                try { small = await downscaleDataURL(r.imageBase64, 270, 270, 'image/jpeg', 0.9); } catch {}
              }
              prev.src = small; prev.hidden = false;
            }
          } catch {}
          logStatus(targetSel, `nano: ${(nanoMs/1000).toFixed(2)} s · flux+nano: ${((fluxMs+nanoMs)/1000).toFixed(2)} s`);
          // refresh credits after success
          refreshCreditsBadge();
          break;
        }
        if (r instanceof Error) throw r;
        lastError = new Error(r?.error || 'No image from NanoBanana');
      } catch (e) {
        lastError = e; logStatus(targetSel, `error: ${e?.message || e}`, { withTime:false }); if (e && e.debug !== undefined) { try { const dbg = typeof e.debug==='string'? e.debug : JSON.stringify(e.debug); logStatus(targetSel, `debug: ${String(dbg).slice(0,600)}${String(dbg).length>600?' …':''}`, { withTime:false }); } catch {} } if (String(e?.message||e).includes('Cancelled')) break;
      }
    }
    if (!result) throw new Error(lastError?.message || 'No image from NanoBanana after 6 attempts');
  } catch (e) { const msg = e?.message || String(e); stopTimer(targetSel, 'Failed'); setCanvasError(targetSel, `Generation failed: ${msg}`); logStatus(targetSel, 'Final status: failed after maximum retries', { withTime:false }); if (/Failed to fetch|CORS/i.test(msg)) { console.warn('Hint: ensure backend allows 127.0.0.1:5174 and ComfyUI is up'); } if (/402/.test(String(e))) { alert('余额不足，请购买或等候发放'); } }
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

// helper: refresh credits badge from /me
async function refreshCreditsBadge(){
  try{
    const me = await FluxKontext.getMe();
    const amount = (me.credits && me.credits.balance != null) ? String(me.credits.balance) : null;
    if (amount) {
      const el = document.querySelector('.pill.credits .amount');
      if (el) el.textContent = amount;
    }
  }catch{}
}

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
    icon.src = DOWNLOAD_ICON;
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
    icon.src = DOWNLOAD_ICON;
    icon.alt = 'download';
    btn.appendChild(icon);
    panel.appendChild(btn);
  }
})();

// ---- profile/login wiring (5174 用户端) ----
(() => {
  const btn = document.querySelector('.profile-btn');
  const pop = document.querySelector('.profile-popover');
  const loginBtn = document.querySelector('.login-btn');
  const logoutBtn = document.querySelector('.logout-btn');
  const line = document.querySelector('.profile-popover .me-line');
  const signInBtn = document.querySelector('.sign-in-btn');
  const authModal = document.getElementById('auth-modal');
  const authTabs = document.querySelectorAll('.auth-tab');
  const authGoogleBtn = document.getElementById('auth-google-btn');
  const authEmailInput = document.getElementById('auth-email');
  const authEmailSendBtn = document.getElementById('auth-email-send-btn');
  const authEmailVerify = document.getElementById('auth-email-verify');
  const authEmailCode = document.getElementById('auth-email-code');
  const authEmailVerifyBtn = document.getElementById('auth-email-verify-btn');
  const authEmailResendBtn = document.getElementById('auth-email-resend-btn');
  const authEmailStatus = document.getElementById('auth-email-status');
  const authCloseBtn = document.getElementById('auth-close') || document.querySelector('.auth-close');
  const authBackdrop = document.getElementById('auth-backdrop') || document.querySelector('.auth-backdrop');
  // 头像菜单仅在已登录且元素存在时绑定，避免阻断后续登录弹窗绑定
  btn?.addEventListener('click', ()=>{ if (pop) pop.hidden = !pop.hidden; });
  document.addEventListener('click', (e)=>{
    if (pop && !pop.hidden && !pop.contains(e.target) && e.target !== btn) pop.hidden = true;
  });
  const refreshMe = async () => {
    try {
      const me = await FluxKontext.getMe();
      if (me && me.user) {
        line.textContent = me.user.email || me.user.name || 'Signed in';
        logoutBtn.hidden = false; loginBtn.hidden = true;
        // avatar initial
        const letter = (me.user.email||me.user.name||'')[0] || 'F';
        btn.textContent = letter.toUpperCase();
        document.documentElement.setAttribute('data-auth', 'on');
        btn.hidden = false;
        if (signInBtn) { signInBtn.hidden = true; signInBtn.style.display = 'none'; }
        // update credits badge if present
        try {
          const amount = (me.credits && me.credits.balance != null) ? String(me.credits.balance) : null;
          if (amount) {
            const el = document.querySelector('.pill.credits .amount');
            if (el) el.textContent = amount;
          }
        } catch {}
      } else {
        throw new Error('no me');
      }
    } catch {
      line.textContent = 'Not signed in';
      logoutBtn.hidden = true; loginBtn.hidden = false;
      btn.textContent = 'F';
      document.documentElement.removeAttribute('data-auth');
      btn.hidden = true;
      if (signInBtn) {
        signInBtn.hidden = false;
        signInBtn.style.display = '';
        // 未登录时：进入前端路由 /auth/signin，锁定滚动，仅打开弹窗
        signInBtn.onclick = () => openAuth();
      }
    }
  };
  const openAuth = () => {
    try { history.pushState({auth:true}, '', '#/auth/signin'); } catch {}
    document.body.classList.add('no-scroll');
    try { document.documentElement.setAttribute('data-authpage','1'); } catch {}
    if (authModal) authModal.hidden = false;
  };
  const closeAuth = () => { if (authModal) authModal.hidden = true; };
  const exitAuth = () => {
    closeAuth();
    document.body.classList.remove('no-scroll');
    try { document.documentElement.removeAttribute('data-authpage'); } catch {}
    try { if (location.hash === '#/auth/signin') history.back(); } catch {}
  };
  // 委托绑定，确保无论何时加载都能生效
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t) return;
    if (t.id === 'auth-backdrop' || (t.classList && t.classList.contains('auth-backdrop'))) {
      e.preventDefault();
      e.stopPropagation();
      exitAuth();
      return;
    }
    const closeBtn = t.closest ? t.closest('.auth-close') : null;
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      exitAuth();
      return;
    }
  });
  // 直接绑定一次，避免委托被拦截
  authCloseBtn?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); exitAuth(); });
  authBackdrop?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); exitAuth(); });
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') exitAuth(); });
  authTabs.forEach(tab => tab.addEventListener('click', () => {
    authTabs.forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const key = tab.getAttribute('data-tab');
    document.querySelectorAll('.auth-pane').forEach(p=>{
      const match = p.getAttribute('data-pane') === key;
      p.classList.toggle('active', match);
    });
  }));
  authGoogleBtn?.addEventListener('click', async ()=>{
    try {
      // 使用原有的 Google OAuth（已验证可用）
      window.location.href = 'https://dresson-backend.onrender.com/auth/login';
    } catch (error) {
      console.error('Google login failed:', error);
      alert('登录失败: ' + error.message);
    }
  });

  // 邮箱验证码登录功能
  let currentEmail = '';
  let resendTimer = null;
  
  const startResendCountdown = () => {
    let seconds = 60;
    authEmailResendBtn.disabled = true;
    authEmailResendBtn.textContent = `Resend in ${seconds}s`;
    
    resendTimer = setInterval(() => {
      seconds--;
      if (seconds > 0) {
        authEmailResendBtn.textContent = `Resend in ${seconds}s`;
      } else {
        clearInterval(resendTimer);
        authEmailResendBtn.disabled = false;
        authEmailResendBtn.textContent = 'Resend Code';
      }
    }, 1000);
  };
  
  authEmailSendBtn?.addEventListener('click', async ()=>{
    const email = authEmailInput?.value?.trim();
    if (!email) {
      authEmailStatus.textContent = '请输入邮箱地址';
      return;
    }
    
    try {
      authEmailSendBtn.disabled = true;
      authEmailSendBtn.innerHTML = '<span class="spinner"></span>Sending...';
      authEmailStatus.textContent = '正在发送验证码...';
      
      await FluxKontext.emailSend(email);
      currentEmail = email;
      
      // 显示验证码输入界面
      document.getElementById('auth-email-input-step').style.display = 'none';
      authEmailVerify.style.display = 'block';
      document.getElementById('sent-email').textContent = email;
      
      // 启动倒计时
      startResendCountdown();
      
      authEmailCode.focus();
    } catch (error) {
      console.error('Email send failed:', error);
      authEmailStatus.textContent = '发送失败: ' + error.message;
    } finally {
      authEmailSendBtn.disabled = false;
      authEmailSendBtn.textContent = 'Send Verification Code';
    }
  });

  // Back 按钮功能
  const authEmailBackBtn = document.getElementById('auth-email-back-btn');
  authEmailBackBtn?.addEventListener('click', () => {
    // 清除倒计时
    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
    
    // 重置界面
    document.getElementById('auth-email-input-step').style.display = 'block';
    authEmailVerify.style.display = 'none';
    authEmailCode.value = '';
    authEmailStatus.textContent = 'Enter your email to receive a verification code.';
  });

  authEmailVerifyBtn?.addEventListener('click', async ()=>{
    const code = authEmailCode?.value?.trim();
    if (!code || !currentEmail) {
      alert('请输入验证码');
      return;
    }
    
    try {
      authEmailVerifyBtn.disabled = true;
      authEmailVerifyBtn.innerHTML = '<span class="spinner"></span>Verifying...';
      
      await FluxKontext.emailVerify(currentEmail, code);
      
      // 清除倒计时
      if (resendTimer) {
        clearInterval(resendTimer);
        resendTimer = null;
      }
      
      exitAuth();
      refreshMe();
    } catch (error) {
      console.error('Email verify failed:', error);
      alert('验证失败: ' + error.message);
    } finally {
      authEmailVerifyBtn.disabled = false;
      authEmailVerifyBtn.textContent = 'Verify & Sign In';
    }
  });

  authEmailResendBtn?.addEventListener('click', async ()=>{
    if (!currentEmail) return;
    
    // 清除旧的倒计时
    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
    
    try {
      authEmailResendBtn.disabled = true;
      authEmailResendBtn.innerHTML = '<span class="spinner"></span>Sending...';
      
      await FluxKontext.emailSend(currentEmail);
      
      // 重新启动倒计时
      startResendCountdown();
      
      // 显示成功提示（可选）
      const banner = document.querySelector('.auth-success-banner .success-text');
      if (banner) {
        const originalText = banner.innerHTML;
        banner.innerHTML = `Verification code resent to <span id="sent-email">${currentEmail}</span>`;
        setTimeout(() => {
          banner.innerHTML = originalText;
        }, 3000);
      }
    } catch (error) {
      console.error('Email resend failed:', error);
      alert('重发失败: ' + error.message);
      authEmailResendBtn.disabled = false;
      authEmailResendBtn.textContent = 'Resend Code';
    }
  });

  loginBtn?.addEventListener('click', openAuth);
  logoutBtn?.addEventListener('click', async ()=>{ try { await FluxKontext.logout(); } catch {} refreshMe(); });
  signInBtn?.addEventListener('click', (e)=>{ e.preventDefault(); openAuth(); });
  refreshMe();
})();

// 当直接访问 #/auth/signin 时自动打开登录弹窗；离开时关闭
(() => {
  const modal = document.getElementById('auth-modal');
  function syncAuthRoute(){
    const isAuth = location.hash === '#/auth/signin';
    if (isAuth) {
      document.body.classList.add('no-scroll');
      document.documentElement.setAttribute('data-authpage','1');
      if (modal) modal.hidden = false;
    } else {
      if (modal) modal.hidden = true;
      document.body.classList.remove('no-scroll');
      document.documentElement.removeAttribute('data-authpage');
    }
  }
  window.addEventListener('hashchange', syncAuthRoute);
  syncAuthRoute();
})();

// (removed) paste-from-output quick button — now using the standard uploader only

// ---- refine flow: use previous Output Gallery image + prompt, send to Nano, render in Live Preview ----
async function handleRefine(){
  const targetSel = '#canvas2';
  const promptEl = document.getElementById('prompt');
  const promptText = (promptEl?.value || '').trim();
  // Check if user uploaded a local image in "Refine Reference" uploader
  const refineInput = document.querySelector('.uploader[data-role="refine"] .file-input');
  const refFile = refineInput?.files?.[0];

  // Determine the half image source:
  // Priority 1: Use uploaded file from Refine Reference uploader (if available)
  // Priority 2: Use Step 1 output (lastFinalImageBase64)
  let halfSource = null;  // Will be either File or DataURL string
  let halfBlob = null;

  if (refFile) {
    // User uploaded a local image - use it as the image to refine
    halfSource = refFile;
    logStatus(targetSel, 'Using uploaded image from Refine Reference', { withTime:false });
  } else if (lastFinalImageBase64) {
    // Use Step 1 output (must be full-res, never thumbnail!)
    halfSource = lastFinalImageBase64;
    logStatus(targetSel, 'Using Step 1 output image', { withTime:false });
  } else {
    setCanvasError(targetSel, 'No image to refine. Please upload an image in "Refine Reference" or run Step 1 first.');
    return;
  }

  try {
    setCanvasLoading(targetSel, 'Refining with NanoBanana…');
    startTimer(targetSel);
    const panel = document.querySelector(targetSel);
    const cancelBtn = panel?.querySelector('.btn-cancel');
    let cancelReject; const cancelPromise = new Promise((_, reject)=>{ cancelReject = reject; });
    currentCancel = () => { try { cancelReject?.(new Error('Cancelled by user')); } catch {} };
    cancelBtn?.addEventListener('click', ()=>{ currentCancel?.(); logStatus(targetSel, 'Cancelled by user'); });

    // Determine how to handle halfSource
    // If it's a URL (not data:), pass it directly to backend
    // Backend will fetch it (much faster for internal URLs)
    // If it's a File/Blob, pass as-is
    // If it's a data: URL, it will be converted by startNanoProcess
    let halfToSend;
    if (halfSource instanceof File || halfSource instanceof Blob) {
      // Direct file upload - use as-is
      halfToSend = halfSource;
      // Validate blob size (thumbnails are typically < 5KB, full images should be much larger)
      if (halfToSend.size < 5000) {
        throw new Error(`Invalid image size (${halfToSend.size} bytes). Image too small - please use a full-resolution image.`);
      }
    } else if (typeof halfSource === 'string' && !halfSource.startsWith('data:')) {
      // It's a URL (from step1 result) - pass directly to backend
      // Backend will fetch it server-side (avoids 110s browser fetch delay)
      halfToSend = halfSource;
      logStatus(targetSel, `Using step1 output URL (fast server-side fetch)`, { withTime:false });
    } else {
      // It's a data: URL - pass to startNanoProcess which will convert it
      halfToSend = halfSource;
    }

    // No additional ref images needed since we're using the uploaded image as half_image
    const refs = [];
    if (promptText) { try { const pvw = promptText.replace(/\s+/g,' ').slice(0,120); logStatus(targetSel, `Refine prompt: "${pvw}${pvw.length===120?'…':''}"`, { withTime:false }); } catch {} }

    const maxRetries = 1; let attempt = 0; let lastError = null; let result = null; const tStart = performance.now();
    while (attempt < maxRetries && !result) {
      attempt++; setAttempt(targetSel, attempt, maxRetries);
      logStatus(targetSel, `Submitting to NanoBanana (attempt ${attempt}/${maxRetries})…`, { withTime:false });
      try {
        const { task_id } = await FluxKontext.startNanoProcess(halfToSend, refs, promptText || '');
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
    // If result is a URL (not data:), use it directly for fast display
    // Browser will handle async download, avoiding the 80s delay from downscaleDataURL
    let previewUrl = result.imageBase64;
    if (!result.imageBase64.startsWith('data:')) {
      // It's a URL - use it directly
      previewUrl = result.imageBase64;
    } else {
      // It's base64 data - downscale it
      try { previewUrl = await downscaleDataURL(result.imageBase64, cw, ch, 'image/jpeg', 0.9); } catch {}
    }
    stopTimer(targetSel, 'Done');
    setCanvasImage(targetSel, previewUrl);
    try { const old = panel2.querySelector('.dl-btn'); if (old) old.remove(); const btn = document.createElement('button'); btn.type='button'; btn.className='dl-btn'; btn.title='Download original'; const icon=document.createElement('img'); icon.src=DOWNLOAD_ICON; icon.alt='download'; btn.appendChild(icon); btn.onclick=()=>{ const a=document.createElement('a'); a.href=result.imageBase64; const ts=new Date().toISOString().replace(/[:.]/g,'-'); a.download=`refined-${ts}.png`; document.body.appendChild(a); a.click(); a.remove(); }; panel2.appendChild(btn);} catch {}
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


