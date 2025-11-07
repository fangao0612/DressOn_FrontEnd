// Smooth Scroll Handler
(function() {
  // Find all elements with data-scroll-to attribute
  const scrollButtons = document.querySelectorAll('[data-scroll-to]');

  if (!scrollButtons || scrollButtons.length === 0) {
    console.warn('[smooth-scroll] No scroll buttons found');
    return;
  }

  console.log(`[smooth-scroll] Found ${scrollButtons.length} scroll button(s)`);

  // Handle scroll click
  function handleScrollClick(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const targetId = button.getAttribute('data-scroll-to');

    if (!targetId) {
      console.warn('[smooth-scroll] No target ID specified');
      return;
    }

    const targetElement = document.getElementById(targetId);

    if (!targetElement) {
      console.warn(`[smooth-scroll] Target element #${targetId} not found`);
      return;
    }

    console.log(`[smooth-scroll] Scrolling to #${targetId}`);

    // Scroll to target with smooth behavior
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  }

  // Bind click events to all scroll buttons
  scrollButtons.forEach((button, index) => {
    button.addEventListener('click', handleScrollClick);
    const targetId = button.getAttribute('data-scroll-to');
    console.log(`[smooth-scroll] Bound button ${index + 1} -> #${targetId}`);
  });

  console.log('[smooth-scroll] Smooth scroll handler initialized');
})();
