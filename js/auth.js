/**
 * auth.js - Firebase Authentication for Orford Patrouille Portal
 * Centralized authentication system for all Orford apps
 * 
 * @requires Firebase Auth, Firestore
 * @version 1.0.0
 */

// Firebase configuration (shared across all Orford apps)
const firebaseConfig = {
  apiKey: "AIzaSyDcBZrwGTskM7QUvanzLTACEJ_T-55j-DA",
  authDomain: "trail-inspection.firebaseapp.com",
  projectId: "trail-inspection",
  storageBucket: "trail-inspection.firebasestorage.app",
  messagingSenderId: "415995272058",
  appId: "1:415995272058:web:dc476de8ffee052e2ad4c3",
  measurementId: "G-EBLYWBM9YB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Current user state
let currentUser = null;
let currentUserData = null;

/**
 * Check authentication status and handle accordingly
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireAuth - Whether authentication is required
 * @param {boolean} options.requireAdmin - Whether admin role is required
 * @param {Function} options.onAuthenticated - Callback when user is authenticated
 * @param {Function} options.onUnauthenticated - Callback when user is not authenticated
 */
function checkAuthStatus(options = {}) {
  const {
    requireAuth = true,
    requireAdmin = false,
    onAuthenticated = null,
    onUnauthenticated = null
  } = options;

  const loading = document.getElementById('loading');
  const mainContent = document.getElementById('main-content');

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;

      try {
        // Get user data from inspectors collection
        const inspectorDoc = await db.collection('inspectors').doc(user.uid).get();

        if (inspectorDoc.exists) {
          currentUserData = inspectorDoc.data();
          currentUserData.uid = user.uid;

          // Check if user is active
          if (currentUserData.status !== 'active') {
            showAccessDenied('Votre compte a été désactivé. Contactez l\'administrateur.');
            await auth.signOut();
            return;
          }

          // Check admin requirement
          if (requireAdmin && currentUserData.role !== 'admin') {
            showAccessDenied('Accès réservé aux administrateurs.');
            return;
          }

          // Show content
          if (loading) loading.style.display = 'none';
          if (mainContent) mainContent.style.display = 'block';

          // Update UI
          updateUIForUser(currentUserData);

          // Callback
          if (onAuthenticated) {
            onAuthenticated(currentUserData);
          }

          // Dispatch event
          document.dispatchEvent(new CustomEvent('userAuthenticated', {
            detail: currentUserData
          }));

        } else {
          // User not in inspectors collection
          showAccessDenied('Utilisateur non trouvé. Contactez l\'administrateur.');
          await auth.signOut();
        }

      } catch (error) {
        console.error('Error checking auth status:', error);
        showAccessDenied('Erreur lors de la vérification des accès.');
        await auth.signOut();
      }

    } else {
      // Not logged in
      currentUser = null;
      currentUserData = null;

      if (requireAuth) {
        // Check if we're not already on login page
        if (!window.location.pathname.includes('login.html')) {
          redirectToLogin();
        } else {
          // On login page, show the form
          if (loading) loading.style.display = 'none';
          if (mainContent) mainContent.style.display = 'block';
        }
      } else {
        // Authentication not required
        if (loading) loading.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';

        if (onUnauthenticated) {
          onUnauthenticated();
        }
      }
    }
  });
}

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credential
 */
async function loginUser(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);

    // Verify user exists in inspectors collection
    const inspectorDoc = await db.collection('inspectors').doc(userCredential.user.uid).get();

    if (!inspectorDoc.exists) {
      await auth.signOut();
      throw new Error('account-not-found');
    }

    const userData = inspectorDoc.data();

    // Check if user is active
    if (userData.status !== 'active') {
      await auth.signOut();
      throw new Error('account-disabled');
    }

    return userCredential.user;

  } catch (error) {
    throw error;
  }
}

/**
 * Handle user logout
 * @param {Event} e - Click event
 */
async function handleLogout(e) {
  if (e) e.preventDefault();

  try {
    await auth.signOut();
    redirectToLogin();
  } catch (error) {
    console.error('Logout error:', error);
    alert('Erreur lors de la déconnexion.');
  }
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
async function sendPasswordReset(email) {
  return auth.sendPasswordResetEmail(email);
}

/**
 * Update UI elements based on user data
 * @param {Object} userData - User data from Firestore
 */
function updateUIForUser(userData) {
  // Update login/logout links
  const loginLink = document.getElementById('login-link');
  const mobileLoginLink = document.getElementById('mobile-login-link');

  if (loginLink) {
    loginLink.textContent = 'Déconnexion';
    loginLink.href = '#';
    loginLink.onclick = handleLogout;
  }

  if (mobileLoginLink) {
    mobileLoginLink.textContent = 'Déconnexion';
    mobileLoginLink.href = '#';
    mobileLoginLink.onclick = handleLogout;
  }

  // Show admin link if admin
  const adminLink = document.getElementById('admin-link');
  const mobileAdminLink = document.getElementById('mobile-admin-link');

  if (userData.role === 'admin') {
    if (adminLink) adminLink.style.display = 'block';
    if (mobileAdminLink) mobileAdminLink.style.display = 'block';
  }

  // Update user name displays
  const userNameElements = document.querySelectorAll('[data-user-name]');
  userNameElements.forEach(el => {
    el.textContent = userData.name || 'Utilisateur';
  });

  // Update user email displays
  const userEmailElements = document.querySelectorAll('[data-user-email]');
  userEmailElements.forEach(el => {
    el.textContent = userData.email || '';
  });

  // Update user role displays
  const userRoleElements = document.querySelectorAll('[data-user-role]');
  userRoleElements.forEach(el => {
    el.textContent = userData.role === 'admin' ? 'Administrateur' : 'Inspecteur';
  });

  // Update app access visibility
  updateAppAccessVisibility(userData);
}

/**
 * Update app card visibility based on user permissions
 * @param {Object} userData - User data from Firestore
 */
function updateAppAccessVisibility(userData) {
  // Inspection app
  const inspectionCard = document.querySelector('[data-app="inspection"]');
  if (inspectionCard) {
    if (userData.allowInspection === false) {
      inspectionCard.classList.add('app-card-locked', 'disabled');
    } else {
      inspectionCard.classList.remove('app-card-locked', 'disabled');
    }
  }

  // Infraction app
  const infractionCard = document.querySelector('[data-app="infraction"]');
  if (infractionCard) {
    if (userData.allowInfraction !== true) {
      infractionCard.classList.add('app-card-locked', 'disabled');
    } else {
      infractionCard.classList.remove('app-card-locked', 'disabled');
    }
  }

  // Admin app (only for admins)
  const adminCard = document.querySelector('[data-app="admin"]');
  if (adminCard) {
    if (userData.role !== 'admin') {
      adminCard.classList.add('app-card-locked', 'disabled');
    } else {
      adminCard.classList.remove('app-card-locked', 'disabled');
    }
  }
}

/**
 * Display access denied message
 * @param {string} message - Message to display
 */
function showAccessDenied(message) {
  const loading = document.getElementById('loading');
  const mainContent = document.getElementById('main-content');

  if (loading) loading.style.display = 'none';
  if (mainContent) mainContent.style.display = 'none';

  alert(message);
  redirectToLogin();
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
  const isInPages = window.location.pathname.includes('/pages/');
  const loginUrl = isInPages ? 'login.html' : 'pages/login.html';
  window.location.href = loginUrl;
}

/**
 * Redirect to main portal page
 */
function redirectToPortal() {
  const isInPages = window.location.pathname.includes('/pages/');
  const portalUrl = isInPages ? '../index.html' : 'index.html';
  window.location.href = portalUrl;
}

/**
 * Get current user data
 * @returns {Object|null} Current user data
 */
function getCurrentUser() {
  return currentUserData;
}

/**
 * Get current user ID
 * @returns {string|null} Current user ID
 */
function getCurrentUserId() {
  return currentUser ? currentUser.uid : null;
}

/**
 * Check if current user is admin
 * @returns {boolean} True if admin
 */
function isAdmin() {
  return currentUserData && currentUserData.role === 'admin';
}

/**
 * Check if current user has inspection access
 * @returns {boolean} True if has access
 */
function hasInspectionAccess() {
  return currentUserData && currentUserData.allowInspection !== false;
}

/**
 * Check if current user has infraction access
 * @returns {boolean} True if has access
 */
function hasInfractionAccess() {
  return currentUserData && currentUserData.allowInfraction === true;
}

/**
 * Get Firebase config (for secondary app instances)
 * @returns {Object} Firebase config
 */
function getFirebaseConfig() {
  return firebaseConfig;
}

/**
 * Get error message in French
 * @param {Error} error - Firebase error
 * @returns {string} Translated error message
 */
function getAuthErrorMessage(error) {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'Adresse email invalide.';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé.';
    case 'auth/user-not-found':
      return 'Aucun compte trouvé avec cette adresse email.';
    case 'auth/wrong-password':
      return 'Mot de passe incorrect.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Veuillez réessayer plus tard.';
    case 'auth/network-request-failed':
      return 'Erreur de connexion. Vérifiez votre connexion internet.';
    case 'auth/email-already-in-use':
      return 'Cette adresse email est déjà utilisée.';
    case 'auth/weak-password':
      return 'Le mot de passe est trop faible.';
    case 'auth/requires-recent-login':
      return 'Veuillez vous reconnecter pour effectuer cette action.';
    case 'account-not-found':
      return 'Compte non trouvé dans le système.';
    case 'account-disabled':
      return 'Votre compte a été désactivé.';
    default:
      return error.message || 'Une erreur inattendue s\'est produite.';
  }
}
