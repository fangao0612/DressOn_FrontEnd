// Theme Toggle Handler
(function() {
  const THEME_KEY = 'dresson-theme';
  const themeToggle = document.querySelector('.theme-toggle');

  if (!themeToggle) {
    console.warn('[theme] Theme toggle button not found');
    return;
  }

  // Get saved theme or default to 'dark'
  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'dark';
    } catch (e) {
      console.error('[theme] Error reading from localStorage:', e);
      return 'dark';
    }
  }

  // Save theme to localStorage
  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.error('[theme] Error saving to localStorage:', e);
    }
  }

  // Apply theme to document
  function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      themeToggle.textContent = '☀️';
      themeToggle.setAttribute('aria-label', 'Switch to dark mode');
    } else {
      root.removeAttribute('data-theme');
      themeToggle.textContent = '🌙';
      themeToggle.setAttribute('aria-label', 'Switch to light mode');
    }

    console.log('[theme] Applied theme:', theme);
  }

  // Toggle theme
  function toggleTheme() {
    const current = getSavedTheme();
    const next = current === 'dark' ? 'light' : 'dark';

    applyTheme(next);
    saveTheme(next);

    console.log('[theme] Toggled from', current, 'to', next);
  }

  // Initialize theme on page load
  function initTheme() {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    console.log('[theme] Initialized with theme:', savedTheme);
  }

  // Bind click event
  themeToggle.addEventListener('click', toggleTheme);

  // Initialize immediately
  initTheme();

  console.log('[theme] Theme toggle handler initialized');
})();
