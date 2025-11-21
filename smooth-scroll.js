// Smooth Scroll Handler
(function() {
  // Precise scroll positions for different sections (responsive)
  const SCROLL_POSITIONS = {
    'editor': {
      desktop: 1337,    // >1920px
      responsive: 963   // ≤1920px
    },
    'step1': {
      desktop: 1337,    // >1920px
      responsive: 963   // ≤1920px
    }
  };

  // Get appropriate scroll position based on screen width
  function getScrollPosition(targetId) {
    const positions = SCROLL_POSITIONS[targetId];
    if (!positions) return undefined;

    const isDesktop = window.innerWidth > 1920;
    return isDesktop ? positions.desktop : positions.responsive;
  }

  // Find all elements with data-scroll-to attribute
  const scrollButtons = document.querySelectorAll('[data-scroll-to]');

  // Also handle navigation links with href="#editor" or href="#step1"
  const navLinks = document.querySelectorAll('a[href="#editor"], a[href="#step1"]');

  console.log(`[smooth-scroll] Found ${scrollButtons.length} scroll button(s) and ${navLinks.length} nav link(s)`);

  // Handle scroll click with precise positioning
  function handleScrollClick(event) {
    event.preventDefault();

    const element = event.currentTarget;
    let targetId = element.getAttribute('data-scroll-to');

    // If it's a navigation link, extract ID from href
    if (!targetId) {
      const href = element.getAttribute('href');
      if (href && href.startsWith('#')) {
        targetId = href.substring(1);
      }
    }

    if (!targetId) {
      console.warn('[smooth-scroll] No target ID specified');
      return;
    }

    // Check if we have a precise position for this target
    const precisePosition = getScrollPosition(targetId);

    if (precisePosition !== undefined) {
      const screenType = window.innerWidth > 1920 ? 'desktop' : 'responsive';
      console.log(`[smooth-scroll] Scrolling to precise position: ${precisePosition}px (target: #${targetId}, screen: ${screenType})`);
      window.scrollTo({
        top: precisePosition,
        behavior: 'smooth'
      });
    } else {
      // Fallback to element scrollIntoView
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        console.log(`[smooth-scroll] Scrolling to element #${targetId}`);
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      } else {
        console.warn(`[smooth-scroll] Target element #${targetId} not found`);
      }
    }
  }

  // Bind click events to scroll buttons
  scrollButtons.forEach((button, index) => {
    button.addEventListener('click', handleScrollClick);
    const targetId = button.getAttribute('data-scroll-to');
    console.log(`[smooth-scroll] Bound button ${index + 1} -> #${targetId}`);
  });

  // Bind click events to navigation links
  navLinks.forEach((link, index) => {
    link.addEventListener('click', handleScrollClick);
    const href = link.getAttribute('href');
    console.log(`[smooth-scroll] Bound nav link ${index + 1} -> ${href}`);
  });

  console.log('[smooth-scroll] Smooth scroll handler initialized');
})();
