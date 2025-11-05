// Step 3: Upscale to High Resolution
import { FluxKontext } from './sdk/apiClient.js';

const DOWNLOAD_ICON = new URL('./assets/download.svg', import.meta.url).href;

(function initUpscale() {
  const $ = (s, ctx = document) => ctx.querySelector(s);

  // DOM元素
  const uploader = $('[data-role="upscale"]');
  const fileInput = uploader?.querySelector('.file-input');
  const dropArea = uploader?.querySelector('.drop-area');
  const preview = uploader?.querySelector('.preview');
  const upscaleBtn = $('#upscale-generate');
  const canvas3 = $('#canvas3');

  // 状态
  let uploadedFile = null;
  let uploadedFileUrl = null;

  if (!uploader || !fileInput || !upscaleBtn || !canvas3) {
    console.warn('[step3] Required elements not found');
    return;
  }

  // 获取API基础URL
  function getApiBase() {
    try {
      // 优先使用 FluxKontext 的配置
      const baseUrl = FluxKontext.getBaseUrl?.();
      if (baseUrl) return baseUrl;

      // 否则尝试从 localStorage 获取
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('API_HOST');
        if (stored) return stored;
      }

      // 最后检查环境变量
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        const envUrl = import.meta.env.VITE_API_HOST ||
                      import.meta.env.VITE_BACKEND_BASE_URL ||
                      import.meta.env.VITE_BASE_URL;
        if (envUrl) return envUrl;
      }

      // 默认值
      return 'http://127.0.0.1:9090';
    } catch (e) {
      console.error('[step3] Error getting API base:', e);
      return 'http://127.0.0.1:9090';
    }
  }

  // 显示placeholder
  function showPlaceholder(message = 'Ready for upscaling') {
    canvas3.innerHTML = `
      <div class="placeholder">
        <div class="icon">✨</div>
        <div class="title">${message}</div>
        <div class="desc">Upload image and enhance to high resolution</div>
      </div>
    `;
  }

  // 显示加载状态
  function showLoading(message = 'Processing...') {
    canvas3.innerHTML = `
      <div class="placeholder">
        <div class="icon">⏳</div>
        <div class="title">${message}</div>
        <div class="desc">Please wait while we upscale your image</div>
      </div>
    `;
  }

  // 显示结果图片 (复刻 step2 的居中和自适应逻辑)
  function showResult(imageUrl) {
    console.log('[step3] Showing result image:', imageUrl.substring(0, 100));

    canvas3.innerHTML = '';
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Upscaled result';

    // 设置图片样式：居中、自适应、不裁剪 (与 step2 一致)
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    img.style.objectPosition = 'center';

    // 图片加载后调整尺寸以保持完整显示
    img.onload = () => {
      console.log('[step3] Image loaded:', {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(3)
      });

      const panelWidth = canvas3.clientWidth || canvas3.offsetWidth;
      const panelHeight = canvas3.clientHeight || canvas3.offsetHeight;

      if (panelWidth && panelHeight && img.naturalWidth && img.naturalHeight) {
        const scale = Math.min(panelWidth / img.naturalWidth, panelHeight / img.naturalHeight, 1);
        img.style.width = `${Math.round(img.naturalWidth * scale)}px`;
        img.style.height = `${Math.round(img.naturalHeight * scale)}px`;
      } else {
        img.style.width = 'auto';
        img.style.height = 'auto';
      }
    };

    canvas3.appendChild(img);

    // 添加下载按钮
    const downloadBtn = document.createElement('a');
    downloadBtn.href = imageUrl;
    downloadBtn.download = `upscaled-${Date.now()}.png`;
    downloadBtn.className = 'download-btn';
    downloadBtn.title = 'Download';
    downloadBtn.style.cssText = 'position:absolute;bottom:12px;right:12px;';

    const icon = document.createElement('img');
    icon.src = DOWNLOAD_ICON;
    icon.alt = 'Download';
    downloadBtn.appendChild(icon);

    canvas3.appendChild(downloadBtn);
  }

  // 显示错误
  function showError(message) {
    canvas3.innerHTML = `
      <div class="placeholder">
        <div class="icon">❌</div>
        <div class="title">Error</div>
        <div class="desc">${message}</div>
      </div>
    `;
  }

  // 处理文件选择
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型和大小
    if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) {
      alert('Please upload JPG, PNG, or WebP image');
      fileInput.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      fileInput.value = '';
      return;
    }

    // 保存文件
    uploadedFile = file;

    // 显示预览
    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    uploadedFileUrl = URL.createObjectURL(file);

    preview.src = uploadedFileUrl;
    preview.hidden = false;
    dropArea.style.display = 'none';

    // 启用按钮
    upscaleBtn.disabled = false;

    console.log('[step3] File selected:', file.name);
  }

  // 上传并启动upscale任务
  async function startUpscale() {
    if (!uploadedFile) {
      alert('Please upload an image first');
      return;
    }

    upscaleBtn.disabled = true;
    upscaleBtn.textContent = 'Upscaling...';

    try {
      showLoading('Uploading and processing...');

      const formData = new FormData();
      formData.append('image', uploadedFile);
      // Don't send prompt - let backend use UPSCALE_PROMPT environment variable
      // formData.append('prompt', 'Upscale this image to high resolution while preserving all details and quality.');

      const apiBase = getApiBase();
      console.log('[step3] Sending request to:', `${apiBase}/upscale/process_async`);

      // 调用后端API
      const response = await fetch(`${apiBase}/upscale/process_async`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json();
      const taskId = data.task_id;

      if (!taskId) {
        throw new Error('No task ID returned');
      }

      console.log('[step3] Task created:', taskId);
      showLoading('Upscaling in progress...');

      // 轮询结果
      await pollResult(taskId);

    } catch (error) {
      console.error('[step3] Error:', error);
      showError(error.message || 'Failed to upscale image');
      upscaleBtn.disabled = false;
      upscaleBtn.textContent = 'Upscale Image';
    }
  }

  // 轮询任务结果
  async function pollResult(taskId) {
    const apiBase = getApiBase();
    const maxAttempts = 120; // 最多轮询120次 (10分钟)
    const interval = 5000; // 每5秒轮询一次

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));

      try {
        const response = await fetch(`${apiBase}/upscale/result?task_id=${taskId}`);

        if (!response.ok) {
          throw new Error(`Poll failed: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[step3] Poll ${i + 1}:`, data.status, data.stage || '');

        if (data.status === 'done') {
          // 成功
          const resultUrl = data.result_url;
          if (!resultUrl) {
            throw new Error('No result URL in response');
          }

          // 构造完整URL
          const fullUrl = resultUrl.startsWith('http')
            ? resultUrl
            : `${apiBase}${resultUrl}`;

          console.log('[step3] Success! Result URL:', fullUrl);
          showResult(fullUrl);

          upscaleBtn.disabled = false;
          upscaleBtn.textContent = 'Upscale Image';
          return;
        } else if (data.status === 'error') {
          // 失败
          throw new Error(data.error || 'Upscale failed');
        }

        // 继续轮询（status === 'pending' 或 'running'）
        const stage = data.stage || 'processing';
        showLoading(`${stage.replace(/_/g, ' ')}...`);

      } catch (error) {
        console.error(`[step3] Poll error:`, error);
        showError(error.message || 'Failed to check status');
        upscaleBtn.disabled = false;
        upscaleBtn.textContent = 'Upscale Image';
        return;
      }
    }

    // 超时
    showError('Upscale timed out. Please try again.');
    upscaleBtn.disabled = false;
    upscaleBtn.textContent = 'Upscale Image';
  }

  // 绑定事件
  console.log('[step3] Binding events...');

  if (fileInput) {
    fileInput.addEventListener('change', handleFileChange);
    console.log('[step3] File input listener attached');
  } else {
    console.error('[step3] File input not found!');
  }

  if (upscaleBtn) {
    upscaleBtn.addEventListener('click', (e) => {
      console.log('[step3] Button clicked!', { disabled: upscaleBtn.disabled, hasFile: !!uploadedFile });
      startUpscale();
    });
    console.log('[step3] Button listener attached');
  } else {
    console.error('[step3] Upscale button not found!');
  }

  // 拖放支持（可选）
  if (dropArea) {
    dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropArea.style.borderColor = '#ff5e66';
    });

    dropArea.addEventListener('dragleave', () => {
      dropArea.style.borderColor = '';
    });

    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dropArea.style.borderColor = '';

      const file = e.dataTransfer?.files?.[0];
      if (file) {
        fileInput.files = e.dataTransfer.files;
        handleFileChange({ target: fileInput });
      }
    });
    console.log('[step3] Drag & drop listeners attached');
  }

  // 初始化
  upscaleBtn.disabled = true;
  showPlaceholder();

  console.log('[step3] Upscale module initialized successfully');
  console.log('[step3] Elements:', {
    uploader: !!uploader,
    fileInput: !!fileInput,
    upscaleBtn: !!upscaleBtn,
    canvas3: !!canvas3,
    dropArea: !!dropArea,
    preview: !!preview
  });
})();
