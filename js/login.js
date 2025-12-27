/**
 * login.js - Login Page Handler
 * Handles user login form and authentication
 */

class LoginManager {
  constructor() {
    this.form = null;
    this.emailInput = null;
    this.passwordInput = null;
    this.loginBtn = null;
    this.errorMessage = null;
    
    this.init();
  }

  init() {
    this.getElements();
    this.checkAuthState();
    this.bindEvents();
  }

  getElements() {
    this.form = document.getElementById('login-form');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.loginBtn = document.getElementById('login-btn');
    this.errorMessage = document.getElementById('error-message');

    if (!this.form || !this.emailInput || !this.passwordInput || !this.loginBtn) {
      console.error('Required login form elements not found');
      return false;
    }

    return true;
  }

  bindEvents() {
    if (!this.form) return;

    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Click to dismiss error message
    if (this.errorMessage) {
      this.errorMessage.addEventListener('click', () => this.hideError());
    }

    // Clear error on input
    if (this.emailInput) {
      this.emailInput.addEventListener('input', () => this.clearError());
    }

    if (this.passwordInput) {
      this.passwordInput.addEventListener('input', () => this.clearError());
    }

    // Enter key handling
    this.emailInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.passwordInput?.focus();
      }
    });

    this.passwordInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.form.dispatchEvent(new Event('submit'));
      }
    });
  }

  checkAuthState() {
    // Check if user is already logged in
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          // Redirect to portal if already logged in
          console.log('User already logged in, redirecting to portal');
          redirectToPortal();
        }
      });
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    if (!this.validateInputs(email, password)) {
      return;
    }

    await this.attemptLogin(email, password);
  }

  validateInputs(email, password) {
    if (!email) {
      this.showError('Veuillez entrer votre adresse email.');
      this.emailInput?.focus();
      return false;
    }

    if (!this.validateEmail(email)) {
      this.showError('Veuillez entrer une adresse email valide.');
      this.emailInput?.focus();
      return false;
    }

    if (!password) {
      this.showError('Veuillez entrer votre mot de passe.');
      this.passwordInput?.focus();
      return false;
    }

    return true;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async attemptLogin(email, password) {
    this.setLoading(true);
    this.clearError();

    try {
      await loginUser(email, password);
      
      // Success - redirect to portal
      console.log('Login successful, redirecting to portal');
      redirectToPortal();
      
    } catch (error) {
      console.error('Login error:', error);
      this.showError(getAuthErrorMessage(error));
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(loading) {
    if (this.loginBtn) {
      this.loginBtn.disabled = loading;
      if (loading) {
        this.loginBtn.classList.add('loading');
        this.loginBtn.textContent = 'Connexion en cours...';
      } else {
        this.loginBtn.classList.remove('loading');
        this.loginBtn.textContent = 'Se connecter';
      }
    }

    if (this.emailInput) this.emailInput.disabled = loading;
    if (this.passwordInput) this.passwordInput.disabled = loading;
  }

  showError(message) {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.style.display = 'block';
    }
  }

  hideError() {
    if (this.errorMessage) {
      this.errorMessage.style.display = 'none';
    }
  }

  clearError() {
    this.hideError();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the login page
  if (document.getElementById('login-form')) {
    window.loginManager = new LoginManager();
  }
});
