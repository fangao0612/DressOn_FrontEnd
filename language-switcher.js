import { translations } from './translations.js';

// Language configuration
const LANGUAGES = {
  en: { code: 'en', name: 'English', label: 'US' },
  zh: { code: 'zh', name: '中文', label: 'CN' }
};

const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'preferred-language';

// Get current language from localStorage or default
function getCurrentLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && translations[saved] ? saved : DEFAULT_LANGUAGE;
}

// Set language and save to localStorage
function setLanguage(langCode) {
  if (!translations[langCode]) {
    console.error(`Language ${langCode} not supported`);
    return;
  }

  localStorage.setItem(STORAGE_KEY, langCode);
  document.documentElement.lang = langCode;
  applyTranslations(langCode);
  updateLanguageButton(langCode);
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations(langCode) {
  const elements = document.querySelectorAll('[data-i18n]');

  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = translations[langCode][key];

    if (translation) {
      // Check if element has specific content target
      const target = element.getAttribute('data-i18n-target');

      if (target === 'placeholder') {
        element.placeholder = translation;
      } else if (target === 'title') {
        element.title = translation;
      } else if (target === 'aria-label') {
        element.setAttribute('aria-label', translation);
      } else {
        // Default: update text content
        element.textContent = translation;
      }
    } else {
      console.warn(`Translation missing for key: ${key} in ${langCode}`);
    }
  });
}

// Update language button to show current language
function updateLanguageButton(langCode) {
  const button = document.querySelector('.pill.locale');
  if (button) {
    const lang = LANGUAGES[langCode];
    const labelSpan = button.querySelector('span:not(.chev)');
    if (labelSpan) {
      labelSpan.textContent = lang.label;
    } else {
      // If no span, update button text before chevron
      const chevron = button.querySelector('.chev');
      button.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = lang.label + ' ';
        }
      });
    }
  }
}

// Toggle between languages
function toggleLanguage() {
  const current = getCurrentLanguage();
  const next = current === 'en' ? 'zh' : 'en';
  setLanguage(next);
}

// Initialize language switcher
function initLanguageSwitcher() {
  // Set initial language
  const currentLang = getCurrentLanguage();
  setLanguage(currentLang);

  // Add click handler to language button
  const languageButton = document.querySelector('.pill.locale');
  if (languageButton) {
    languageButton.addEventListener('click', (e) => {
      e.preventDefault();
      toggleLanguage();
    });

    // Make it look clickable
    languageButton.style.cursor = 'pointer';
  } else {
    console.warn('Language button not found');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanguageSwitcher);
} else {
  initLanguageSwitcher();
}

// Export for manual use if needed
export { setLanguage, getCurrentLanguage, toggleLanguage };
