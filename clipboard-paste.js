// Clipboard Paste for Image Uploaders
function initClipboardPaste() {
  console.log('[clipboard-paste] Initializing...');

  // Find all image uploaders
  const uploaders = document.querySelectorAll('.uploader[data-role]');

  if (!uploaders || uploaders.length === 0) {
    console.warn('[clipboard-paste] No uploaders found');
    return;
  }

  console.log(`[clipboard-paste] Found ${uploaders.length} uploader(s)`);

  // Handle paste event for each uploader
  uploaders.forEach((uploader, index) => {
    const role = uploader.getAttribute('data-role');
    const fileInput = uploader.querySelector('.file-input');

    if (!fileInput) {
      console.warn(`[clipboard-paste] No file input found for uploader[${role}]`);
      return;
    }

    console.log(`[clipboard-paste] Setting up uploader[${role}]`);

    // Make uploader focusable and add visual hint
    uploader.setAttribute('tabindex', '0');
    uploader.style.cursor = 'pointer';

    // Handle paste on uploader
    const handlePaste = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      console.log(`[clipboard-paste] Paste event on uploader[${role}]`);

      // Get clipboard data
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) {
        console.warn('[clipboard-paste] No clipboard items found');
        return;
      }

      console.log(`[clipboard-paste] Clipboard items:`, items.length);

      // Find image in clipboard
      let imageFile = null;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`[clipboard-paste] Item ${i}: ${item.type}`);

        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            // Create a proper File object with name
            imageFile = new File([blob], `pasted-image-${Date.now()}.png`, {
              type: blob.type || 'image/png'
            });
            console.log('[clipboard-paste] Image file created:', imageFile.name, imageFile.type, imageFile.size);
            break;
          }
        }
      }

      if (!imageFile) {
        console.warn('[clipboard-paste] No image found in clipboard');
        alert('No image found in clipboard. Please copy an image first.');
        return;
      }

      console.log('[clipboard-paste] Image found:', imageFile.name, imageFile.type);

      // Create a DataTransfer object to simulate file selection
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);

      // Set files to input
      fileInput.files = dataTransfer.files;
      console.log('[clipboard-paste] Files set to input:', fileInput.files.length);

      // Use setTimeout to ensure the change event is processed in the next tick
      // This gives time for all other handlers to be ready
      setTimeout(() => {
        // Trigger change event to notify the upload handlers
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
        console.log(`[clipboard-paste] Change event dispatched for uploader[${role}]`);

        // Also manually trigger the preview update as a fallback
        const file = fileInput.files[0];
        if (file) {
          const preview = uploader.querySelector('.preview');
          const dropArea = uploader.querySelector('.drop-area');

          if (preview && dropArea) {
            const url = URL.createObjectURL(file);
            preview.src = url;
            preview.hidden = false;
            dropArea.style.display = 'none';
            console.log(`[clipboard-paste] Preview updated manually for uploader[${role}]`);
          }
        }
      }, 10);
    };

    // Add paste event listener to uploader
    uploader.addEventListener('paste', handlePaste);

    // Auto-focus on hover for better UX
    uploader.addEventListener('mouseenter', () => {
      uploader.focus();
      console.log(`[clipboard-paste] Auto-focused uploader[${role}] on hover - Ready for Ctrl+V`);
    });

    // Auto-blur on mouse leave to allow next uploader to receive focus
    uploader.addEventListener('mouseleave', () => {
      uploader.blur();
      console.log(`[clipboard-paste] Auto-blurred uploader[${role}] on mouse leave`);
    });

    // Also listen on the uploader's children for convenience
    uploader.addEventListener('click', () => {
      uploader.focus();
      console.log(`[clipboard-paste] Focused uploader[${role}] on click - Ready for Ctrl+V`);
    });

    // Add visual feedback when focused
    uploader.addEventListener('focus', () => {
      uploader.style.outline = '2px solid rgba(255, 94, 102, 0.5)';
      console.log(`[clipboard-paste] Uploader[${role}] focused`);
    });

    uploader.addEventListener('blur', () => {
      uploader.style.outline = '';
      console.log(`[clipboard-paste] Uploader[${role}] blurred`);
    });

    console.log(`[clipboard-paste] ✓ Enabled paste for uploader[${role}] (${index + 1}/${uploaders.length})`);
  });

  console.log('[clipboard-paste] ✓ Module initialized successfully');
  console.log('[clipboard-paste] Usage: Click on any uploader and press Ctrl+V to paste from clipboard');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClipboardPaste);
} else {
  // DOM already loaded
  initClipboardPaste();
}
