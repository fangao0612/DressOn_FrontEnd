// Minimal SDK for communicating with Flux-Kontext backend from any frontend
// Usage:
// import { FluxKontext } from './sdk/apiClient.js';
// FluxKontext.setBaseUrl('https://api.yourdomain.com');
// const { task_id } = await FluxKontext.startNanoProcess(imageBlob, refFiles, prompt);
// const result = await FluxKontext.pollNanoResult(task_id);

const DEFAULTS = {
  baseUrl: typeof window !== 'undefined' ? (window.FLUX_KONTEXT_BASE_URL || 'http://127.0.0.1:9090') : 'http://127.0.0.1:9090',
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function blobFromFile(file) {
  if (file instanceof Blob) return file;
  if (file && typeof file.arrayBuffer === 'function') return file;
  throw new Error('Expected Blob/File');
}

function buildForm(data) {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach(v => form.append(key, v));
    } else {
      form.append(key, value);
    }
  });
  return form;
}

async function httpPost(path, form) {
  const url = `${DEFAULTS.baseUrl}${path}`;
  const resp = await fetch(url, { method: 'POST', body: form });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`POST ${path} failed: ${resp.status} ${text}`);
  }
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await resp.json();
  return await resp.text();
}

async function httpGet(path) {
  const url = `${DEFAULTS.baseUrl}${path}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`GET ${path} failed: ${resp.status} ${text}`);
  }
  return await resp.json();
}

export const FluxKontext = {
  setBaseUrl(url) {
    assert(typeof url === 'string' && url.length > 0, 'Invalid baseUrl');
    DEFAULTS.baseUrl = url.replace(/\/$/, '');
  },

  async runFlux(mainImageFile, fluxPrompt, options = {}) {
    assert(mainImageFile, 'mainImageFile is required');
    const form = buildForm({
      main_image: await blobFromFile(mainImageFile),
      flux_prompt: options.flux_prompt ?? fluxPrompt ?? '',
      steps: options.steps ?? 8, // default 8 to match legacy behavior
    });
    if (options.lora_names) {
      form.set('lora_names', (options.lora_names || []).join(','));
    }
    if (options.lora_strengths) {
      form.set('lora_strengths', (options.lora_strengths || []).map(String).join(','));
    }
    return await httpPost('/flux/run', form);
  },

  async refineFlux(imageBlob, opts = {}) {
    assert(imageBlob, 'imageBlob is required');
    const form = buildForm({
      image: await blobFromFile(imageBlob),
      strength: opts.strength ?? 0.85,
      steps: opts.steps ?? 8,
      cfg: opts.cfg ?? 1.0,
      denoise: opts.denoise ?? 0.4,
      prompt_text: opts.prompt_text ?? 'nnps',
      base: opts.base ?? '',
    });
    return await httpPost('/flux/refine', form);
  },

  async startNanoProcess(halfImageBlob, refFilesOrBlobs = [], nanoPrompt = '') {
    assert(halfImageBlob, 'halfImageBlob is required');
    const form = new FormData();
    const half = await blobFromFile(halfImageBlob);
    // align with legacy: explicit filename for half, keep original names for refs
    form.append('half_image', half, 'half.png');
    (refFilesOrBlobs || []).forEach((f, i) => {
      const file = f;
      const name = (file && file.name) ? file.name : `ref_${i + 1}.png`;
      form.append('ref_images', file, name);
    });
    form.append('prompt', nanoPrompt || '');
    return await httpPost('/nano/process_async', form);
  },

  async pollNanoResult(taskId, onProgress, { intervalMs = 3000, timeoutMs = 600000 } = {}) {
    assert(taskId, 'taskId is required');
    const start = Date.now();
    while (true) {
      const j = await httpGet(`/nano/result?task_id=${encodeURIComponent(taskId)}`);
      if (typeof onProgress === 'function') {
        try { onProgress(j); } catch {}
      }
      if (j && (j.imageBase64 || j.status === 'succeeded')) return j;
      if (j && (j.status === 'failed' || j.status === 'error')) {
        const err = new Error(j.error || 'nano process failed');
        if (j.debug !== undefined) err.debug = j.debug;
        throw err;
      }
      if (Date.now() - start > timeoutMs) throw new Error('nano result timeout');
      await new Promise(r => setTimeout(r, intervalMs));
    }
  },

  async resizeImageWithPadding(file, targetWidth, targetHeight, background = '#ffffff') {
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = imgUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
      const dw = Math.round(img.width * scale);
      const dh = Math.round(img.height * scale);
      const dx = Math.floor((targetWidth - dw) / 2);
      const dy = Math.floor((targetHeight - dh) / 2);
      ctx.drawImage(img, dx, dy, dw, dh);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      return blob;
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  },
};

export default FluxKontext;


