// Showcase Image Editor
// This module handles drag-and-drop image uploads and saving for showcase images

import { SHOWCASE_CONFIG } from './showcase-config.js';

class ShowcaseEditor {
  constructor() {
    this.uploadedImages = new Map(); // Track uploaded images per card
    this.STORAGE_KEY = 'showcase_images'; // localStorage key
    this.init();
  }

  init() {
    // Set edit mode on body element
    document.body.setAttribute('data-edit-mode', SHOWCASE_CONFIG.EDIT_MODE);

    if (!SHOWCASE_CONFIG.EDIT_MODE) {
      console.log('Showcase edit mode is disabled');
      return;
    }

    this.restoreImagesFromStorage(); // Restore saved images on page load
    this.setupImageUploaders();

    // Only setup save buttons if enabled in config
    if (SHOWCASE_CONFIG.SHOW_SAVE_BUTTON) {
      this.setupSaveButtons();
    } else {
      this.hideSaveButtons();
    }

    console.log('Showcase editor initialized');
  }

  // Hide all save buttons
  hideSaveButtons() {
    const saveButtons = document.querySelectorAll('.showcase-save-btn');
    saveButtons.forEach(btn => {
      btn.style.display = 'none';
    });
    console.log('Save buttons hidden (SHOW_SAVE_BUTTON = false)');
  }

  // Restore images from localStorage
  restoreImagesFromStorage() {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      console.log('[Restore] Checking localStorage...', savedData ? 'Found data' : 'No data');

      if (!savedData) {
        console.log('[Restore] No saved images found');
        return;
      }

      const parsedData = JSON.parse(savedData);
      console.log('[Restore] Parsed data:', parsedData);

      let restoredCount = 0;

      Object.entries(parsedData).forEach(([showcaseId, images]) => {
        this.uploadedImages.set(showcaseId, {});

        Object.entries(images).forEach(([imgIndex, imageData]) => {
          // Find the corresponding image element
          const imgElement = document.querySelector(
            `.showcase-card[data-showcase-id="${showcaseId}"] .editable-img[data-img-index="${imgIndex}"]`
          );

          if (imgElement && imageData && imageData.data) {
            // Restore the background image
            imgElement.style.backgroundImage = `url(${imageData.data})`;
            imgElement.classList.add('has-image');

            // Store in memory
            this.uploadedImages.get(showcaseId)[imgIndex] = imageData;
            restoredCount++;
            console.log(`[Restore] Restored ${showcaseId} img-${imgIndex}`);
          } else {
            console.warn(`[Restore] Failed to restore ${showcaseId} img-${imgIndex}`, imgElement ? 'Element found' : 'Element not found');
          }
        });
      });

      if (restoredCount > 0) {
        console.log(`[Restore] Successfully restored ${restoredCount} images`);
        this.showNotification(`已恢复 ${restoredCount} 张图片`, 'success');
      }
    } catch (error) {
      console.error('[Restore] Failed to restore images:', error);
      this.showNotification('恢复图片失败', 'error');
    }
  }

  // Save images to localStorage
  saveToLocalStorage() {
    try {
      const dataToSave = {};
      let totalImages = 0;

      this.uploadedImages.forEach((images, showcaseId) => {
        dataToSave[showcaseId] = images;
        totalImages += Object.keys(images).length;
      });

      const jsonData = JSON.stringify(dataToSave);
      localStorage.setItem(this.STORAGE_KEY, jsonData);

      console.log(`[Save] Saved ${totalImages} images to localStorage`);
      console.log(`[Save] Data size: ${(jsonData.length / 1024).toFixed(2)} KB`);
      console.log('[Save] Saved showcases:', Object.keys(dataToSave));
    } catch (error) {
      console.error('[Save] Failed to save to localStorage:', error);
      this.showNotification('保存失败：存储空间可能不足', 'error');
    }
  }

  setupImageUploaders() {
    const editableImages = document.querySelectorAll('.editable-img');

    editableImages.forEach(imgElement => {
      const fileInput = imgElement.querySelector('.showcase-file-input');
      const showcaseCard = imgElement.closest('.showcase-card');
      const showcaseId = showcaseCard.getAttribute('data-showcase-id');
      const imgIndex = imgElement.getAttribute('data-img-index');

      // Initialize map for this showcase if needed
      if (!this.uploadedImages.has(showcaseId)) {
        this.uploadedImages.set(showcaseId, {});
      }

      // Click to upload
      imgElement.addEventListener('click', (e) => {
        if (e.target === imgElement || e.target.classList.contains('upload-overlay') ||
            e.target.classList.contains('upload-icon') || e.target.classList.contains('upload-text')) {
          fileInput.click();
        }
      });

      // File input change
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleFileUpload(file, imgElement, showcaseId, imgIndex);
        }
      });

      // Drag and drop
      imgElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        imgElement.classList.add('dragover');
      });

      imgElement.addEventListener('dragleave', (e) => {
        e.preventDefault();
        imgElement.classList.remove('dragover');
      });

      imgElement.addEventListener('drop', (e) => {
        e.preventDefault();
        imgElement.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          this.handleFileUpload(file, imgElement, showcaseId, imgIndex);
        } else {
          this.showNotification('Please drop an image file', 'error');
        }
      });
    });
  }

  handleFileUpload(file, imgElement, showcaseId, imgIndex) {
    // Validate file type
    if (!SHOWCASE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      this.showNotification('Invalid file type. Please use JPEG, PNG, or WebP', 'error');
      return;
    }

    // Validate file size
    if (file.size > SHOWCASE_CONFIG.MAX_FILE_SIZE) {
      this.showNotification(`File too large. Max size is ${SHOWCASE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`, 'error');
      return;
    }

    // Read and display the image
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;

      // Update the background image
      imgElement.style.backgroundImage = `url(${imageData})`;
      imgElement.classList.add('has-image');

      // Store the uploaded image data
      const showcaseImages = this.uploadedImages.get(showcaseId);
      showcaseImages[imgIndex] = {
        file: file,
        data: imageData,
        name: file.name
      };

      this.showNotification(`图片已上传: ${file.name}`, 'success');

      // Auto-save to localStorage
      this.saveToLocalStorage();

      // Enable the save button only if enabled in config
      if (SHOWCASE_CONFIG.SHOW_SAVE_BUTTON) {
        const saveBtn = document.querySelector(`.showcase-save-btn[data-showcase-id="${showcaseId}"]`);
        if (saveBtn) {
          saveBtn.style.opacity = '1';
          saveBtn.disabled = false;
        }
      }
    };

    reader.readAsDataURL(file);
  }

  setupSaveButtons() {
    const saveButtons = document.querySelectorAll('.showcase-save-btn');

    saveButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const showcaseId = btn.getAttribute('data-showcase-id');
        this.saveShowcaseImages(showcaseId);
      });
    });
  }

  saveShowcaseImages(showcaseId) {
    const showcaseImages = this.uploadedImages.get(showcaseId);

    if (!showcaseImages || Object.keys(showcaseImages).length === 0) {
      this.showNotification('没有图片需要导出', 'warning');
      return;
    }

    // Download all images with proper naming
    console.log(`导出图片 ${showcaseId}:`, showcaseImages);

    const imageCount = Object.keys(showcaseImages).length;
    let downloadedCount = 0;

    // Download each image with a small delay to prevent browser blocking
    Object.entries(showcaseImages).forEach(([index, imageData], i) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = imageData.data;
        link.download = `${showcaseId}-img-${parseInt(index) + 1}.${this.getFileExtension(imageData.name)}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        downloadedCount++;
        if (downloadedCount === imageCount) {
          this.showNotification(`已导出 ${imageCount} 张图片`, 'success');
          this.showSaveInstructions(showcaseId, showcaseImages);
        }
      }, i * 300); // 300ms delay between downloads
    });
  }

  showSaveInstructions(showcaseId, showcaseImages) {
    const fileList = Object.entries(showcaseImages).map(([index, img]) =>
      `  - ${showcaseId}-img-${parseInt(index) + 1}.${this.getFileExtension(img.name)}`
    ).join('\n');

    const instructions = `
✅ 已导出 ${showcaseId} 的图片！

📋 永久保存步骤：
1. 在"下载"文件夹找到导出的图片
2. 移动到项目文件夹：${SHOWCASE_CONFIG.SAVE_DIRECTORY}
3. 更新 CSS 或 HTML 引用这些图片
4. 提交到 GitHub 并推送
5. Vercel 会自动部署，所有用户就能看到了！

📦 已导出的文件：
${fileList}

💡 提示：刷新页面后图片会自动恢复（保存在浏览器 localStorage）
    `;

    console.log(instructions);
    alert(instructions);
  }

  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  showNotification(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `showcase-toast showcase-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${type === 'error' ? '#dc2626' : type === 'warning' ? '#f59e0b' : '#10b981'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize the showcase editor
new ShowcaseEditor();
