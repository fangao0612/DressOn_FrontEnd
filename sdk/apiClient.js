// Minimal SDK for communicating with Flux-Kontext backend from any frontend
// Usage:
// import { FluxKontext } from './sdk/apiClient.js';
// FluxKontext.setBaseUrl('https://api.yourdomain.com');
// const { task_id } = await FluxKontext.startNanoProcess(imageBlob, refFiles, prompt);
// const result = await FluxKontext.pollNanoResult(task_id);

function resolveEnvBaseUrl() {
  // Support both Next.js (process.env.NEXT_PUBLIC_*) and Vite (import.meta.env.VITE_*) styles
  let envUrl;
  if (typeof process !== 'undefined' && process.env) {
    envUrl = process.env.NEXT_PUBLIC_API_HOST
      || process.env.NEXT_PUBLIC_BACKEND_BASE_URL
      || process.env.NEXT_PUBLIC_BASE_URL
      || process.env.API_HOST; // generic fallback
  }
  if (!envUrl) {
    try {
      envUrl = (typeof import.meta !== 'undefined' && import.meta.env && (
        import.meta.env.VITE_API_HOST
        || import.meta.env.VITE_BACKEND_BASE_URL
        || import.meta.env.VITE_BASE_URL
      )) || envUrl;
    } catch (_) {
      // ignore – import.meta might not be defined in all bundlers
    }
  }
  return envUrl;
}

function resolveDefaultBaseUrl() {
  const envUrl = resolveEnvBaseUrl();

  if (typeof window !== 'undefined') {
    const stored = typeof window.localStorage !== 'undefined'
      ? window.localStorage.getItem('API_HOST')
      : undefined;
    const winDefined = window.FLUX_KONTEXT_BASE_URL;

    const candidate = stored || winDefined || envUrl;
    if (candidate) return candidate.replace(/\/$/, '');
  }

  if (envUrl) return envUrl.replace(/\/$/, '');

  // 生产环境防呆：禁止回退到 localhost
  if (import.meta.env.PROD) {
    console.error('[API_HOST] Not configured in production! Set VITE_API_HOST in Vercel.');
    throw new Error('API_HOST not configured. Please set VITE_API_HOST environment variable.');
  }

  return 'http://127.0.0.1:9091';
}

const DEFAULTS = {
  baseUrl: resolveDefaultBaseUrl(),
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

async function httpPost(path, form, retries = 0) {
  const url = `${DEFAULTS.baseUrl}${path}`;
  const MAX_RETRIES = 2;
  const RETRY_DELAYS = [5000, 10000]; // 5s, 10s

  try {
    const resp = await fetch(url, { method: 'POST', body: form, credentials: 'include' });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      const status = resp.status;

      // Retry on cold start errors (404, 502, 503) but not auth errors (401, 403)
      const shouldRetry = (status === 404 || status === 502 || status === 503) && retries < MAX_RETRIES;

      if (shouldRetry) {
        const delay = RETRY_DELAYS[retries];
        console.warn(`[API] ${path} failed with ${status}, retrying in ${delay/1000}s... (${retries + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return httpPost(path, form, retries + 1);
      }

      throw new Error(`POST ${path} failed: ${status} ${text}`);
    }
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return await resp.json();
    return await resp.text();
  } catch (error) {
    // Network errors (fetch failed completely)
    if (error.message && error.message.includes('Failed to fetch') && retries < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retries];
      console.warn(`[API] ${path} network error, retrying in ${delay/1000}s... (${retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return httpPost(path, form, retries + 1);
    }
    throw error;
  }
}

async function httpGet(path) {
  const url = `${DEFAULTS.baseUrl}${path}`;
  const resp = await fetch(url, { credentials: 'include' });
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

  async getMe() {
    return await httpGet('/me');
  },

  async logout() {
    const url = `${DEFAULTS.baseUrl}/auth/logout`;
    const resp = await fetch(url, { method: 'POST', credentials: 'include' });
    if (!resp.ok) throw new Error(`POST /auth/logout failed: ${resp.status}`);
    return await resp.json().catch(()=>({ ok:true }));
  },

  login() {
    window.location.href = `${DEFAULTS.baseUrl}/auth/login`;
  },

  // Stytch 认证方法
  async stytchGoogleLogin() {
    try {
      const response = await httpGet('/stytch/google/url');
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('Failed to get Google OAuth URL');
      }
    } catch (error) {
      console.error('Stytch Google login failed:', error);
      throw error;
    }
  },

  async stytchEmailSend(email) {
    try {
      const response = await fetch(`${DEFAULTS.baseUrl}/stytch/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to send email: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Stytch email send failed:', error);
      throw error;
    }
  },

  async stytchEmailVerify(email, code) {
    try {
      const response = await fetch(`${DEFAULTS.baseUrl}/stytch/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to verify code: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Stytch email verify failed:', error);
      throw error;
    }
  },

  // 独立邮箱验证码系统
  async emailSend(email) {
    try {
      const response = await fetch(`${DEFAULTS.baseUrl}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to send email: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Email send failed:', error);
      throw error;
    }
  },

  async emailVerify(email, code) {
    try {
      const response = await fetch(`${DEFAULTS.baseUrl}/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to verify code: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Email verify failed:', error);
      throw error;
    }
  },

  async stytchLogout() {
    try {
      const response = await fetch(`${DEFAULTS.baseUrl}/stytch/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Stytch logout failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Stytch logout failed:', error);
      throw error;
    }
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

    // Support both URL (string) and Blob/File
    // If it's a URL string (not a data: URL), pass it as half_image_url
    if (typeof halfImageBlob === 'string' && !halfImageBlob.startsWith('data:')) {
      // It's a URL - pass it as half_image_url parameter
      // Backend will fetch it directly (much faster for internal URLs)
      form.append('half_image_url', halfImageBlob);
    } else {
      // It's a Blob/File or data: URL - convert and upload as before
      const half = await blobFromFile(halfImageBlob);
      form.append('half_image', half, 'half.png');
    }

    (refFilesOrBlobs || []).forEach((f, i) => {
      const file = f;
      const name = (file && file.name) ? file.name : `ref_${i + 1}.png`;
      form.append('ref_images', file, name);
    });
    // Send prompt parameter
    // - Step 1 sends empty string '' -> backend uses DEFAULT_KIE_PROMPT
    // - Step 2 sends user input -> backend uses user's custom prompt
    const promptValue = nanoPrompt || '';
    console.log('[API] startNanoProcess - prompt value:', promptValue.length > 0 ? `"${promptValue.slice(0, 100)}${promptValue.length > 100 ? '...' : ''}"` : '(empty - will use DEFAULT_KIE_PROMPT)');
    form.append('prompt', promptValue);
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


