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
  const getStep1Btn = $('#get-step1-image');
  const getStep2Btn = $('#get-step2-image');

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
  function showLoading(message = 'Processing...', duration = 40) {
    canvas3.innerHTML = `
      <div class="placeholder" style="padding:20px">
        <div class="icon" style="font-size:48px;margin-bottom:10px">⏳</div>
        <div class="title" style="margin-bottom:8px">${message}</div>
        <div class="desc" style="margin-bottom:16px">Please wait while we upscale your image</div>
        <div style="width:80%;max-width:300px;height:8px;background:rgba(255,255,255,.08);border-radius:4px;margin:16px auto 0;overflow:hidden">
          <div class="progress-bar-fill" style="width:0%;height:100%;background:linear-gradient(90deg,#E4C07A,#C4A05A);border-radius:4px;transition:width 0.3s ease"></div>
        </div>
      </div>
    `;

    // Start progress animation
    const fillEl = canvas3.querySelector('.progress-bar-fill');
    if (fillEl) {
      startProgressBar(fillEl, duration);
    }
  }

  function startProgressBar(fillEl, durationSeconds) {
    if (!fillEl) return;

    const startTime = Date.now();
    const updateInterval = 100; // Update every 100ms

    const update = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min((elapsed / durationSeconds) * 100, 99); // Cap at 99%
      fillEl.style.width = `${progress}%`;

      if (progress < 99) {
        setTimeout(update, updateInterval);
      }
    };

    update();
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

    // 添加下载按钮 - 使用fetch确保真正下载而不是打开新窗口
    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'dl-btn';
    downloadBtn.title = 'Download';
    downloadBtn.style.cssText = '';

    const icon = document.createElement('img');
    icon.src = DOWNLOAD_ICON;
    icon.alt = 'Download';
    downloadBtn.appendChild(icon);

    downloadBtn.onclick = async () => {
      try {
        // Fetch image as blob to bypass CORS download restrictions
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Trigger download
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `upscaled-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Cleanup blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } catch (error) {
        console.error('[step3] Download failed:', error);
        alert('Download failed. Please try again.');
      }
    };

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

  // 更新按钮状态
  function updateGetImageButtons() {
    if (getStep1Btn) {
      const hasStep1 = window.lastFinalImageBase64;
      getStep1Btn.disabled = !hasStep1;
      console.log('[step3] Step1 button:', hasStep1 ? 'enabled' : 'disabled');
    }
    if (getStep2Btn) {
      const hasStep2 = window.lastStep2ImageBase64;
      getStep2Btn.disabled = !hasStep2;
      console.log('[step3] Step2 button:', hasStep2 ? 'enabled' : 'disabled');
    }
  }

  // 从base64或URL加载图片到uploader
  async function loadImageToUploader(imageSource, sourceName) {
    try {
      console.log('[step3] Loading image from', sourceName);

      // 如果已有上传的文件URL，先释放
      if (uploadedFileUrl) {
        URL.revokeObjectURL(uploadedFileUrl);
        uploadedFileUrl = null;
      }

      // 将图片转换为File对象
      let blob;
      if (imageSource.startsWith('data:')) {
        // data URL
        const response = await fetch(imageSource);
        blob = await response.blob();
      } else if (imageSource.startsWith('http')) {
        // HTTP URL
        const response = await fetch(imageSource);
        blob = await response.blob();
      } else {
        throw new Error('Invalid image source');
      }

      // 创建File对象
      const file = new File([blob], `${sourceName}-image.png`, { type: 'image/png' });
      uploadedFile = file;

      // 显示预览
      uploadedFileUrl = URL.createObjectURL(file);
      preview.src = uploadedFileUrl;
      preview.hidden = false;
      dropArea.style.display = 'none';

      // 启用按钮
      upscaleBtn.disabled = false;

      console.log('[step3] Image loaded from', sourceName);
    } catch (error) {
      console.error('[step3] Error loading image:', error);
      alert(`Failed to load image from ${sourceName}`);
    }
  }

  // 自动加载最新的图片（优先step2，其次step1）
  function autoLoadLatestImage() {
    // 优先加载step2的图片
    if (window.lastStep2ImageBase64) {
      console.log('[step3] Auto-loading image from step2');
      loadImageToUploader(window.lastStep2ImageBase64, 'step2');
    } else if (window.lastFinalImageBase64) {
      console.log('[step3] Auto-loading image from step1');
      loadImageToUploader(window.lastFinalImageBase64, 'step1');
    } else {
      console.log('[step3] No images available for auto-load');
    }
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

  // Get image from step1 button
  if (getStep1Btn) {
    getStep1Btn.addEventListener('click', () => {
      if (window.lastFinalImageBase64) {
        loadImageToUploader(window.lastFinalImageBase64, 'step1');
      }
    });
    console.log('[step3] Get Step1 button listener attached');
  }

  // Get image from step2 button
  if (getStep2Btn) {
    getStep2Btn.addEventListener('click', () => {
      if (window.lastStep2ImageBase64) {
        loadImageToUploader(window.lastStep2ImageBase64, 'step2');
      }
    });
    console.log('[step3] Get Step2 button listener attached');
  }

  // 初始化
  upscaleBtn.disabled = true;
  showPlaceholder();

  // 更新按钮状态
  updateGetImageButtons();

  // 自动加载最新图片
  autoLoadLatestImage();

  console.log('[step3] Upscale module initialized successfully');
  console.log('[step3] Elements:', {
    uploader: !!uploader,
    fileInput: !!fileInput,
    upscaleBtn: !!upscaleBtn,
    canvas3: !!canvas3,
    dropArea: !!dropArea,
    preview: !!preview,
    getStep1Btn: !!getStep1Btn,
    getStep2Btn: !!getStep2Btn
  });

  // 将更新函数暴露到全局，以便在step1/step2完成时调用
  window.updateStep3Buttons = updateGetImageButtons;
})();
