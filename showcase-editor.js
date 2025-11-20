// Showcase Image Editor
// This module handles drag-and-drop image uploads and saving for showcase images

import { SHOWCASE_CONFIG } from './showcase-config.js';

class ShowcaseEditor {
  constructor() {
    this.uploadedImages = new Map(); // Track uploaded images per card
    this.init();
  }

  init() {
    // Set edit mode on body element
    document.body.setAttribute('data-edit-mode', SHOWCASE_CONFIG.EDIT_MODE);

    if (!SHOWCASE_CONFIG.EDIT_MODE) {
      console.log('Showcase edit mode is disabled');
      return;
    }

    this.setupImageUploaders();
    this.setupSaveButtons();
    console.log('Showcase editor initialized');
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

      this.showNotification(`Image uploaded: ${file.name}`, 'success');

      // Enable the save button for this showcase
      const saveBtn = document.querySelector(`.showcase-save-btn[data-showcase-id="${showcaseId}"]`);
      if (saveBtn) {
        saveBtn.style.opacity = '1';
        saveBtn.disabled = false;
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
      this.showNotification('No images to save', 'warning');
      return;
    }

    // In a real implementation, you would send these to a server
    // For now, we'll download them locally
    console.log(`Saving images for ${showcaseId}:`, showcaseImages);

    // Download each image
    Object.entries(showcaseImages).forEach(([index, imageData]) => {
      const link = document.createElement('a');
      link.href = imageData.data;
      link.download = `${showcaseId}-img-${parseInt(index) + 1}.${this.getFileExtension(imageData.name)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    this.showNotification(`Saved ${Object.keys(showcaseImages).length} images for ${showcaseId}`, 'success');

    // Show instructions for manual placement
    this.showSaveInstructions(showcaseId, showcaseImages);
  }

  showSaveInstructions(showcaseId, showcaseImages) {
    const instructions = `
Images saved for ${showcaseId}!

Next steps:
1. Find the downloaded images in your Downloads folder
2. Move them to: ${SHOWCASE_CONFIG.SAVE_DIRECTORY}
3. Rename them to match your naming convention
4. Update the CSS background-image for each .showcase-img

The images are saved as:
${Object.entries(showcaseImages).map(([index, img]) =>
  `  - ${showcaseId}-img-${parseInt(index) + 1}.${this.getFileExtension(img.name)}`
).join('\n')}
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
