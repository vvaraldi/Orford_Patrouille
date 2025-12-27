/**
 * mobile-menu.js - Mobile Navigation Handler
 * Handles mobile menu open/close functionality
 */

class MobileMenuManager {
  constructor() {
    this.mobileNav = document.getElementById('mobile-nav');
    this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
    this.mobileNavClose = document.getElementById('mobile-nav-close');
    
    this.init();
  }

  init() {
    if (!this.mobileNav || !this.mobileMenuBtn) {
      return;
    }

    this.bindEvents();
  }

  bindEvents() {
    // Open menu
    if (this.mobileMenuBtn) {
      this.mobileMenuBtn.addEventListener('click', () => this.openMenu());
    }

    // Close menu with X button
    if (this.mobileNavClose) {
      this.mobileNavClose.addEventListener('click', () => this.closeMenu());
    }

    // Close menu when clicking outside
    if (this.mobileNav) {
      this.mobileNav.addEventListener('click', (e) => {
        if (e.target === this.mobileNav) {
          this.closeMenu();
        }
      });
    }

    // Close menu with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.closeMenu();
      }
    });

    // Close menu when clicking on a link
    const links = this.mobileNav?.querySelectorAll('.mobile-nav-links a');
    links?.forEach(link => {
      link.addEventListener('click', () => {
        // Only close if it's not an external link or hash link
        if (!link.target && !link.href.includes('#')) {
          this.closeMenu();
        }
      });
    });
  }

  openMenu() {
    if (this.mobileNav) {
      this.mobileNav.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  closeMenu() {
    if (this.mobileNav) {
      this.mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  isOpen() {
    return this.mobileNav?.classList.contains('open') || false;
  }

  toggle() {
    if (this.isOpen()) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.mobileMenuManager = new MobileMenuManager();
});
