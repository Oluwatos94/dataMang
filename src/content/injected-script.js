// This script runs in the page context and creates the window.PDM API
(function() {
  'use strict';

  // PDM API for web applications
  window.PDM = {
    version: '1.0.0',

    /**
     * Request access to user data
     */
    async requestAccess(options) {
      return window.PDM._sendMessage('request_permission', {
        dataTypes: options.dataTypes || [],
        reason: options.reason || 'No reason provided',
        requestedPermissions: options.permissions || ['read']
      });
    },

    /**
     * Store data in PDM
     */
    async storeData(data) {
      return window.PDM._sendMessage('store_data', {
        title: data.title || 'Untitled',
        content: data.content,
        type: data.type || 'text',
        tags: data.tags || [],
        metadata: data.metadata || {}
      });
    },

    /**
     * Retrieve data from PDM
     */
    async retrieveData(documentId) {
      return window.PDM._sendMessage('retrieve_data', { documentId });
    },

    /**
     * Update existing data
     */
    async updateData(documentId, updates) {
      return window.PDM._sendMessage('update_data', { documentId, updates });
    },

    /**
     * Delete data from PDM
     */
    async deleteData(documentId) {
      return window.PDM._sendMessage('delete_data', { documentId });
    },

    /**
     * Search user's documents
     */
    async searchData(query) {
      return window.PDM._sendMessage('search_data', { query });
    },

    /**
     * Share data with another user
     */
    async shareData(documentId, targetDid, permissions) {
      return window.PDM._sendMessage('share_data', { documentId, targetDid, permissions });
    },

    /**
     * Get current user's DID
     */
    async getIdentity() {
      return window.PDM._sendMessage('get_identity', {});
    },

    /**
     * Check if user has granted permission
     */
    async checkPermission(resourceId, permission) {
      return window.PDM._sendMessage('check_permission', { resourceId, permission });
    },

    /**
     * Get all user's documents
     */
    async getUserData(options = {}) {
      return window.PDM._sendMessage('get_user_data', {
        limit: options.limit || 50,
        offset: options.offset || 0
      });
    },

    /**
     * Create a new collection for user data
     */
    async createCollection(name, schema) {
      return window.PDM._sendMessage('create_collection', { name, schema });
    },

    /**
     * List user's collections
     */
    async listCollections() {
      return window.PDM._sendMessage('list_collections', {});
    },

    /**
     * Grant permission to an app/user
     */
    async grantPermission(dataId, collectionId, appDid, permissions) {
      return window.PDM._sendMessage('grant_permission', { dataId, collectionId, appDid, permissions });
    },

    /**
     * Revoke permission from an app/user
     */
    async revokePermission(dataId, collectionId, appDid) {
      return window.PDM._sendMessage('revoke_permission', { dataId, collectionId, appDid });
    },

    /**
     * Connect to PDM
     */
    async connect(config = {}) {
      return window.PDM._sendMessage('connect', {
        requestedPermissions: config.permissions || ['read'],
        requestedActions: config.actions || ['ping', 'get_identity'],
        rateLimit: config.rateLimit
      });
    },

    /**
     * Disconnect from PDM
     */
    async disconnect() {
      return window.PDM._sendMessage('disconnect', {});
    },

    /**
     * Unlock Nillion session with password (required before using storage features)
     * @param {string} password - The encryption password you set in settings
     * @returns {Promise<Object>} - Result with unlocked status
     */
    async unlock(password) {
      if (!password) {
        throw new Error('Password is required to unlock');
      }
      return window.PDM._sendMessage('unlock', { password });
    },

    /**
     * Lock Nillion session (clears password from memory)
     * @returns {Promise<Object>} - Result with locked status
     */
    async lock() {
      return window.PDM._sendMessage('lock', {});
    },

    /**
     * Check if Nillion session is unlocked
     * @returns {Promise<Object>} - Object with unlocked and nillionReady status
     */
    async isUnlocked() {
      return window.PDM._sendMessage('is_unlocked', {});
    },

    /**
     * Ping PDM to check if extension is installed
     */
    async ping() {
      return window.PDM._sendMessage('ping', {});
    },

    /**
     * Internal method to send messages to content script
     * @private
     */
    _sendMessage(action, data) {
      return new Promise((resolve, reject) => {
        const messageId = 'pdm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const timeout = setTimeout(() => {
          reject(new Error('PDM request timeout'));
        }, 30000);

        const handleResponse = (event) => {
          // Validate origin - only accept messages from same origin (skip for file:// URLs)
          const isFileProtocol = window.location.protocol === 'file:';
          if (!isFileProtocol && event.origin !== window.location.origin) return;

          if (event.data && event.data.type === 'PDM_RESPONSE' && event.data.id === messageId) {
            clearTimeout(timeout);
            window.removeEventListener('message', handleResponse);

            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve(event.data.data);
            }
          }
        };

        window.addEventListener('message', handleResponse);

        // Use '*' for file:// URLs since origin is 'null'
        const targetOrigin = window.location.protocol === 'file:' ? '*' : window.location.origin;

        window.postMessage({
          type: 'PDM_REQUEST',
          id: messageId,
          action: action,
          data: data,
          timestamp: Date.now(),
          origin: window.location.origin
        }, targetOrigin);
      });
    }
  };

  // Notify that PDM is ready
  window.dispatchEvent(new CustomEvent('PDM_READY', { detail: { version: window.PDM.version } }));

  console.log('PDM API injected and ready');
})();
