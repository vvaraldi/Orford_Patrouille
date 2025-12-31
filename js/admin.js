/**
 * admin.js - Admin Panel for User Management + Data Export
 * Centralized user management for Orford Patrouille
 * 
 * Features:
 * - Tab 1: User Management (view, create, edit, toggle, delete users) - UNCHANGED from original
 * - Tab 2: Data Management (export data to JSON) - NEW
 */

class AdminManager {
  constructor() {
    this.currentUserId = null;
    this.auth = null;
    this.db = null;
    this.userToDelete = null;
    this.userToEdit = null;
    
    this.init();
  }

  init() {
    console.log('Initializing Admin Manager');
    
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    
    // Check admin permissions
    this.checkAdminPermissions();
  }

  async checkAdminPermissions() {
    return new Promise((resolve) => {
      this.auth.onAuthStateChanged(async (user) => {
        if (user) {
          this.currentUserId = user.uid;
          try {
            const userDoc = await this.db.collection('inspectors').doc(user.uid).get();
            
            if (userDoc.exists) {
              const userData = userDoc.data();
              
              // Check if active
              if (userData.status !== 'active') {
                this.showAccessDenied('Votre compte a été désactivé');
                await this.auth.signOut();
                resolve(false);
                return;
              }
              
              // Check if admin role
              if (userData.role !== 'admin') {
                this.showAccessDenied('Accès réservé aux administrateurs');
                resolve(false);
                return;
              }
              
              // Check if has access to ALL apps (required for user management)
              const hasInspectionAccess = userData.allowInspection !== false;
              const hasInfractionAccess = userData.allowInfraction === true;
              const hasSignalisationAccess = userData.allowSignalisation === true;
              
              if (!hasInspectionAccess || !hasInfractionAccess || !hasSignalisationAccess) {
                this.showAccessDenied('Accès réservé aux administrateurs ayant accès à toutes les applications');
                resolve(false);
                return;
              }
              
              // Full admin verified - show content
              this.showMainContent();
              this.initializeElements();
              this.bindEvents();
              this.loadInspectors();
              this.initializeExportDefaults();
              
              // Update admin name display
              const adminName = document.getElementById('admin-name');
              if (adminName) adminName.textContent = userData.name || 'Administrateur';
              
              resolve(true);
            } else {
              this.showAccessDenied('Utilisateur non trouvé');
              resolve(false);
            }
          } catch (error) {
            console.error('Error checking admin permissions:', error);
            this.showAccessDenied('Erreur de vérification');
            resolve(false);
          }
        } else {
          redirectToLogin();
          resolve(false);
        }
      });
    });
  }

  showMainContent() {
    const loading = document.getElementById('loading');
    const mainContent = document.getElementById('main-content');
    
    if (loading) loading.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
  }

  showAccessDenied(message) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    
    alert(message);
    redirectToPortal();
  }

  initializeElements() {
    // Tab elements
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');
    
    // User management elements
    this.userForm = document.getElementById('user-form');
    this.inspectorsTable = document.getElementById('inspectors-table');
    this.deleteModal = document.getElementById('delete-modal');
    this.editModal = document.getElementById('edit-modal');
    this.userSuccessMessage = document.getElementById('user-success-message');
    this.userErrorMessage = document.getElementById('user-error-message');
    
    // Export elements
    this.exportBtn = document.getElementById('export-data-btn');
    this.exportStartDate = document.getElementById('export-start-date');
    this.exportStatus = document.getElementById('export-status');
  }

  bindEvents() {
    // Tab navigation
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });
    
    // User form submission
    if (this.userForm) {
      this.userForm.addEventListener('submit', (e) => this.handleUserFormSubmit(e));
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-users');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadInspectors());
    }

    // Delete modal buttons
    const cancelDelete = document.getElementById('cancel-delete');
    const confirmDelete = document.getElementById('confirm-delete');
    
    if (cancelDelete) {
      cancelDelete.addEventListener('click', () => this.closeDeleteModal());
    }
    
    if (confirmDelete) {
      confirmDelete.addEventListener('click', () => this.confirmDeleteUser());
    }

    // Edit modal buttons
    const cancelEdit = document.getElementById('cancel-edit');
    const saveEdit = document.getElementById('save-edit');
    
    if (cancelEdit) {
      cancelEdit.addEventListener('click', () => this.closeEditModal());
    }
    
    if (saveEdit) {
      saveEdit.addEventListener('click', () => this.saveUserEdit());
    }

    // Close modals when clicking outside
    if (this.deleteModal) {
      this.deleteModal.addEventListener('click', (e) => {
        if (e.target === this.deleteModal) this.closeDeleteModal();
      });
    }
    
    if (this.editModal) {
      this.editModal.addEventListener('click', (e) => {
        if (e.target === this.editModal) this.closeEditModal();
      });
    }
    
    // Export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener('click', () => this.executeExport());
    }
  }

  // ========================================
  // TAB NAVIGATION (NEW)
  // ========================================
  
  switchTab(tabName) {
    // Update tab buttons
    this.tabBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      }
    });

    // Update tab content
    this.tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${tabName}-tab`) {
        content.classList.add('active');
      }
    });
  }

  // ========================================
  // EXPORT FUNCTIONALITY (NEW)
  // ========================================
  
  initializeExportDefaults() {
    // Calculate default date: September 1st of the current season
    const today = new Date();
    let defaultYear = today.getFullYear();
    
    // If we're before September (months 0-8 in JS), use previous year
    if (today.getMonth() < 8) {
      defaultYear = defaultYear - 1;
    }
    
    const defaultDate = new Date(defaultYear, 8, 1); // September 1st
    const formattedDate = defaultDate.toISOString().split('T')[0];
    
    if (this.exportStartDate) {
      this.exportStartDate.value = formattedDate;
    }
  }
  
  showExportStatus(message, type = 'info') {
    if (this.exportStatus) {
      this.exportStatus.textContent = message;
      this.exportStatus.className = `export-status show ${type}`;
    }
  }
  
  hideExportStatus() {
    if (this.exportStatus) {
      this.exportStatus.className = 'export-status';
    }
  }
  
  // Helper method to format dates as "hh:mm of DD-MM-YYYY"
  formatExportDate(value) {
    if (!value) return null;
    
    let date;
    
    // Handle Firestore Timestamp
    if (value && typeof value.toDate === 'function') {
      date = value.toDate();
    }
    // Handle existing Date object
    else if (value instanceof Date) {
      date = value;
    }
    // Handle string or number
    else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    }
    // Handle Firestore Timestamp-like object with seconds
    else if (value && value.seconds) {
      date = new Date(value.seconds * 1000);
    }
    else {
      return value; // Return as-is if we can't parse it
    }
    
    // Check for valid date
    if (isNaN(date.getTime())) {
      return value;
    }
    
    // Format as "hh:mm of DD-MM-YYYY"
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${hours}:${minutes} of ${day}-${month}-${year}`;
  }

  // Helper method to process document data and format dates
  formatDocumentDates(data) {
    const formatted = { ...data };
    
    // List of known date fields to format
    const dateFields = [
      'date', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 
      'lastLogin', 'last_login', 'modifiedAt', 'archivedAt', 
      'resolvedAt', 'adminModifiedAt', 'offenceTimestamp',
      'timestampModificationAdmin', 'timestampArchivedAdmin'
    ];
    
    for (const key of Object.keys(formatted)) {
      const value = formatted[key];
      
      // Check if this is a known date field or looks like a Firestore Timestamp
      if (dateFields.includes(key) || (value && (typeof value.toDate === 'function' || value.seconds))) {
        formatted[key] = this.formatExportDate(value);
      }
    }
    
    return formatted;
  }

  async executeExport() {
    // Get selected data types
    const exportTrailInspections = document.getElementById('export-trail-inspections')?.checked ?? true;
    const exportShelterInspections = document.getElementById('export-shelter-inspections')?.checked ?? true;
    const exportInfractions = document.getElementById('export-infractions')?.checked ?? true;
    const exportSignalisations = document.getElementById('export-signalisations')?.checked ?? true;
    
    // Check if at least one type is selected
    if (!exportTrailInspections && !exportShelterInspections && !exportInfractions && !exportSignalisations) {
      alert('Veuillez sélectionner au moins un type de données à exporter.');
      return;
    }
    
    // Get start date
    if (!this.exportStartDate || !this.exportStartDate.value) {
      alert('Veuillez sélectionner une date de début');
      return;
    }

    const startDate = new Date(this.exportStartDate.value);
    startDate.setHours(0, 0, 0, 0);
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);

    try {
      // Update UI
      this.exportBtn.disabled = true;
      this.exportBtn.textContent = '⏳ Export en cours...';
      this.showExportStatus('Chargement des données de référence...', 'info');
      
      // Load reference data for name resolution
      const [trails, shelters, inspectors] = await Promise.all([
        this.db.collection('trails').get(),
        this.db.collection('shelters').get(),
        this.db.collection('inspectors').get()
      ]);

      // Create lookup maps for ID -> name resolution
      const trailsMap = new Map();
      trails.docs.forEach(doc => {
        const data = doc.data();
        trailsMap.set(doc.id, data.name || doc.id);
      });

      const sheltersMap = new Map();
      shelters.docs.forEach(doc => {
        const data = doc.data();
        sheltersMap.set(doc.id, data.name || doc.id);
      });

      const inspectorsMap = new Map();
      inspectors.docs.forEach(doc => {
        const data = doc.data();
        inspectorsMap.set(doc.id, data.name || doc.id);
      });

      // Prepare export data object
      const exportData = {
        exportDate: this.formatExportDate(new Date()),
        exportPeriod: {
          from: this.formatExportDate(startDate),
          to: this.formatExportDate(new Date())
        },
        summary: {}
      };

      // Load Trail Inspections
      if (exportTrailInspections) {
        this.showExportStatus('Chargement des inspections de sentiers...', 'info');
        const trailInspectionsSnapshot = await this.db.collection('trail_inspections')
          .where('date', '>=', startTimestamp)
          .orderBy('date', 'desc')
          .get();
        
        exportData.trailInspections = trailInspectionsSnapshot.docs.map(doc => {
          const data = this.formatDocumentDates(doc.data());
          if (data.trail_id) {
            data.trail_name = trailsMap.get(data.trail_id) || data.trail_id;
            delete data.trail_id;
          }
          if (data.inspector_id && !data.inspector_name) {
            data.inspector_name = inspectorsMap.get(data.inspector_id) || data.inspector_id;
          }
          delete data.inspector_id;
          return { id: doc.id, ...data };
        });
        exportData.summary.trailInspectionsCount = trailInspectionsSnapshot.size;
      }

      // Load Shelter Inspections
      if (exportShelterInspections) {
        this.showExportStatus('Chargement des inspections d\'abris...', 'info');
        const shelterInspectionsSnapshot = await this.db.collection('shelter_inspections')
          .where('date', '>=', startTimestamp)
          .orderBy('date', 'desc')
          .get();
        
        exportData.shelterInspections = shelterInspectionsSnapshot.docs.map(doc => {
          const data = this.formatDocumentDates(doc.data());
          if (data.shelter_id) {
            data.shelter_name = sheltersMap.get(data.shelter_id) || data.shelter_id;
            delete data.shelter_id;
          }
          if (data.inspector_id && !data.inspector_name) {
            data.inspector_name = inspectorsMap.get(data.inspector_id) || data.inspector_id;
          }
          delete data.inspector_id;
          return { id: doc.id, ...data };
        });
        exportData.summary.shelterInspectionsCount = shelterInspectionsSnapshot.size;
      }

      // Load Infractions
      if (exportInfractions) {
        this.showExportStatus('Chargement des infractions...', 'info');
        const infractionsSnapshot = await this.db.collection('infractions')
          .where('createdAt', '>=', startTimestamp)
          .orderBy('createdAt', 'desc')
          .get();
        
        exportData.infractions = infractionsSnapshot.docs.map(doc => {
          const data = this.formatDocumentDates(doc.data());
          // Resolve patrol ID to name if needed
          if (data.patrolId && !data.patrolName) {
            data.patrolName = inspectorsMap.get(data.patrolId) || data.patrolId;
          }
          return { id: doc.id, ...data };
        });
        exportData.summary.infractionsCount = infractionsSnapshot.size;
      }

      // Load Signalisations
      if (exportSignalisations) {
        this.showExportStatus('Chargement des signalisations...', 'info');
        const signalisationsSnapshot = await this.db.collection('signalisations')
          .where('createdAt', '>=', startTimestamp)
          .orderBy('createdAt', 'desc')
          .get();
        
        exportData.signalisations = signalisationsSnapshot.docs.map(doc => {
          const data = this.formatDocumentDates(doc.data());
          // Resolve inspector ID to name if needed
          if (data.inspectorId && !data.inspectorName) {
            data.inspectorName = inspectorsMap.get(data.inspectorId) || data.inspectorId;
          }
          return { id: doc.id, ...data };
        });
        exportData.summary.signalisationsCount = signalisationsSnapshot.size;
      }

      // Create filename with date range
      const fromDateStr = startDate.toISOString().split('T')[0];
      const toDateStr = new Date().toISOString().split('T')[0];
      const filename = `Orford_Patrouille-Export-${fromDateStr}-to-${toDateStr}.json`;
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Calculate total records
      const totalRecords = (exportData.summary.trailInspectionsCount || 0) +
                          (exportData.summary.shelterInspectionsCount || 0) +
                          (exportData.summary.infractionsCount || 0) +
                          (exportData.summary.signalisationsCount || 0);
      
      this.showExportStatus(`✓ Export réussi! ${totalRecords} enregistrements exportés.`, 'success');
      console.log('✓ Données exportées avec succès:', exportData.summary);
      
    } catch (error) {
      console.error('✗ Erreur lors de l\'export:', error);
      this.showExportStatus(`✗ Erreur: ${error.message}`, 'error');
      alert('Erreur lors de l\'export: ' + error.message);
    } finally {
      this.exportBtn.disabled = false;
      this.exportBtn.textContent = '📥 Exporter en JSON';
    }
  }

  // ========================================
  // USER CREATION (FROM OLD FILE - UNCHANGED)
  // ========================================

  async handleUserFormSubmit(e) {
    e.preventDefault();
    
    const userData = {
      name: document.getElementById('user-name').value.trim(),
      email: document.getElementById('user-email').value.trim(),
      phone: document.getElementById('user-phone').value.trim(),
      password: document.getElementById('user-password').value,
      role: document.getElementById('user-role').value,
      status: document.getElementById('user-status').value,
      allowInspection: document.getElementById('user-allow-inspection')?.checked ?? true,
      allowInfraction: document.getElementById('user-allow-infraction')?.checked ?? true,
      allowSignalisation: document.getElementById('user-allow-signalisation')?.checked ?? true
    };

    if (!this.validateUserForm(userData)) {
      return;
    }

    let secondaryApp = null;

    try {
      this.setFormLoading(true);
      
      // Create secondary Firebase app to avoid automatic login
      secondaryApp = firebase.initializeApp(getFirebaseConfig(), "secondary");
      const secondaryAuth = secondaryApp.auth();
      
      // Create user with secondary app
      const userCredential = await secondaryAuth.createUserWithEmailAndPassword(
        userData.email, 
        userData.password
      );

      // Add user data to Firestore
      await this.db.collection('inspectors').doc(userCredential.user.uid).set({
        name: userData.name,
        email: userData.email,
        phone: userData.phone || null,
        role: userData.role,
        status: userData.status,
        allowInspection: userData.allowInspection,
        allowInfraction: userData.allowInfraction,
        allowSignalisation: userData.allowSignalisation,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: this.currentUserId
      });

      this.showSuccess('Utilisateur créé avec succès');
      this.resetUserForm();
      this.loadInspectors();
      
    } catch (error) {
      console.error('Error creating user:', error);
      this.handleUserCreationError(error);
    } finally {
      if (secondaryApp) {
        try {
          await secondaryApp.delete();
        } catch (cleanupError) {
          console.warn('Error cleaning up secondary app:', cleanupError);
        }
      }
      this.setFormLoading(false);
    }
  }

  validateUserForm(userData) {
    if (!userData.name) {
      this.showError('Le nom est requis');
      return false;
    }
    
    if (!userData.email) {
      this.showError('L\'email est requis');
      return false;
    }
    
    if (!userData.password || userData.password.length < 6) {
      this.showError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    return true;
  }

  handleUserCreationError(error) {
    let message = 'Erreur lors de la création de l\'utilisateur';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Cette adresse email est déjà utilisée';
        break;
      case 'auth/invalid-email':
        message = 'Adresse email invalide';
        break;
      case 'auth/weak-password':
        message = 'Le mot de passe est trop faible';
        break;
    }
    
    this.showError(message);
  }

  resetUserForm() {
    if (this.userForm) {
      this.userForm.reset();
      // Re-check the default checkboxes
      const allowInspection = document.getElementById('user-allow-inspection');
      const allowInfraction = document.getElementById('user-allow-infraction');
      const allowSignalisation = document.getElementById('user-allow-signalisation');
      if (allowInspection) allowInspection.checked = true;
      if (allowInfraction) allowInfraction.checked = true;
      if (allowSignalisation) allowSignalisation.checked = true;
    }
  }

  setFormLoading(loading) {
    const submitBtn = document.getElementById('submit-user-btn');
    
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? 'Création...' : 'Créer l\'utilisateur';
    }
    
    if (this.userForm) {
      this.userForm.style.opacity = loading ? '0.6' : '1';
    }
  }

  // ========================================
  // LOAD & DISPLAY USERS (FROM OLD FILE - UNCHANGED)
  // ========================================

  async loadInspectors() {
    const tbody = this.inspectorsTable?.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chargement...</td></tr>';

    try {
      const snapshot = await this.db.collection('inspectors').orderBy('name').get();
      
      if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Aucun utilisateur trouvé</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        const row = this.createUserRow(doc.id, userData);
        tbody.appendChild(row);
      });

      this.bindTableEvents();
      
    } catch (error) {
      console.error('Error loading inspectors:', error);
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erreur de chargement</td></tr>';
    }
  }

  createUserRow(userId, userData) {
    const row = document.createElement('tr');
    const isCurrentUser = userId === this.currentUserId;
    
    // Role styling
    const roleClass = userData.role === 'admin' ? 'role-admin' : 'role-inspector';
    const roleText = userData.role === 'admin' ? 'Administrateur' : 'Inspecteur';
    
    // Status styling
    const statusClass = userData.status === 'active' ? 'status-active' : 'status-inactive';
    const statusText = userData.status === 'active' ? 'Actif' : 'Inactif';

    // Access styling
    const inspectionAccessClass = userData.allowInspection !== false ? 'access-granted' : 'access-denied';
    const inspectionAccessText = userData.allowInspection !== false ? '✓ Inspection' : '✗ Inspection';
    
    const infractionAccessClass = userData.allowInfraction === true ? 'access-granted' : 'access-denied';
    const infractionAccessText = userData.allowInfraction === true ? '✓ Infraction' : '✗ Infraction';

    const signalisationAccessClass = userData.allowSignalisation === true ? 'access-granted' : 'access-denied';
    const signalisationAccessText = userData.allowSignalisation === true ? '✓ Signalisation' : '✗ Signalisation';

    row.innerHTML = `
      <td class="user-name-cell" data-user-id="${userId}" style="cursor: pointer;">
        ${userData.name}
        ${isCurrentUser ? '<span class="current-user-indicator">(Vous)</span>' : ''}
      </td>
      <td>${userData.email}</td>
      <td>${userData.phone || '-'}</td>
      <td>
        <button class="role-badge ${roleClass}" 
                data-user-id="${userId}" 
                data-current-role="${userData.role}"
                ${isCurrentUser ? 'disabled title="Vous ne pouvez pas modifier votre propre rôle"' : ''}>
          ${roleText}
        </button>
      </td>
      <td>
        <button class="status-badge ${statusClass}" 
                data-user-id="${userId}" 
                data-current-status="${userData.status}"
                ${isCurrentUser ? 'disabled title="Vous ne pouvez pas modifier votre propre statut"' : ''}>
          ${statusText}
        </button>
      </td>
      <td>
        <div class="access-badges">
          <button class="access-badge ${inspectionAccessClass}" 
                  data-user-id="${userId}" 
                  data-access-type="inspection"
                  data-current-access="${userData.allowInspection !== false}">
            ${inspectionAccessText}
          </button>
          <button class="access-badge ${infractionAccessClass}" 
                  data-user-id="${userId}" 
                  data-access-type="infraction"
                  data-current-access="${userData.allowInfraction === true}">
            ${infractionAccessText}
          </button>
          <button class="access-badge ${signalisationAccessClass}" 
                  data-user-id="${userId}" 
                  data-access-type="signalisation"
                  data-current-access="${userData.allowSignalisation === true}">
            ${signalisationAccessText}
          </button>
        </div>
      </td>
      <td>
        <div class="admin-table-actions">
          <button class="btn btn-sm btn-secondary edit-user-btn" 
                  data-user-id="${userId}"
                  title="Modifier">
            ✏️
          </button>
          <button class="btn btn-sm btn-danger delete-user-btn" 
                  data-user-id="${userId}"
                  ${isCurrentUser ? 'disabled title="Vous ne pouvez pas vous supprimer"' : 'title="Supprimer"'}>
            🗑️
          </button>
        </div>
      </td>
    `;

    return row;
  }

  bindTableEvents() {
    // Role toggle
    document.querySelectorAll('.role-badge:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = e.target.dataset.userId;
        const currentRole = e.target.dataset.currentRole;
        const newRole = currentRole === 'admin' ? 'inspector' : 'admin';
        this.toggleUserRole(userId, newRole, e.target);
      });
    });

    // Status toggle
    document.querySelectorAll('.status-badge:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = e.target.dataset.userId;
        const currentStatus = e.target.dataset.currentStatus;
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        this.toggleUserStatus(userId, newStatus, e.target);
      });
    });

    // Access toggle
    document.querySelectorAll('.access-badge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = e.target.dataset.userId;
        const accessType = e.target.dataset.accessType;
        const currentAccess = e.target.dataset.currentAccess === 'true';
        this.toggleUserAccess(userId, accessType, !currentAccess, e.target);
      });
    });

    // Edit button click
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = e.target.closest('button').dataset.userId;
        this.openEditModal(userId);
      });
    });

    // Row click to edit (on name cell)
    document.querySelectorAll('.user-name-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const userId = e.target.closest('td').dataset.userId;
        this.openEditModal(userId);
      });
    });

    // Delete button click
    document.querySelectorAll('.delete-user-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = e.target.closest('button').dataset.userId;
        this.openDeleteModal(userId);
      });
    });
  }

  // ========================================
  // TOGGLE FUNCTIONS (FROM OLD FILE - UNCHANGED)
  // ========================================

  async toggleUserRole(userId, newRole, buttonElement) {
    try {
      buttonElement.disabled = true;
      
      await this.db.collection('inspectors').doc(userId).update({
        role: newRole
      });

      const newText = newRole === 'admin' ? 'Administrateur' : 'Inspecteur';
      const newClass = newRole === 'admin' ? 'role-admin' : 'role-inspector';
      
      buttonElement.textContent = newText;
      buttonElement.className = `role-badge ${newClass}`;
      buttonElement.dataset.currentRole = newRole;

      this.showSuccess('Rôle mis à jour');
    } catch (error) {
      console.error('Error updating role:', error);
      this.showError('Erreur lors de la mise à jour du rôle');
    } finally {
      buttonElement.disabled = false;
    }
  }

  async toggleUserStatus(userId, newStatus, buttonElement) {
    try {
      buttonElement.disabled = true;
      
      await this.db.collection('inspectors').doc(userId).update({
        status: newStatus
      });

      const newText = newStatus === 'active' ? 'Actif' : 'Inactif';
      const newClass = newStatus === 'active' ? 'status-active' : 'status-inactive';
      
      buttonElement.textContent = newText;
      buttonElement.className = `status-badge ${newClass}`;
      buttonElement.dataset.currentStatus = newStatus;

      this.showSuccess('Statut mis à jour');
    } catch (error) {
      console.error('Error updating status:', error);
      this.showError('Erreur lors de la mise à jour du statut');
    } finally {
      buttonElement.disabled = false;
    }
  }

  async toggleUserAccess(userId, accessType, newAccess, buttonElement) {
    try {
      buttonElement.disabled = true;
      
      const updateFieldMap = {
        'inspection': 'allowInspection',
        'infraction': 'allowInfraction',
        'signalisation': 'allowSignalisation'
      };
      const updateField = updateFieldMap[accessType];
      
      await this.db.collection('inspectors').doc(userId).update({
        [updateField]: newAccess
      });

      const accessTextMap = {
        'inspection': 'Inspection',
        'infraction': 'Infraction',
        'signalisation': 'Signalisation'
      };
      const accessText = accessTextMap[accessType];
      const newText = newAccess ? `✓ ${accessText}` : `✗ ${accessText}`;
      const newClass = newAccess ? 'access-granted' : 'access-denied';
      
      buttonElement.textContent = newText;
      buttonElement.className = `access-badge ${newClass}`;
      buttonElement.dataset.currentAccess = newAccess;

      this.showSuccess('Accès mis à jour');
    } catch (error) {
      console.error('Error updating access:', error);
      this.showError('Erreur lors de la mise à jour de l\'accès');
    } finally {
      buttonElement.disabled = false;
    }
  }

  // ========================================
  // EDIT MODAL (FROM OLD FILE - UNCHANGED)
  // ========================================

  async openEditModal(userId) {
    try {
      const doc = await this.db.collection('inspectors').doc(userId).get();
      
      if (!doc.exists) {
        this.showError('Utilisateur non trouvé');
        return;
      }

      this.userToEdit = userId;
      const userData = doc.data();

      // Populate edit form
      document.getElementById('edit-user-name').value = userData.name || '';
      document.getElementById('edit-user-email').value = userData.email || '';
      document.getElementById('edit-user-phone').value = userData.phone || '';
      document.getElementById('edit-user-role').value = userData.role || 'inspector';
      document.getElementById('edit-user-status').value = userData.status || 'active';
      document.getElementById('edit-user-allow-inspection').checked = userData.allowInspection !== false;
      document.getElementById('edit-user-allow-infraction').checked = userData.allowInfraction === true;
      document.getElementById('edit-user-allow-signalisation').checked = userData.allowSignalisation === true;

      // Disable self-modification of role/status
      const isCurrentUser = userId === this.currentUserId;
      document.getElementById('edit-user-role').disabled = isCurrentUser;
      document.getElementById('edit-user-status').disabled = isCurrentUser;

      // Show modal
      if (this.editModal) {
        this.editModal.classList.add('show');
        document.body.style.overflow = 'hidden';
      }

    } catch (error) {
      console.error('Error loading user for edit:', error);
      this.showError('Erreur lors du chargement de l\'utilisateur');
    }
  }

  closeEditModal() {
    this.userToEdit = null;
    if (this.editModal) {
      this.editModal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  async saveUserEdit() {
    if (!this.userToEdit) return;

    const updateData = {
      name: document.getElementById('edit-user-name').value.trim(),
      phone: document.getElementById('edit-user-phone').value.trim() || null,
      role: document.getElementById('edit-user-role').value,
      status: document.getElementById('edit-user-status').value,
      allowInspection: document.getElementById('edit-user-allow-inspection').checked,
      allowInfraction: document.getElementById('edit-user-allow-infraction').checked,
      allowSignalisation: document.getElementById('edit-user-allow-signalisation').checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: this.currentUserId
    };

    if (!updateData.name) {
      this.showError('Le nom est requis');
      return;
    }

    try {
      const saveBtn = document.getElementById('save-edit');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Enregistrement...';
      }

      await this.db.collection('inspectors').doc(this.userToEdit).update(updateData);

      this.showSuccess('Utilisateur mis à jour');
      this.closeEditModal();
      this.loadInspectors();

    } catch (error) {
      console.error('Error saving user:', error);
      this.showError('Erreur lors de la sauvegarde');
    } finally {
      const saveBtn = document.getElementById('save-edit');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Enregistrer';
      }
    }
  }

  // ========================================
  // DELETE MODAL (FROM OLD FILE - UNCHANGED)
  // ========================================

  openDeleteModal(userId) {
    this.userToDelete = userId;
    if (this.deleteModal) {
      this.deleteModal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  closeDeleteModal() {
    this.userToDelete = null;
    if (this.deleteModal) {
      this.deleteModal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  async confirmDeleteUser() {
    if (!this.userToDelete) return;

    try {
      const confirmBtn = document.getElementById('confirm-delete');
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Suppression...';
      }

      // Delete from Firestore
      await this.db.collection('inspectors').doc(this.userToDelete).delete();

      // Note: This only deletes from Firestore, not from Firebase Auth
      // Full deletion from Auth requires Cloud Functions

      this.showSuccess('Utilisateur supprimé');
      this.closeDeleteModal();
      this.loadInspectors();

    } catch (error) {
      console.error('Error deleting user:', error);
      this.showError('Erreur lors de la suppression');
    } finally {
      const confirmBtn = document.getElementById('confirm-delete');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Supprimer';
      }
    }
  }

  // ========================================
  // MESSAGES (FROM OLD FILE - UNCHANGED)
  // ========================================

  showSuccess(message) {
    if (this.userSuccessMessage) {
      this.userSuccessMessage.textContent = message;
      this.userSuccessMessage.style.display = 'block';
      setTimeout(() => {
        this.userSuccessMessage.style.display = 'none';
      }, 3000);
    }
    this.hideError();
  }

  showError(message) {
    if (this.userErrorMessage) {
      this.userErrorMessage.textContent = message;
      this.userErrorMessage.style.display = 'block';
      setTimeout(() => {
        this.userErrorMessage.style.display = 'none';
      }, 5000);
    }
    this.hideSuccess();
  }

  hideSuccess() {
    if (this.userSuccessMessage) {
      this.userSuccessMessage.style.display = 'none';
    }
  }

  hideError() {
    if (this.userErrorMessage) {
      this.userErrorMessage.style.display = 'none';
    }
  }
}

// Helper function to redirect to portal
function redirectToPortal() {
  window.location.href = '../index.html';
}

// Helper function to redirect to login
function redirectToLogin() {
  window.location.href = 'https://vvaraldi.github.io/Orford_Patrouille/pages/login.html';
}

// Handle logout
function handleLogout(event) {
  event.preventDefault();
  firebase.auth().signOut().then(() => {
    window.location.href = 'https://vvaraldi.github.io/Orford_Patrouille/pages/login.html';
  }).catch(error => {
    console.error('Error signing out:', error);
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('inspectors-table')) {
    window.adminManager = new AdminManager();
  }
});