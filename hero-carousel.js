// Hero Background Carousel
(function() {
  const images = document.querySelectorAll('.hero-bg-image');

  if (!images || images.length === 0) {
    console.warn('[hero-carousel] No background images found');
    return;
  }

  let currentIndex = 0;
  const totalImages = images.length;
  const interval = 4000; // 4 seconds

  console.log(`[hero-carousel] Initialized with ${totalImages} images`);

  function showNextImage() {
    // Remove active class from current image
    images[currentIndex].classList.remove('active');

    // Move to next image (loop back to 0 after last image)
    currentIndex = (currentIndex + 1) % totalImages;

    // Add active class to next image
    images[currentIndex].classList.add('active');

    console.log(`[hero-carousel] Showing image ${currentIndex + 1}/${totalImages}`);
  }

  // Start carousel rotation
  setInterval(showNextImage, interval);

  console.log('[hero-carousel] Auto-rotation started (4s interval)');
})();
