// Showcase Image Editor
// This module handles drag-and-drop image uploads and saving for showcase images
// Uses IndexedDB for storage to bypass LocalStorage 5MB limit

import { SHOWCASE_CONFIG } from './showcase-config.js';

// Simple IndexedDB wrapper
const DB_NAME = 'DressOnShowcaseDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

class ImageDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async set(key, value) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

class ShowcaseEditor {
  constructor() {
    this.uploadedImages = new Map(); // Track uploaded images per card
    this.STORAGE_KEY = 'showcase_images'; // Key for DB
    this.db = new ImageDB();
    this.init();
  }

  async init() {
    // Set edit mode on body element
    document.body.setAttribute('data-edit-mode', SHOWCASE_CONFIG.EDIT_MODE);

    if (!SHOWCASE_CONFIG.EDIT_MODE) {
      console.log('Showcase edit mode is disabled');
      return;
    }

    try {
      await this.db.init();
      console.log('IndexedDB initialized');
      await this.restoreImagesFromStorage(); // Restore saved images on page load
    } catch (e) {
      console.error('Failed to init DB:', e);
      this.showNotification('数据库初始化失败', 'error');
    }

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

  // Restore images from IndexedDB
  async restoreImagesFromStorage() {
    try {
      const savedData = await this.db.get(this.STORAGE_KEY);
      console.log('[Restore] Checking DB...', savedData ? 'Found data' : 'No data');

      if (!savedData) {
        console.log('[Restore] No saved images found');
        return;
      }

      // savedData is already an object, no need to JSON.parse if we stored it directly
      // But to keep compatibility if we switch logic, let's assume it matches our structure
      const parsedData = savedData; 
      
      let restoredCount = 0;

      Object.entries(parsedData).forEach(([showcaseId, images]) => {
        this.uploadedImages.set(showcaseId, {});

        Object.entries(images).forEach(([imgIndex, imageData]) => {
          // Find the corresponding image element
          const imgElement = document.querySelector(
            `.showcase-card[data-showcase-id="${showcaseId}"] .editable-img[data-img-index="${imgIndex}"]`
          );

          if (imgElement && imageData && imageData.data) {
            // Restore the background image (fallback)
            imgElement.style.backgroundImage = `url(${imageData.data})`;
            imgElement.classList.add('has-image');

            // 1. REMOVE OVERLAY COMPLETELY (Physical Removal)
            const overlay = imgElement.querySelector('.upload-overlay');
            if (overlay) {
              overlay.remove(); // Delete it from DOM
            }

            // 2. Insert Real <img> tag for right-click support
            let realImg = imgElement.querySelector('.real-showcase-img');
            if (!realImg) {
              realImg = document.createElement('img');
              realImg.className = 'real-showcase-img';
              // Append as LAST child
              imgElement.appendChild(realImg);
            }
            realImg.src = imageData.data;
            realImg.alt = `${showcaseId}-img-${imgIndex}`;
            
            // Remove any legacy mini buttons
            const miniBtn = imgElement.querySelector('.mini-dl-btn');
            if(miniBtn) miniBtn.remove();

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

  // Save images to IndexedDB
  async saveToLocalStorage() {
    try {
      const dataToSave = {};
      let totalImages = 0;

      this.uploadedImages.forEach((images, showcaseId) => {
        dataToSave[showcaseId] = images;
        totalImages += Object.keys(images).length;
      });

      // Store the object directly
      await this.db.set(this.STORAGE_KEY, dataToSave);

      console.log(`[Save] Saved ${totalImages} images to IndexedDB`);
      console.log('[Save] Saved showcases:', Object.keys(dataToSave));
    } catch (error) {
      console.error('[Save] Failed to save to DB:', error);
      this.showNotification('保存失败：数据库错误', 'error');
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

  async resizeImage(file, targetPixels = 1024 * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const width = img.width;
          const height = img.height;
          const currentPixels = width * height;
          
          let newWidth = width;
          let newHeight = height;

          // Calculate new dimensions if larger than target
          if (currentPixels > targetPixels) {
            const ratio = Math.sqrt(targetPixels / currentPixels);
            newWidth = Math.floor(width * ratio);
            newHeight = Math.floor(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = newWidth;
          canvas.height = newHeight;
          
          const ctx = canvas.getContext('2d');
          // High quality scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          // Compress to jpeg with 0.75 quality to save space
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          
          // Also create blob for potential upload
          canvas.toBlob((blob) => {
            resolve({
              dataUrl,
              blob,
              width: newWidth,
              height: newHeight
            });
          }, 'image/jpeg', 0.75);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async handleFileUpload(file, imgElement, showcaseId, imgIndex) {
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

    try {
      this.showNotification('正在压缩图片...', 'info');
      
      // Resize image to match 1024x1024 pixel count
      const processed = await this.resizeImage(file);
      
      // Update the background image (keep for fallback)
      imgElement.style.backgroundImage = `url(${processed.dataUrl})`;
      imgElement.classList.add('has-image');
      
      // 1. REMOVE OVERLAY COMPLETELY (Physical Removal)
      const overlay = imgElement.querySelector('.upload-overlay');
      if (overlay) {
        overlay.remove(); // Delete it from DOM
      }

      // 2. Insert Real <img> tag for right-click support
      let realImg = imgElement.querySelector('.real-showcase-img');
      if (!realImg) {
        realImg = document.createElement('img');
        realImg.className = 'real-showcase-img';
        // Append as LAST child
        imgElement.appendChild(realImg);
      }
      realImg.src = processed.dataUrl;
      realImg.alt = `${showcaseId}-img-${imgIndex}`;
      realImg.title = `Right click > Save Image As...`;

      // Remove mini download button if it exists
      const miniBtn = imgElement.querySelector('.mini-dl-btn');
      if(miniBtn) miniBtn.remove();

      // Store the uploaded image data
      const showcaseImages = this.uploadedImages.get(showcaseId);

      // Semantic naming: Character & Pose-N, Outfit Reference-N, Final Result-N
      const CARD_INDEX = {
        'editorial-skyline': 1,
        'garden-harmony': 2,
        'island-breeze': 3,
        'arctic-aura': 4
      };
      const ROLE_NAMES = ['Character & Pose', 'Outfit Reference', 'Final Result'];
      const cardIndex = CARD_INDEX[showcaseId] || 0;
      const roleName = ROLE_NAMES[Number(imgIndex)] || 'Image';
      const standardizedName = `${roleName}-${cardIndex}.jpg`;
      
      showcaseImages[imgIndex] = {
        file: processed.blob, // Store processed blob instead of original file
        data: processed.dataUrl,
        name: standardizedName, // Force standardized name
        width: processed.width,
        height: processed.height
      };

      this.showNotification(`图片已处理 (${processed.width}x${processed.height})`, 'success');

      // Auto-save to IndexedDB
      await this.saveToLocalStorage();

      // Enable the save button only if enabled in config
      if (SHOWCASE_CONFIG.SHOW_SAVE_BUTTON) {
        const saveBtn = document.querySelector(`.showcase-save-btn[data-showcase-id="${showcaseId}"]`);
        if (saveBtn) {
          saveBtn.style.opacity = '1';
          saveBtn.disabled = false;
        }
      }
    } catch (error) {
      console.error('Image processing failed:', error);
      this.showNotification('图片处理失败', 'error');
    }
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
        // Use the standardized name we set during upload
        link.download = imageData.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        downloadedCount++;
        if (downloadedCount === imageCount) {
          this.showNotification(`已导出 ${imageCount} 张标准化命名图片`, 'success');
          this.showSaveInstructions(showcaseId, showcaseImages);
        }
      }, i * 300); // 300ms delay between downloads
    });
  }

  showSaveInstructions(showcaseId, showcaseImages) {
    const fileList = Object.entries(showcaseImages).map(([, img]) =>
      `  - ${img.name}`
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

💡 提示：刷新页面后图片会自动恢复（保存在浏览器 IndexedDB）
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
