/**
 * portal.js - Main Portal Page Logic
 * Handles the main portal dashboard functionality
 */

class PortalManager {
  constructor() {
    this.userData = null;
    this.init();
  }

  init() {
    console.log('Initializing Portal Manager');
    
    // Listen for authentication
    document.addEventListener('userAuthenticated', (e) => {
      this.userData = e.detail;
      this.onUserAuthenticated();
    });

    // Check auth with portal-specific options
    checkAuthStatus({
      requireAuth: false, // Allow viewing login button when not authenticated
      onAuthenticated: (userData) => {
        this.userData = userData;
        this.onUserAuthenticated();
      },
      onUnauthenticated: () => {
        this.onUserUnauthenticated();
      }
    });
  }

  onUserAuthenticated() {
    console.log('User authenticated:', this.userData.name);
    
    // Show authenticated UI
    this.showAuthenticatedUI();
    
    // Update user welcome section
    this.updateWelcomeSection();
    
    // Update app cards based on permissions
    this.updateAppCards();
    
    // Bind app card clicks
    this.bindAppCardEvents();
  }

  onUserUnauthenticated() {
    console.log('User not authenticated');
    
    // Show unauthenticated UI (login prompt)
    this.showUnauthenticatedUI();
  }

  showAuthenticatedUI() {
    const authSection = document.getElementById('auth-section');
    const portalSection = document.getElementById('portal-section');
    const loginPrompt = document.getElementById('login-prompt');
    
    if (authSection) authSection.style.display = 'none';
    if (loginPrompt) loginPrompt.style.display = 'none';
    if (portalSection) portalSection.style.display = 'block';
  }

  showUnauthenticatedUI() {
    const authSection = document.getElementById('auth-section');
    const portalSection = document.getElementById('portal-section');
    const loginPrompt = document.getElementById('login-prompt');
    
    if (authSection) authSection.style.display = 'block';
    if (loginPrompt) loginPrompt.style.display = 'block';
    if (portalSection) portalSection.style.display = 'none';
  }

  updateWelcomeSection() {
    const welcomeName = document.getElementById('welcome-name');
    const welcomeRole = document.getElementById('welcome-role');
    const userInitials = document.getElementById('user-initials');
    
    if (welcomeName && this.userData.name) {
      welcomeName.textContent = `Bonjour, ${this.userData.name}`;
    }
    
    if (welcomeRole) {
      const roleText = this.userData.role === 'admin' ? 'Administrateur' : 'Inspecteur';
      welcomeRole.textContent = roleText;
    }
    
    if (userInitials && this.userData.name) {
      const initials = this.userData.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      userInitials.textContent = initials;
    }
  }

  updateAppCards() {
    // Inspection card
    const inspectionCard = document.querySelector('[data-app="inspection"]');
    if (inspectionCard) {
      if (this.userData.allowInspection === false) {
        this.lockAppCard(inspectionCard);
      } else {
        this.unlockAppCard(inspectionCard);
      }
    }
    
    // Infraction card
    const infractionCard = document.querySelector('[data-app="infraction"]');
    if (infractionCard) {
      if (this.userData.allowInfraction !== true) {
        this.lockAppCard(infractionCard);
      } else {
        this.unlockAppCard(infractionCard);
      }
    }
    
    // Admin card - only for admins
    const adminCard = document.querySelector('[data-app="admin"]');
    if (adminCard) {
      if (this.userData.role !== 'admin') {
        this.lockAppCard(adminCard);
      } else {
        this.unlockAppCard(adminCard);
      }
    }
    
    // Signalisation card - coming soon, always disabled for now
    const signalisationCard = document.querySelector('[data-app="signalisation"]');
    if (signalisationCard) {
      signalisationCard.classList.add('disabled');
      const actionText = signalisationCard.querySelector('.app-card-action span');
      if (actionText) {
        actionText.textContent = 'Bientôt disponible';
      }
    }
  }

  lockAppCard(card) {
    card.classList.add('app-card-locked', 'disabled');
    card.style.pointerEvents = 'none';
  }

  unlockAppCard(card) {
    card.classList.remove('app-card-locked', 'disabled');
    card.style.pointerEvents = 'auto';
  }

  bindAppCardEvents() {
    const appCards = document.querySelectorAll('.app-card:not(.disabled)');
    
    appCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const appType = card.dataset.app;
        this.navigateToApp(appType);
      });
    });
  }

  navigateToApp(appType) {
    const appUrls = {
      'inspection': 'https://vvaraldi.github.io/Inspection_Rando_Orford/index.html',
      'infraction': 'https://vvaraldi.github.io/Infraction_Orford/index.html',
      'admin': 'pages/admin.html',
      'signalisation': null // Coming soon
    };

    const url = appUrls[appType];
    
    if (url) {
      // Navigate in the same window
      window.location.href = url;
    }
  }

  /**
   * Get app access summary for current user
   * @returns {Object} Access summary
   */
  getAccessSummary() {
    return {
      inspection: this.userData?.allowInspection !== false,
      infraction: this.userData?.allowInfraction === true,
      admin: this.userData?.role === 'admin',
      signalisation: false // Coming soon
    };
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on the main portal page
  if (document.getElementById('portal-section') || document.getElementById('login-prompt')) {
    window.portalManager = new PortalManager();
  }
});
