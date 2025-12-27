/**
 * forgot-password.js - Password Recovery Handler
 * Handles password reset email functionality
 */

class ForgotPasswordManager {
  constructor() {
    this.form = null;
    this.emailInput = null;
    this.submitBtn = null;
    this.successMessage = null;
    this.errorMessage = null;
    
    this.init();
  }

  init() {
    this.getElements();
    this.bindEvents();
  }

  getElements() {
    this.form = document.getElementById('forgot-password-form');
    this.emailInput = document.getElementById('email');
    this.submitBtn = document.getElementById('submit-btn');
    this.successMessage = document.getElementById('success-message');
    this.errorMessage = document.getElementById('error-message');

    return this.form && this.emailInput && this.submitBtn;
  }

  bindEvents() {
    if (!this.form) return;

    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    if (this.emailInput) {
      this.emailInput.addEventListener('input', () => this.clearMessages());
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const email = this.emailInput.value.trim();

    if (!this.validateEmail(email)) {
      this.showError('Veuillez entrer une adresse email valide.');
      return;
    }

    this.setLoading(true);
    this.clearMessages();

    try {
      await sendPasswordReset(email);
      this.showSuccess('Un email de réinitialisation a été envoyé à ' + email + '. Vérifiez votre boîte de réception.');
      this.form.reset();
      
    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error.code === 'auth/user-not-found') {
        // For security, don't reveal if email exists
        this.showSuccess('Si cette adresse email est associée à un compte, vous recevrez un email de réinitialisation.');
      } else {
        this.showError(getAuthErrorMessage(error));
      }
    } finally {
      this.setLoading(false);
    }
  }

  validateEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  setLoading(loading) {
    if (this.submitBtn) {
      this.submitBtn.disabled = loading;
      if (loading) {
        this.submitBtn.classList.add('loading');
        this.submitBtn.textContent = 'Envoi en cours...';
      } else {
        this.submitBtn.classList.remove('loading');
        this.submitBtn.textContent = 'Envoyer le lien';
      }
    }

    if (this.emailInput) {
      this.emailInput.disabled = loading;
    }
  }

  showSuccess(message) {
    if (this.successMessage) {
      this.successMessage.textContent = message;
      this.successMessage.style.display = 'block';
    }
    this.hideError();
  }

  showError(message) {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.style.display = 'block';
    }
    this.hideSuccess();
  }

  hideSuccess() {
    if (this.successMessage) {
      this.successMessage.style.display = 'none';
    }
  }

  hideError() {
    if (this.errorMessage) {
      this.errorMessage.style.display = 'none';
    }
  }

  clearMessages() {
    this.hideSuccess();
    this.hideError();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('forgot-password-form')) {
    window.forgotPasswordManager = new ForgotPasswordManager();
  }
});
