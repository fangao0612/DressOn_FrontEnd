// Showcase Editor Configuration
// Set EDIT_MODE to true to enable image uploading and editing features
// Set to false to hide all editing controls

export const SHOWCASE_CONFIG = {
  EDIT_MODE: true, // Toggle this to show/hide editing features
  SHOW_SAVE_BUTTON: false, // Toggle to show/hide Save export buttons
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB max file size
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  SAVE_DIRECTORY: './assets/showcase/' // Directory to save uploaded images
};
