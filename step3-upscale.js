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
      return FluxKontext.getBaseUrl?.() || 'http://127.0.0.1:9090';
    } catch {
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

  // 显示结果图片
  function showResult(imageUrl) {
    canvas3.innerHTML = `
      <div class="result-card">
        <img src="${imageUrl}" alt="Upscaled result" />
        <a href="${imageUrl}" download class="download-btn" title="Download">
          <img src="${DOWNLOAD_ICON}" alt="Download" />
        </a>
      </div>
    `;
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
      formData.append('prompt', 'Upscale this image to high resolution while preserving all details and quality.');

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
