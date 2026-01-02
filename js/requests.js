/**
 * requests.js - Requests & Suggestions Management
 * Handles bug reports, feature requests, questions, and suggestions
 * 
 * Features:
 * - Create new requests (all authenticated users)
 * - View requests (users see own, admins see all)
 * - Add comments (all users on their requests, admins on all)
 * - Change priority (admins)
 * - Change status (system admins only)
 * - Email notification to system admins on new request
 */

class RequestsManager {
  constructor() {
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.currentUserData = null;
    this.currentRequestId = null;
    this.allRequests = [];
    this.unsubscribeRequests = null;
    this.unsubscribeComments = null;
    
    this.init();
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  init() {
    console.log('Initializing RequestsManager');
    
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    
    this.auth.onAuthStateChanged((user) => this.handleAuthStateChanged(user));
  }

  async handleAuthStateChanged(user) {
    if (user) {
      this.currentUser = user;
      
      try {
        const userDoc = await this.db.collection('inspectors').doc(user.uid).get();
        
        if (userDoc.exists) {
          this.currentUserData = userDoc.data();
          
          // Check if active
          if (this.currentUserData.status !== 'active') {
            this.showAccessDenied('Votre compte a été désactivé');
            await this.auth.signOut();
            return;
          }
          
          // User is valid - show content
          this.showMainContent();
          this.initializeElements();
          this.bindEvents();
          this.loadRequests();
          this.setupAdminFeatures();
          
        } else {
          this.showAccessDenied('Utilisateur non trouvé');
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        this.showAccessDenied('Erreur de vérification');
      }
    } else {
      this.redirectToLogin();
    }
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
    this.redirectToLogin();
  }

  redirectToLogin() {
    const isInPages = window.location.pathname.includes('/pages/');
    const loginUrl = isInPages ? 'login.html' : 'pages/login.html';
    window.location.href = loginUrl;
  }

  initializeElements() {
    // Modals
    this.newRequestModal = document.getElementById('new-request-modal');
    this.detailModal = document.getElementById('request-detail-modal');
    
    // Forms
    this.newRequestForm = document.getElementById('new-request-form');
    
    // Lists
    this.requestsList = document.getElementById('requests-list');
    this.commentsList = document.getElementById('comments-list');
    
    // Filters
    this.filterType = document.getElementById('filter-type');
    this.filterStatus = document.getElementById('filter-status');
    this.filterPriority = document.getElementById('filter-priority');
    this.filterUser = document.getElementById('filter-user');
    this.filterUserGroup = document.getElementById('filter-user-group');
  }

  bindEvents() {
    // New request button
    const newRequestBtn = document.getElementById('new-request-btn');
    if (newRequestBtn) {
      newRequestBtn.addEventListener('click', () => this.openNewRequestModal());
    }

    // New request modal
    const closeNewRequest = document.getElementById('new-request-modal-close');
    const cancelNewRequest = document.getElementById('cancel-new-request');
    
    if (closeNewRequest) {
      closeNewRequest.addEventListener('click', () => this.closeNewRequestModal());
    }
    if (cancelNewRequest) {
      cancelNewRequest.addEventListener('click', () => this.closeNewRequestModal());
    }

    // New request form
    if (this.newRequestForm) {
      this.newRequestForm.addEventListener('submit', (e) => this.handleNewRequestSubmit(e));
    }

    // Detail modal
    const closeDetail = document.getElementById('detail-modal-close');
    if (closeDetail) {
      closeDetail.addEventListener('click', () => this.closeDetailModal());
    }

    // Comment submission
    const submitComment = document.getElementById('submit-comment');
    if (submitComment) {
      submitComment.addEventListener('click', () => this.submitComment());
    }

    // Admin controls
    const saveAdminChanges = document.getElementById('save-admin-changes');
    if (saveAdminChanges) {
      saveAdminChanges.addEventListener('click', () => this.saveAdminChanges());
    }

    // Filters
    if (this.filterType) {
      this.filterType.addEventListener('change', () => this.applyFilters());
    }
    if (this.filterStatus) {
      this.filterStatus.addEventListener('change', () => this.applyFilters());
    }
    if (this.filterPriority) {
      this.filterPriority.addEventListener('change', () => this.applyFilters());
    }
    if (this.filterUser) {
      this.filterUser.addEventListener('change', () => this.applyFilters());
    }

    // Reset filters
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => this.resetFilters());
    }

    // Close modals on outside click
    if (this.newRequestModal) {
      this.newRequestModal.addEventListener('click', (e) => {
        if (e.target === this.newRequestModal) this.closeNewRequestModal();
      });
    }
    if (this.detailModal) {
      this.detailModal.addEventListener('click', (e) => {
        if (e.target === this.detailModal) this.closeDetailModal();
      });
    }
  }

  setupAdminFeatures() {
    const isAdmin = this.currentUserData.role === 'admin';
    const isSystemAdmin = this.currentUserData.isSystemAdmin === true;
    
    // Show user filter for admins
    if (isAdmin && this.filterUserGroup) {
      this.filterUserGroup.style.display = 'block';
      this.loadUsersForFilter();
    }
    
    // Admin controls will be shown in detail modal based on role
  }

  // ========================================
  // LOAD REQUESTS
  // ========================================

  loadRequests() {
    const isAdmin = this.currentUserData.role === 'admin';
    
    // Unsubscribe from previous listener
    if (this.unsubscribeRequests) {
      this.unsubscribeRequests();
    }
    
    let query = this.db.collection('requests').orderBy('createdAt', 'desc');
    
    // Non-admins only see their own requests
    if (!isAdmin) {
      query = query.where('createdBy', '==', this.currentUser.uid);
    }
    
    this.unsubscribeRequests = query.onSnapshot(
      (snapshot) => {
        this.allRequests = [];
        snapshot.forEach(doc => {
          this.allRequests.push({ id: doc.id, ...doc.data() });
        });
        this.applyFilters();
      },
      (error) => {
        console.error('Error loading requests:', error);
        this.showError('Erreur lors du chargement des demandes');
      }
    );
  }

  async loadUsersForFilter() {
    try {
      const snapshot = await this.db.collection('inspectors').orderBy('name').get();
      
      if (this.filterUser) {
        this.filterUser.innerHTML = '<option value="all">Tous les utilisateurs</option>';
        
        snapshot.forEach(doc => {
          const userData = doc.data();
          const option = document.createElement('option');
          option.value = doc.id;
          option.textContent = userData.name || userData.email;
          this.filterUser.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading users for filter:', error);
    }
  }

  // ========================================
  // FILTERS
  // ========================================

  applyFilters() {
    const typeFilter = this.filterType?.value || 'all';
    const statusFilter = this.filterStatus?.value || 'all';
    const priorityFilter = this.filterPriority?.value || 'all';
    const userFilter = this.filterUser?.value || 'all';
    
    let filtered = this.allRequests.filter(request => {
      if (typeFilter !== 'all' && request.type !== typeFilter) return false;
      if (statusFilter !== 'all' && request.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && request.priority !== priorityFilter) return false;
      if (userFilter !== 'all' && request.createdBy !== userFilter) return false;
      return true;
    });
    
    this.renderRequests(filtered);
  }

  resetFilters() {
    if (this.filterType) this.filterType.value = 'all';
    if (this.filterStatus) this.filterStatus.value = 'all';
    if (this.filterPriority) this.filterPriority.value = 'all';
    if (this.filterUser) this.filterUser.value = 'all';
    
    this.applyFilters();
  }

  // ========================================
  // RENDER REQUESTS
  // ========================================

  renderRequests(requests) {
    if (!this.requestsList) return;
    
    // Update count
    const countEl = document.getElementById('request-count');
    if (countEl) {
      countEl.textContent = `${requests.length} demande(s)`;
    }
    
    if (requests.length === 0) {
      this.requestsList.innerHTML = `
        <div class="empty-state">
          <p>Aucune demande pour le moment</p>
        </div>
      `;
      return;
    }
    
    this.requestsList.innerHTML = requests.map(request => this.createRequestCard(request)).join('');
    
    // Bind click events
    this.requestsList.querySelectorAll('.request-card').forEach(card => {
      card.addEventListener('click', () => {
        const requestId = card.dataset.requestId;
        this.openDetailModal(requestId);
      });
    });
  }

  createRequestCard(request) {
    const typeLabels = {
      bug: '🐛 Bug',
      feature: '✨ Fonctionnalité',
      question: '❓ Question',
      suggestion: '💡 Suggestion'
    };
    
    const priorityLabels = {
      high: '🔴 Haute',
      medium: '🟡 Moyenne',
      low: '🟢 Basse'
    };
    
    const statusLabels = {
      new: '🆕 Nouveau',
      in_progress: '🔄 En cours',
      resolved: '✅ Résolu',
      archived: '📦 Archivé'
    };
    
    const date = request.createdAt ? this.formatDate(request.createdAt) : 'Date inconnue';
    const description = request.description ? 
      (request.description.length > 150 ? request.description.substring(0, 150) + '...' : request.description) : '';
    
    return `
      <div class="request-card" data-request-id="${request.id}">
        <div class="request-card-header">
          <h3 class="request-card-title">${this.escapeHtml(request.title)}</h3>
          <div class="request-card-badges">
            <span class="request-type-badge type-${request.type}">${typeLabels[request.type] || request.type}</span>
            <span class="request-priority-badge priority-${request.priority}">${priorityLabels[request.priority] || request.priority}</span>
            <span class="request-status-badge status-${request.status}">${statusLabels[request.status] || request.status}</span>
          </div>
        </div>
        <p class="request-card-description">${this.escapeHtml(description)}</p>
        <div class="request-card-footer">
          <div class="request-card-meta">
            <span>Par ${this.escapeHtml(request.createdByName || 'Inconnu')}</span>
            <span>${date}</span>
          </div>
          <div class="request-card-comments">
            💬 ${request.commentCount || 0}
          </div>
        </div>
      </div>
    `;
  }

  // ========================================
  // NEW REQUEST
  // ========================================

  openNewRequestModal() {
    if (this.newRequestModal) {
      this.newRequestModal.classList.add('show');
      this.newRequestForm?.reset();
      document.getElementById('request-priority').value = 'medium';
    }
  }

  closeNewRequestModal() {
    if (this.newRequestModal) {
      this.newRequestModal.classList.remove('show');
    }
    this.hideError('new-request-error');
  }

  async handleNewRequestSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('request-title').value.trim();
    const type = document.getElementById('request-type').value;
    const priority = document.getElementById('request-priority').value;
    const description = document.getElementById('request-description').value.trim();
    
    if (!title || !type || !priority || !description) {
      this.showError('Veuillez remplir tous les champs obligatoires', 'new-request-error');
      return;
    }
    
    const submitBtn = document.getElementById('submit-new-request');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi...';
    }
    
    try {
      const requestData = {
        title,
        type,
        priority,
        description,
        status: 'new',
        createdBy: this.currentUser.uid,
        createdByName: this.currentUserData.name || this.currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        commentCount: 0
      };
      
      const docRef = await this.db.collection('requests').add(requestData);
      
      // Send email notification to system admins
      await this.notifySystemAdmins(docRef.id, requestData);
      
      this.closeNewRequestModal();
      this.showSuccess('Demande créée avec succès');
      
    } catch (error) {
      console.error('Error creating request:', error);
      this.showError('Erreur lors de la création de la demande', 'new-request-error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Soumettre';
      }
    }
  }

  // ========================================
  // EMAIL NOTIFICATION
  // ========================================

  async notifySystemAdmins(requestId, requestData) {
    try {
      // Get all system admins
      const systemAdmins = await this.db.collection('inspectors')
        .where('isSystemAdmin', '==', true)
        .where('status', '==', 'active')
        .get();
      
      if (systemAdmins.empty) {
        console.log('No system admins to notify');
        return;
      }
      
      // Create notification record for Cloud Function to process
      const notificationData = {
        type: 'new_request',
        requestId: requestId,
        requestTitle: requestData.title,
        requestType: requestData.type,
        requestPriority: requestData.priority,
        requestDescription: requestData.description.substring(0, 200),
        createdByName: requestData.createdByName,
        recipients: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        processed: false
      };
      
      // Collect system admin emails
      systemAdmins.forEach(doc => {
        const adminData = doc.data();
        if (adminData.email) {
          notificationData.recipients.push(adminData.email);
        }
      });
      
      if (notificationData.recipients.length > 0) {
        // Store notification for Cloud Function to process
        await this.db.collection('notifications').add(notificationData);
        console.log('Notification created for system admins:', notificationData.recipients);
      }
      
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't throw - notification failure shouldn't block request creation
    }
  }

  // ========================================
  // REQUEST DETAIL
  // ========================================

  async openDetailModal(requestId) {
    this.currentRequestId = requestId;
    
    const request = this.allRequests.find(r => r.id === requestId);
    if (!request) {
      this.showError('Demande non trouvée');
      return;
    }
    
    // Populate detail modal
    const typeLabels = {
      bug: '🐛 Bug',
      feature: '✨ Fonctionnalité',
      question: '❓ Question',
      suggestion: '💡 Suggestion'
    };
    
    const priorityLabels = {
      high: '🔴 Haute',
      medium: '🟡 Moyenne',
      low: '🟢 Basse'
    };
    
    const statusLabels = {
      new: '🆕 Nouveau',
      in_progress: '🔄 En cours',
      resolved: '✅ Résolu',
      archived: '📦 Archivé'
    };
    
    document.getElementById('detail-modal-title').textContent = request.title;
    
    const typeEl = document.getElementById('detail-type');
    typeEl.textContent = typeLabels[request.type] || request.type;
    typeEl.className = `request-type-badge type-${request.type}`;
    
    const priorityEl = document.getElementById('detail-priority');
    priorityEl.textContent = priorityLabels[request.priority] || request.priority;
    priorityEl.className = `request-priority-badge priority-${request.priority}`;
    
    const statusEl = document.getElementById('detail-status');
    statusEl.textContent = statusLabels[request.status] || request.status;
    statusEl.className = `request-status-badge status-${request.status}`;
    
    document.getElementById('detail-author').textContent = `Par ${request.createdByName || 'Inconnu'}`;
    document.getElementById('detail-date').textContent = request.createdAt ? this.formatDate(request.createdAt) : '';
    document.getElementById('detail-description').textContent = request.description;
    
    // Setup admin controls
    this.setupDetailAdminControls(request);
    
    // Load comments
    this.loadComments(requestId);
    
    // Show modal
    if (this.detailModal) {
      this.detailModal.classList.add('show');
    }
  }

  setupDetailAdminControls(request) {
    const isAdmin = this.currentUserData.role === 'admin';
    const isSystemAdmin = this.currentUserData.isSystemAdmin === true;
    
    const adminControls = document.getElementById('admin-controls');
    const statusControlGroup = document.getElementById('status-control-group');
    
    if (isAdmin) {
      // Show admin controls
      if (adminControls) {
        adminControls.style.display = 'block';
      }
      
      // Set current values
      const prioritySelect = document.getElementById('admin-priority');
      if (prioritySelect) {
        prioritySelect.value = request.priority;
      }
      
      // System admin can change status
      if (isSystemAdmin && statusControlGroup) {
        statusControlGroup.style.display = 'block';
        const statusSelect = document.getElementById('admin-status');
        if (statusSelect) {
          statusSelect.value = request.status;
        }
      } else if (statusControlGroup) {
        statusControlGroup.style.display = 'none';
      }
    } else {
      if (adminControls) {
        adminControls.style.display = 'none';
      }
    }
  }

  closeDetailModal() {
    if (this.detailModal) {
      this.detailModal.classList.remove('show');
    }
    
    // Unsubscribe from comments listener
    if (this.unsubscribeComments) {
      this.unsubscribeComments();
      this.unsubscribeComments = null;
    }
    
    this.currentRequestId = null;
  }

  async saveAdminChanges() {
    if (!this.currentRequestId) return;
    
    const isSystemAdmin = this.currentUserData.isSystemAdmin === true;
    
    const updates = {
      priority: document.getElementById('admin-priority').value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Only system admin can change status
    if (isSystemAdmin) {
      updates.status = document.getElementById('admin-status').value;
    }
    
    try {
      await this.db.collection('requests').doc(this.currentRequestId).update(updates);
      this.showSuccess('Modifications enregistrées');
      
      // Update badges in modal
      const request = this.allRequests.find(r => r.id === this.currentRequestId);
      if (request) {
        request.priority = updates.priority;
        if (updates.status) request.status = updates.status;
        this.setupDetailAdminControls(request);
      }
      
    } catch (error) {
      console.error('Error saving admin changes:', error);
      this.showError('Erreur lors de l\'enregistrement');
    }
  }

  // ========================================
  // COMMENTS
  // ========================================

  loadComments(requestId) {
    // Unsubscribe from previous listener
    if (this.unsubscribeComments) {
      this.unsubscribeComments();
    }
    
    this.unsubscribeComments = this.db.collection('requests')
      .doc(requestId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        (snapshot) => {
          const comments = [];
          snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
          });
          this.renderComments(comments);
        },
        (error) => {
          console.error('Error loading comments:', error);
        }
      );
  }

  renderComments(comments) {
    const countEl = document.getElementById('comments-count');
    if (countEl) {
      countEl.textContent = `(${comments.length})`;
    }
    
    if (!this.commentsList) return;
    
    if (comments.length === 0) {
      this.commentsList.innerHTML = `
        <div class="comments-empty">
          Aucun commentaire pour le moment
        </div>
      `;
      return;
    }
    
    this.commentsList.innerHTML = comments.map(comment => this.createCommentCard(comment)).join('');
    
    // Scroll to bottom
    this.commentsList.scrollTop = this.commentsList.scrollHeight;
  }

  createCommentCard(comment) {
    const date = comment.createdAt ? this.formatDate(comment.createdAt) : '';
    
    let roleClass = '';
    let roleBadge = '';
    
    if (comment.authorRole === 'system_admin') {
      roleClass = 'comment-system-admin';
      roleBadge = '<span class="comment-role-badge role-system-admin">Sys Admin</span>';
    } else if (comment.authorRole === 'admin') {
      roleClass = 'comment-admin';
      roleBadge = '<span class="comment-role-badge role-admin">Admin</span>';
    }
    
    return `
      <div class="comment-card ${roleClass}">
        <div class="comment-header">
          <span class="comment-author">
            ${this.escapeHtml(comment.authorName || 'Inconnu')}
            ${roleBadge}
          </span>
          <span class="comment-date">${date}</span>
        </div>
        <p class="comment-text">${this.escapeHtml(comment.text)}</p>
      </div>
    `;
  }

  async submitComment() {
    if (!this.currentRequestId) return;
    
    const commentInput = document.getElementById('new-comment');
    const text = commentInput?.value.trim();
    
    if (!text) {
      this.showError('Veuillez entrer un commentaire');
      return;
    }
    
    const submitBtn = document.getElementById('submit-comment');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi...';
    }
    
    try {
      // Determine author role
      let authorRole = 'user';
      if (this.currentUserData.isSystemAdmin === true) {
        authorRole = 'system_admin';
      } else if (this.currentUserData.role === 'admin') {
        authorRole = 'admin';
      }
      
      const commentData = {
        text,
        authorId: this.currentUser.uid,
        authorName: this.currentUserData.name || this.currentUser.email,
        authorRole,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Add comment to subcollection
      await this.db.collection('requests')
        .doc(this.currentRequestId)
        .collection('comments')
        .add(commentData);
      
      // Update comment count on request
      await this.db.collection('requests').doc(this.currentRequestId).update({
        commentCount: firebase.firestore.FieldValue.increment(1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Clear input
      if (commentInput) {
        commentInput.value = '';
      }
      
    } catch (error) {
      console.error('Error submitting comment:', error);
      this.showError('Erreur lors de l\'envoi du commentaire');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Envoyer';
      }
    }
  }

  // ========================================
  // UTILITIES
  // ========================================

  formatDate(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    const now = new Date();
    const diff = now - date;
    
    // Less than 24 hours: show relative time
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      if (hours < 1) {
        const minutes = Math.floor(diff / (60 * 1000));
        return minutes <= 1 ? 'À l\'instant' : `Il y a ${minutes} min`;
      }
      return `Il y a ${hours}h`;
    }
    
    // Otherwise show date
    return date.toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message, elementId = null) {
    if (elementId) {
      const el = document.getElementById(elementId);
      if (el) {
        el.textContent = message;
        el.style.display = 'block';
      }
    } else {
      // Use a toast or alert
      alert(message);
    }
  }

  hideError(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      el.style.display = 'none';
    }
  }

  showSuccess(message) {
    // Simple alert for now - could be replaced with toast
    alert(message);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new RequestsManager();
});