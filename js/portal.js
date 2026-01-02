/**
 * portal.js - Main Portal Page Logic
 * Handles the main portal dashboard functionality
 * 
 * App cards are dynamically generated based on user permissions
 * Admin access requires: role=admin AND access to ALL apps
 */

class PortalManager {
  constructor() {
    this.userData = null;
    this.init();
  }

  init() {
    console.log('Initializing Portal Manager');
    
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
    
    // Hide guest nav, show authenticated UI
    this.showAuthenticatedUI();
    
    // Update user welcome section
    this.updateWelcomeSection();
    
    // Generate app cards based on permissions
    this.generateAppCards();
  }

  onUserUnauthenticated() {
    console.log('User not authenticated');
    
    // Show unauthenticated UI (login prompt)
    this.showUnauthenticatedUI();
  }

  showAuthenticatedUI() {
    const loginPrompt = document.getElementById('login-prompt');
    const portalSection = document.getElementById('portal-section');
    const navLinksGuest = document.getElementById('nav-links-guest');
    
    if (loginPrompt) loginPrompt.style.display = 'none';
    if (portalSection) portalSection.style.display = 'block';
    if (navLinksGuest) navLinksGuest.style.display = 'none';
  }

  showUnauthenticatedUI() {
    const loginPrompt = document.getElementById('login-prompt');
    const portalSection = document.getElementById('portal-section');
    const navLinksGuest = document.getElementById('nav-links-guest');
    
    if (loginPrompt) loginPrompt.style.display = 'block';
    if (portalSection) portalSection.style.display = 'none';
    if (navLinksGuest) navLinksGuest.style.display = 'flex';
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

  /**
   * Check user access permissions
   */
  getAccessPermissions() {
    const hasInspectionAccess = this.userData?.allowInspection !== false;
    const hasInfractionAccess = this.userData?.allowInfraction === true;
    const hasSignalisationAccess = this.userData?.allowSignalisation === true;
    const isAdmin = this.userData?.role === 'admin';
    
    // Admin panel requires: admin role AND access to ALL apps
    const hasFullAdminAccess = isAdmin && hasInspectionAccess && hasInfractionAccess && hasSignalisationAccess;
    
    return {
      status: true, // Always accessible - public page
      inspection: hasInspectionAccess,
      infraction: hasInfractionAccess,
      signalisation: hasSignalisationAccess,
      admin: hasFullAdminAccess,
      request: true // Requests accessible to all authenticated users
    };
  }

  /**
   * Generate app cards dynamically based on user permissions
   */
  generateAppCards() {
    const appGrid = document.getElementById('app-grid');
    if (!appGrid) return;
    
    const permissions = this.getAccessPermissions();
    
    // Clear existing cards
    appGrid.innerHTML = '';
    
    // Define available apps
    const apps = [
      {
        id: 'inspection',
        title: 'Inspection piste de rando',
        icon: '🔍',
        description: 'Gestion d\'inspection des sentiers et abris de randonnée alpine. Créez des rapports d\'inspection, consultez l\'historique et gérez le statut des pistes.',
        url: 'https://vvaraldi.github.io/Inspection_Rando_Orford/index.html',
        actionText: 'Accéder à l\'application',
        comingSoon: false
      },
      {
        id: 'infraction',
        title: 'Infraction',
        icon: '🚨',
        description: 'Gestion des infractions. Enregistrement et gestions des infractions constatées.',
        url: 'https://vvaraldi.github.io/Infraction_Orford/index.html',
        actionText: 'Accéder à l\'application',
        comingSoon: false
      },
      {
        id: 'signalisation',
        title: 'Signalisation',
        icon: '🚧',
        description: 'Gestion de la signalisation des pistes.',
        url: 'https://vvaraldi.github.io/Signalisation_Orford/index.html',
        actionText: 'Programme en validation !',
        comingSoon: false
      },
      {
        id: 'status',
        title: 'Statut randonnée',
        icon: '🗺️',
        description: 'Consultez l\'état actuel des sentiers - accessible à tous.',
        url: 'https://vvaraldi.github.io/Inspection_Rando_Orford/pages/status.html',
        actionText: 'Voir le statut',
        comingSoon: false,
        openInNewTab: true
      },
      {
        id: 'admin',
        title: 'Gestion des utilisateurs et des données',
        icon: '👥',
        description: 'Administration des utilisateurs et exportation des données.',
        url: 'pages/admin.html',
        actionText: 'Accéder à l\'administration',
        comingSoon: false
      },
      {
        id: 'request',
        title: 'Demandes & Suggestions',
        icon: '📋',
        description: 'Signaler un bug ou proposer une amélioration',
        url: 'pages/requests.html',
        actionText: 'Accéder au registre',
        comingSoon: false
      }
    ];
    
    // Generate cards only for accessible apps
    let cardsGenerated = 0;
    
    apps.forEach(app => {
      if (permissions[app.id]) {
        const card = this.createAppCard(app);
        appGrid.appendChild(card);
        cardsGenerated++;
      }
    });
    
    // Show message if no apps available
    if (cardsGenerated === 0) {
      appGrid.innerHTML = `
        <div class="no-apps-message">
          <p>Aucune application n'est disponible pour votre compte.</p>
          <p class="text-muted text-sm">Contactez un administrateur pour obtenir les accès nécessaires.</p>
        </div>
      `;
    }
  }

  /**
   * Create a single app card element
   */
  createAppCard(app) {
    const card = document.createElement(app.comingSoon ? 'div' : 'a');
    if (!app.comingSoon) card.href = '#';
    card.className = 'app-card' + (app.comingSoon ? ' coming-soon' : '');
    card.dataset.app = app.id;
    
    card.innerHTML = `
      <div class="app-card-header">
        <div class="app-card-icon">${app.icon}</div>
        <h3 class="app-card-title">${app.title}</h3>
      </div>
      <div class="app-card-body">
        <p class="app-card-description">${app.description}</p>
        <div class="app-card-action">
          <span>${app.actionText}</span>
          <span class="app-card-action-arrow">${app.comingSoon ? '🔜' : '→'}</span>
        </div>
      </div>
    `;
    
    // Add click handler only for active apps
    if (!app.comingSoon && app.url) {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToApp(app.id, app.url, app.openInNewTab || false);
      });
    }
    
    return card;
  }

  /**
   * Navigate to an app
   */
  navigateToApp(appType, url, openInNewTab = false) {
    if (url) {
      if (openInNewTab) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = url;
      }
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on the main portal page
  if (document.getElementById('portal-section') || document.getElementById('login-prompt')) {
    window.portalManager = new PortalManager();
  }
});