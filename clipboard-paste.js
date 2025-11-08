// Clipboard Paste for Image Uploaders
(function() {
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

    // Make uploader focusable
    uploader.setAttribute('tabindex', '0');

    // Add paste event listener
    uploader.addEventListener('paste', async (e) => {
      e.preventDefault();

      console.log(`[clipboard-paste] Paste event on uploader[${role}]`);

      // Get clipboard data
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) {
        console.warn('[clipboard-paste] No clipboard items found');
        return;
      }

      // Find image in clipboard
      let imageFile = null;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            // Create a proper File object with name
            imageFile = new File([blob], `pasted-image-${Date.now()}.png`, {
              type: blob.type || 'image/png'
            });
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

      // Trigger change event to notify the upload handlers
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      console.log(`[clipboard-paste] Image pasted to uploader[${role}]`);
    });

    // Add visual feedback when focused
    uploader.addEventListener('focus', () => {
      uploader.style.outline = '2px solid rgba(255, 94, 102, 0.5)';
    });

    uploader.addEventListener('blur', () => {
      uploader.style.outline = '';
    });

    console.log(`[clipboard-paste] Enabled paste for uploader[${role}] (${index + 1}/${uploaders.length})`);
  });

  // Global paste handler as fallback (works anywhere on the page)
  document.addEventListener('paste', async (e) => {
    // Only handle if not already handled by uploader
    if (e.target.closest('.uploader')) {
      return;
    }

    // Check if there's a focused uploader
    const focusedUploader = document.activeElement?.closest('.uploader');
    if (!focusedUploader) {
      return;
    }

    // Trigger paste on focused uploader
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: e.clipboardData
    });
    focusedUploader.dispatchEvent(pasteEvent);
  });

  console.log('[clipboard-paste] Module initialized successfully');
  console.log('[clipboard-paste] Usage: Click on any uploader and press Ctrl+V to paste from clipboard');
})();
