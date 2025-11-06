// Temporary debug version of setCanvasImage
function setCanvasImage(sel, src) {
  const panel = document.querySelector(sel);
  if (!panel) {
    console.error('[DEBUG] Panel not found:', sel);
    return;
  }
  
  // Add debug border to canvas
  panel.style.border = '3px solid red';
  
  console.log('[DEBUG] Canvas dimensions:', {
    selector: sel,
    width: panel.clientWidth,
    height: panel.clientHeight,
    offsetWidth: panel.offsetWidth,
    offsetHeight: panel.offsetHeight,
    scrollWidth: panel.scrollWidth,
    scrollHeight: panel.scrollHeight
  });
  
  panel.innerHTML = '';
  const img = document.createElement('img');
  img.src = src;
  
  // Add debug border to image
  img.style.border = '3px solid blue';
  
  // Log image dimensions after load
  img.onload = () => {
    console.log('[DEBUG] Image loaded:', {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      clientWidth: img.clientWidth,
      clientHeight: img.clientHeight,
      offsetWidth: img.offsetWidth,
      offsetHeight: img.offsetHeight,
      computedWidth: window.getComputedStyle(img).width,
      computedHeight: window.getComputedStyle(img).height,
      computedMaxWidth: window.getComputedStyle(img).maxWidth,
      computedMaxHeight: window.getComputedStyle(img).maxHeight,
      computedObjectFit: window.getComputedStyle(img).objectFit
    });
  };
  
  // keep aspect ratio inside canvas without overflow
  img.style.maxWidth = '100%';
  img.style.maxHeight = '100%';
  img.style.width = 'auto';
  img.style.height = 'auto';
  img.style.objectFit = 'contain';
  panel.appendChild(img);
  
  console.log('[DEBUG] Image element styles set');
}

console.log('[DEBUG] Debug setCanvasImage loaded');
