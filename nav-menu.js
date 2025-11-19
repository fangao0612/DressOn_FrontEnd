// Navigation menu dropdown toggle
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.querySelector('.nav-menu-btn');
  const dropdown = document.querySelector('.nav-dropdown');

  if (!menuBtn || !dropdown) return;

  // Toggle dropdown on button click
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';

    if (isExpanded) {
      dropdown.setAttribute('hidden', '');
      menuBtn.setAttribute('aria-expanded', 'false');
    } else {
      dropdown.removeAttribute('hidden');
      menuBtn.setAttribute('aria-expanded', 'true');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.setAttribute('hidden', '');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close dropdown when clicking a link
  dropdown.querySelectorAll('.dropdown-link').forEach(link => {
    link.addEventListener('click', () => {
      dropdown.setAttribute('hidden', '');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });
});
