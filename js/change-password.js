/**
 * change-password.js - Password Change Handler
 * Handles password change functionality for logged-in users
 */

class ChangePasswordManager {
  constructor() {
    this.form = null;
    this.currentPasswordInput = null;
    this.newPasswordInput = null;
    this.confirmPasswordInput = null;
    this.submitBtn = null;
    this.successMessage = null;
    this.errorMessage = null;
    this.passwordStrength = null;
    
    this.init();
  }

  init() {
    console.log('Initializing Change Password Manager');
    this.getElements();
    this.checkAuthentication();
  }

  getElements() {
    this.form = document.getElementById('change-password-form');
    this.currentPasswordInput = document.getElementById('current-password');
    this.newPasswordInput = document.getElementById('new-password');
    this.confirmPasswordInput = document.getElementById('confirm-password');
    this.submitBtn = document.getElementById('submit-btn');
    this.successMessage = document.getElementById('success-message');
    this.errorMessage = document.getElementById('error-message');
    this.passwordStrength = document.getElementById('password-strength');

    return this.form != null;
  }

  checkAuthentication() {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        console.log('User authenticated:', user.email);
        this.showMainContent();
        this.bindEvents();
      } else {
        console.log('User not authenticated, redirecting to login');
        redirectToLogin();
      }
    });
  }

  showMainContent() {
    const loading = document.getElementById('loading');
    const mainContent = document.getElementById('main-content');
    
    if (loading) loading.style.display = 'none';
    if (mainContent) mainContent.style.display = 'flex';
  }

  bindEvents() {
    if (!this.form) return;

    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    if (this.newPasswordInput) {
      this.newPasswordInput.addEventListener('input', () => this.checkPasswordStrength());
    }

    if (this.confirmPasswordInput) {
      this.confirmPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const currentPassword = this.currentPasswordInput.value.trim();
    const newPassword = this.newPasswordInput.value.trim();
    const confirmPassword = this.confirmPasswordInput.value.trim();

    this.clearMessages();

    if (!this.validateForm(currentPassword, newPassword, confirmPassword)) {
      return;
    }

    this.setLoading(true);

    try {
      await this.changePassword(currentPassword, newPassword);
      this.showSuccess('Mot de passe changé avec succès !');
      this.form.reset();
      
      // Redirect to portal after a delay
      setTimeout(() => {
        redirectToPortal();
      }, 2000);
      
    } catch (error) {
      console.error('Error changing password:', error);
      this.showError(this.getErrorMessage(error));
    } finally {
      this.setLoading(false);
    }
  }

  validateForm(currentPassword, newPassword, confirmPassword) {
    if (!currentPassword) {
      this.showError('Veuillez entrer votre mot de passe actuel.');
      return false;
    }

    if (!newPassword) {
      this.showError('Veuillez entrer un nouveau mot de passe.');
      return false;
    }

    if (newPassword.length < 8) {
      this.showError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return false;
    }

    if (!this.isPasswordStrong(newPassword)) {
      this.showError('Le nouveau mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.');
      return false;
    }

    if (newPassword !== confirmPassword) {
      this.showError('Les mots de passe ne correspondent pas.');
      return false;
    }

    if (currentPassword === newPassword) {
      this.showError('Le nouveau mot de passe doit être différent de l\'actuel.');
      return false;
    }

    return true;
  }

  async changePassword(currentPassword, newPassword) {
    const user = firebase.auth().currentUser;
    
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    // Re-authenticate user with current password
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email,
      currentPassword
    );

    await user.reauthenticateWithCredential(credential);
    
    // Update password
    await user.updatePassword(newPassword);
  }

  checkPasswordStrength() {
    const password = this.newPasswordInput.value;
    const strength = this.calculatePasswordStrength(password);
    
    if (!this.passwordStrength) return;

    if (password.length === 0) {
      this.passwordStrength.textContent = '';
      this.passwordStrength.className = 'password-strength';
      return;
    }

    switch (strength) {
      case 'weak':
        this.passwordStrength.textContent = 'Faible - Ajoutez des majuscules, minuscules et chiffres';
        this.passwordStrength.className = 'password-strength weak';
        break;
      case 'medium':
        this.passwordStrength.textContent = 'Moyen - Ajoutez plus de caractères ou de complexité';
        this.passwordStrength.className = 'password-strength medium';
        break;
      case 'strong':
        this.passwordStrength.textContent = 'Fort - Bon mot de passe !';
        this.passwordStrength.className = 'password-strength strong';
        break;
    }
  }

  calculatePasswordStrength(password) {
    if (password.length < 6) return 'weak';
    
    let score = 0;
    
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  }

  isPasswordStrong(password) {
    return password.length >= 8 &&
           /[a-z]/.test(password) &&
           /[A-Z]/.test(password) &&
           /[0-9]/.test(password);
  }

  validatePasswordMatch() {
    const newPassword = this.newPasswordInput.value;
    const confirmPassword = this.confirmPasswordInput.value;
    
    if (confirmPassword && newPassword !== confirmPassword) {
      this.confirmPasswordInput.setCustomValidity('Les mots de passe ne correspondent pas');
    } else {
      this.confirmPasswordInput.setCustomValidity('');
    }
  }

  setLoading(loading) {
    if (this.submitBtn) {
      this.submitBtn.disabled = loading;
      if (loading) {
        this.submitBtn.classList.add('loading');
        this.submitBtn.textContent = 'Changement en cours...';
      } else {
        this.submitBtn.classList.remove('loading');
        this.submitBtn.textContent = 'Changer le mot de passe';
      }
    }
  }

  clearMessages() {
    if (this.successMessage) {
      this.successMessage.style.display = 'none';
      this.successMessage.textContent = '';
    }
    if (this.errorMessage) {
      this.errorMessage.style.display = 'none';
      this.errorMessage.textContent = '';
    }
  }

  showSuccess(message) {
    if (this.successMessage) {
      this.successMessage.textContent = message;
      this.successMessage.style.display = 'block';
    }
  }

  showError(message) {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.style.display = 'block';
    }
  }

  getErrorMessage(error) {
    switch (error.code) {
      case 'auth/wrong-password':
        return 'Mot de passe actuel incorrect.';
      case 'auth/weak-password':
        return 'Le nouveau mot de passe est trop faible.';
      case 'auth/requires-recent-login':
        return 'Veuillez vous reconnecter avant de changer votre mot de passe.';
      case 'auth/too-many-requests':
        return 'Trop de tentatives. Veuillez réessayer plus tard.';
      case 'auth/network-request-failed':
        return 'Erreur de connexion. Vérifiez votre connexion internet.';
      default:
        return error.message || 'Une erreur inattendue s\'est produite.';
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('change-password-form')) {
    window.changePasswordManager = new ChangePasswordManager();
  }
});
