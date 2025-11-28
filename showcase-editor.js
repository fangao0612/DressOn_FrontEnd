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

// Lightbox for image preview - using cloned thumbnail approach
class Lightbox {
  constructor() {
    this.overlay = null;
    this.clonedImg = null;
    this.isOpen = false;
    this.isAnimating = false;
    this.originalRect = null;
    this.originalSrc = null;
    this.init();
  }

  init() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'lightbox-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0px);
      z-index: 9998;
      opacity: 0;
      visibility: hidden;
      transition: background 0.35s ease, backdrop-filter 0.35s ease, opacity 0.35s ease;
      cursor: pointer;
    `;
    document.body.appendChild(this.overlay);

    // Close on overlay click
    this.overlay.addEventListener('click', () => {
      this.close();
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open(imgSrc, sourceElement) {
    if (this.isOpen || this.isAnimating) return;
    this.isAnimating = true;
    this.isOpen = true;

    // Get source element's exact position
    this.originalRect = sourceElement.getBoundingClientRect();
    this.originalSrc = imgSrc;

    // Show overlay with fade
    this.overlay.style.visibility = 'visible';
    this.overlay.style.opacity = '1';
    
    // Create a clone of the image at exact position
    this.clonedImg = document.createElement('img');
    this.clonedImg.src = imgSrc;
    this.clonedImg.style.cssText = `
      position: fixed;
      left: ${this.originalRect.left}px;
      top: ${this.originalRect.top}px;
      width: ${this.originalRect.width}px;
      height: ${this.originalRect.height}px;
      object-fit: cover;
      z-index: 9999;
      border-radius: 4px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: none;
      pointer-events: auto;
    `;
    document.body.appendChild(this.clonedImg);

    // Click on cloned image to close
    this.clonedImg.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // Force reflow
    this.clonedImg.offsetHeight;

    // Animate overlay background
    requestAnimationFrame(() => {
      this.overlay.style.background = 'rgba(0, 0, 0, 0.88)';
      this.overlay.style.backdropFilter = 'blur(12px)';
    });

    // Calculate final centered position
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Wait for image natural dimensions
    const doAnimate = () => {
      const naturalWidth = this.clonedImg.naturalWidth || this.originalRect.width;
      const naturalHeight = this.clonedImg.naturalHeight || this.originalRect.height;
      const aspectRatio = naturalWidth / naturalHeight;

      // Target: 90vh height, maintain aspect ratio
      let finalHeight = viewportHeight * 0.9;
      let finalWidth = finalHeight * aspectRatio;

      // If too wide, constrain by width
      if (finalWidth > viewportWidth * 0.9) {
        finalWidth = viewportWidth * 0.9;
        finalHeight = finalWidth / aspectRatio;
      }

      const finalLeft = (viewportWidth - finalWidth) / 2;
      const finalTop = (viewportHeight - finalHeight) / 2;

      // Enable transition and animate
      this.clonedImg.style.transition = 'all 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
      this.clonedImg.style.left = `${finalLeft}px`;
      this.clonedImg.style.top = `${finalTop}px`;
      this.clonedImg.style.width = `${finalWidth}px`;
      this.clonedImg.style.height = `${finalHeight}px`;
      this.clonedImg.style.objectFit = 'contain';
      this.clonedImg.style.borderRadius = '8px';
      this.clonedImg.style.boxShadow = '0 25px 80px rgba(0,0,0,0.6)';

      setTimeout(() => {
        this.isAnimating = false;
      }, 400);
    };

    if (this.clonedImg.complete && this.clonedImg.naturalWidth) {
      requestAnimationFrame(doAnimate);
    } else {
      this.clonedImg.onload = () => requestAnimationFrame(doAnimate);
      // Fallback if already cached
      setTimeout(() => {
        if (this.isAnimating) requestAnimationFrame(doAnimate);
      }, 50);
    }
  }

  close() {
    if (!this.isOpen || this.isAnimating) return;
    this.isAnimating = true;
    this.isOpen = false;

    // Fade overlay
    this.overlay.style.background = 'rgba(0, 0, 0, 0)';
    this.overlay.style.backdropFilter = 'blur(0px)';

    // Animate image back to original position
    if (this.clonedImg && this.originalRect) {
      this.clonedImg.style.transition = 'all 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
      this.clonedImg.style.left = `${this.originalRect.left}px`;
      this.clonedImg.style.top = `${this.originalRect.top}px`;
      this.clonedImg.style.width = `${this.originalRect.width}px`;
      this.clonedImg.style.height = `${this.originalRect.height}px`;
      this.clonedImg.style.objectFit = 'cover';
      this.clonedImg.style.borderRadius = '4px';
      this.clonedImg.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    }

    // Cleanup after animation
    setTimeout(() => {
      this.overlay.style.visibility = 'hidden';
      this.overlay.style.opacity = '0';
      if (this.clonedImg) {
        this.clonedImg.remove();
        this.clonedImg = null;
      }
      this.isAnimating = false;
    }, 350);
  }
}

// Global lightbox instance
const lightbox = new Lightbox();

class ShowcaseEditor {
  constructor() {
    this.uploadedImages = new Map();
    this.STORAGE_KEY = 'showcase_images';
    this.db = new ImageDB();
    this.init();
  }

  async init() {
    document.body.setAttribute('data-edit-mode', SHOWCASE_CONFIG.EDIT_MODE);

    if (!SHOWCASE_CONFIG.EDIT_MODE) {
      console.log('Showcase edit mode is disabled');
      return;
    }

    try {
      await this.db.init();
      console.log('IndexedDB initialized');
      await this.restoreImagesFromStorage();
    } catch (e) {
      console.error('Failed to init DB:', e);
      this.showNotification('数据库初始化失败', 'error');
    }

    this.setupImageUploaders();
    this.setupGlobalClickHandler(); // Use event delegation

    if (SHOWCASE_CONFIG.SHOW_SAVE_BUTTON) {
      this.setupSaveButtons();
    } else {
      this.hideSaveButtons();
    }

    console.log('Showcase editor initialized');
  }

  // Event delegation for image clicks - more reliable than individual listeners
  setupGlobalClickHandler() {
    document.addEventListener('click', (e) => {
      const img = e.target.closest('.real-showcase-img');
      if (img && img.dataset.imgSrc) {
        e.preventDefault();
        e.stopPropagation();
        lightbox.open(img.dataset.imgSrc, img);
      }
    });
  }

  hideSaveButtons() {
    const saveButtons = document.querySelectorAll('.showcase-save-btn');
    saveButtons.forEach(btn => {
      btn.style.display = 'none';
    });
    console.log('Save buttons hidden (SHOW_SAVE_BUTTON = false)');
  }

  async restoreImagesFromStorage() {
    try {
      const savedData = await this.db.get(this.STORAGE_KEY);
      console.log('[Restore] Checking DB...', savedData ? 'Found data' : 'No data');

      if (savedData) {
        // 1. Restore from DB
        let restoredCount = 0;
        Object.entries(savedData).forEach(([showcaseId, images]) => {
          this.uploadedImages.set(showcaseId, {});
          Object.entries(images).forEach(([imgIndex, imageData]) => {
            const imgElement = document.querySelector(
              `.showcase-card[data-showcase-id="${showcaseId}"] .editable-img[data-img-index="${imgIndex}"]`
            );
            if (imgElement && imageData && imageData.data) {
              this.applyImageToElement(imgElement, imageData.data, imageData.name);
              this.uploadedImages.get(showcaseId)[imgIndex] = imageData;
              restoredCount++;
            }
          });
        });
        if (restoredCount > 0) {
          console.log(`[Restore] Successfully restored ${restoredCount} images from DB`);
          this.showNotification(`已恢复 ${restoredCount} 张图片`, 'success');
          return;
        }
      }

      // 2. If no data in DB, load default assets
      console.log('[Restore] No saved data, loading defaults...');
      await this.loadDefaultImages();

    } catch (error) {
      console.error('[Restore] Failed to restore images:', error);
      this.showNotification('恢复图片失败', 'error');
    }
  }

  async loadDefaultImages() {
    const CARD_MAPPING = {
      'editorial-skyline': 1,
      'garden-harmony': 2,
      'island-breeze': 3,
      'arctic-aura': 4
    };
    const ROLE_NAMES = ['Character & Pose', 'Outfit Reference', 'Final Result'];
    
    let loadedCount = 0;

    for (const [showcaseId, cardIndex] of Object.entries(CARD_MAPPING)) {
      if (!this.uploadedImages.has(showcaseId)) {
        this.uploadedImages.set(showcaseId, {});
      }

      for (let i = 0; i < 3; i++) {
        const roleName = ROLE_NAMES[i];
        const fileName = `${roleName}-${cardIndex}.jpg`;
        // Encode special characters in filename for URL
        const encodedFileName = encodeURIComponent(fileName);
        const imgPath = `/showcase/${encodedFileName}`;
        
        const imgElement = document.querySelector(
          `.showcase-card[data-showcase-id="${showcaseId}"] .editable-img[data-img-index="${i}"]`
        );

        if (imgElement) {
          // Apply directly from asset path
          this.applyImageToElement(imgElement, imgPath, fileName);
          
          // We don't save to DB yet to save space, unless user edits it.
          // Or we could fetch and save:
          // await this.fetchAndSaveDefault(imgPath, showcaseId, i, fileName);
          
          loadedCount++;
        }
      }
    }
    console.log(`[Restore] Loaded ${loadedCount} default images`);
  }

  // Centralized method to apply image to element
  applyImageToElement(imgElement, imgSrc, imgName) {
    // Remove overlay
    const overlay = imgElement.querySelector('.upload-overlay');
    if (overlay) overlay.remove();

    // Remove old elements
    const oldLink = imgElement.querySelector('.download-link');
    if (oldLink) oldLink.remove();
    const oldImg = imgElement.querySelector('.real-showcase-img');
    if (oldImg) oldImg.remove();
    const miniBtn = imgElement.querySelector('.mini-dl-btn');
    if (miniBtn) miniBtn.remove();

    // Create new image element
    const realImg = document.createElement('img');
    realImg.className = 'real-showcase-img';
    realImg.src = imgSrc;
    realImg.alt = imgName || 'Showcase image';
    realImg.dataset.imgSrc = imgSrc; // Store src in data attribute for event delegation
    realImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:5;cursor:pointer;';
    
    // Error handling: if image fails, remove it to show background
    realImg.onerror = () => {
      console.warn(`[Showcase] Failed to load image: ${imgSrc}`);
      realImg.remove();
      // Restore overlay if needed, or just leave background
    };

    imgElement.appendChild(realImg);
    imgElement.classList.add('has-image');
  }

  async saveToLocalStorage() {
    try {
      const dataToSave = {};
      let totalImages = 0;

      this.uploadedImages.forEach((images, showcaseId) => {
        dataToSave[showcaseId] = images;
        totalImages += Object.keys(images).length;
      });

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

      if (!this.uploadedImages.has(showcaseId)) {
        this.uploadedImages.set(showcaseId, {});
      }

      // Click to upload only if no image
      imgElement.addEventListener('click', (e) => {
        // Don't trigger upload if clicking on the real image (it opens lightbox)
        if (e.target.classList.contains('real-showcase-img')) {
          return;
        }
        if (!imgElement.classList.contains('has-image')) {
          fileInput.click();
        }
      });

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

          if (currentPixels > targetPixels) {
            const ratio = Math.sqrt(targetPixels / currentPixels);
            newWidth = Math.floor(width * ratio);
            newHeight = Math.floor(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = newWidth;
          canvas.height = newHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          
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
    if (!SHOWCASE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      this.showNotification('Invalid file type. Please use JPEG, PNG, or WebP', 'error');
      return;
    }

    if (file.size > SHOWCASE_CONFIG.MAX_FILE_SIZE) {
      this.showNotification(`File too large. Max size is ${SHOWCASE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`, 'error');
      return;
    }

    try {
      this.showNotification('正在压缩图片...', 'info');
      
      const processed = await this.resizeImage(file);

      // Semantic naming
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

      // Apply image to element
      this.applyImageToElement(imgElement, processed.dataUrl, standardizedName);

      // Store the uploaded image data
      const showcaseImages = this.uploadedImages.get(showcaseId);
      showcaseImages[imgIndex] = {
        file: processed.blob,
        data: processed.dataUrl,
        name: standardizedName,
        width: processed.width,
        height: processed.height
      };

      this.showNotification(`图片已处理 (${processed.width}x${processed.height})`, 'success');

      await this.saveToLocalStorage();

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

    console.log(`导出图片 ${showcaseId}:`, showcaseImages);

    const imageCount = Object.keys(showcaseImages).length;
    let downloadedCount = 0;

    Object.entries(showcaseImages).forEach(([index, imageData], i) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = imageData.data;
        link.download = imageData.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        downloadedCount++;
        if (downloadedCount === imageCount) {
          this.showNotification(`已导出 ${imageCount} 张标准化命名图片`, 'success');
          this.showSaveInstructions(showcaseId, showcaseImages);
        }
      }, i * 300);
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
