/**
 * Centralized Version Management
 * Update VERSION before each deployment to GitHub
 */

// Auto-generate version from current date
const APP_VERSION = new Date().toISOString().split('T')[0].replace(/-/g, '');
// Results in format: 20250103

// Optional: Add build/deployment number if needed
// const APP_VERSION = '20250103-001';

console.log('🔄 App Version:', APP_VERSION);

/**
 * Load CSS file with version cache-busting
 */
function loadCSS(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${href}?v=${APP_VERSION}`;
  document.head.appendChild(link);
}

/**
 * Load JS file with version cache-busting
 */
function loadJS(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${src}?v=${APP_VERSION}`;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/**
 * Load multiple CSS files
 */
function loadAllCSS(files) {
  files.forEach(file => loadCSS(file));
}

/**
 * Load multiple JS files sequentially
 */
async function loadAllJS(files) {
  for (const file of files) {
    await loadJS(file);
  }
}

// Make functions globally available
window.AppVersion = {
  version: APP_VERSION,
  loadCSS,
  loadJS,
  loadAllCSS,
  loadAllJS
};