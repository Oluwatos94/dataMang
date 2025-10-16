// Background script for PDM extension
// Handles service worker functionality and extension lifecycle

import { MessageHandler } from '../utils/messaging';
import { DataManager } from '../utils/data';
import { PermissionManager } from '../utils/permissions';
import { IdentityManager } from '../utils/identity';
import { NillionManager } from '../utils/nillion';


// Keep service worker alive
const KEEP_ALIVE_INTERVAL = 20000;
setInterval(() => {
  // Ping to keep service worker alive
}, KEEP_ALIVE_INTERVAL);

let offscreenPromise: Promise<void> | null = null;

async function hasOffscreenDocument() {
    // @ts-ignore
    if (chrome.runtime.getContexts) {
        const contexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL('offscreen.html')]
        });
        return !!contexts && contexts.length > 0;
    } else {
        // Fallback for older versions
        const clients = await self.clients.matchAll();
        return clients.some(client => client.url.endsWith('/offscreen.html'));
    }
}

async function setupOffscreenDocument() {
    if (offscreenPromise) {
        return offscreenPromise;
    }

    offscreenPromise = new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Offscreen document setup timed out'));
        }, 10000); // 10 second timeout

        try {
            if (await hasOffscreenDocument()) {
                // Ping the document to see if it's responsive
                try {
                    await chrome.runtime.sendMessage({ type: 'PING_OFFSCREEN' });
                    clearTimeout(timeout);
                    return resolve();
                } catch (e) {
                    // The document exists but is not responsive. Close it and create a new one.
                    await chrome.offscreen.closeDocument();
                }
            }

            // Listen for the OFFSCREEN_READY message
            const readyListener = (message: any) => {
                if (message.type === 'OFFSCREEN_READY') {
                    clearTimeout(timeout);
                    chrome.runtime.onMessage.removeListener(readyListener);
                    resolve();
                }
            };
            chrome.runtime.onMessage.addListener(readyListener);

            // Create the offscreen document
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['DOM_SCRAPING'],
                justification: 'To make network requests to the Nillion server.'
            });
        } catch (error) {
            clearTimeout(timeout);
            reject(error);
        }
    });

    // Clear the promise when it's settled
    offscreenPromise.finally(() => {
        offscreenPromise = null;
    });

    return offscreenPromise;
}


/**
 * Send API call request to offscreen document
 */
async function callOffscreenApi(endpoint: string, method: string, body?: any): Promise<any> {
  await setupOffscreenDocument();

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'OFFSCREEN_API_CALL',
        payload: { endpoint, method, body },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response) {
          reject(new Error('No response from offscreen document'));
          return;
        }
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Unknown error from offscreen document'));
        }
      }
    );
  });
}

// Export for use by NillionManager
(globalThis as any).__callOffscreenApi = callOffscreenApi;

// Rate limiter for preventing abuse
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly MAX_REQUESTS = 50; // Max requests per window
  private readonly WINDOW_MS = 60000; // 1 minute window

  isAllowed(origin: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(origin) || [];

    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < this.WINDOW_MS);

    if (validTimestamps.length >= this.MAX_REQUESTS) {
      console.warn(`PDM: Rate limit exceeded for origin: ${origin}`);
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(origin, validTimestamps);
    return true;
  }

  clear(origin: string) {
    this.requests.delete(origin);
  }
}

const rateLimiter = new RateLimiter();

// Initialize managers
const messageHandler = MessageHandler.getInstance();
const dataManager = DataManager.getInstance();
const permissionManager = PermissionManager.getInstance();
const identityManager = IdentityManager.getInstance();
const nillionManager = NillionManager.getInstance();

// Session management for Nillion password
let sessionPassword: string | null = null;
let sessionInitialized = false;
let lastActivityTime: number = Date.now();
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

// Update last activity time on any action
function updateActivityTime() {
  lastActivityTime = Date.now();
}

// Check if session has expired due to inactivity
function isSessionExpired(): boolean {
  return Date.now() - lastActivityTime > SESSION_TIMEOUT;
}

// Keep session alive - persist in chrome.storage.session
async function saveSessionState() {
  if (sessionPassword && sessionInitialized) {
    await chrome.storage.session.set({
      pdm_session_active: true,
      pdm_session_password: sessionPassword,
      pdm_last_activity: lastActivityTime
    });
  }
}

async function restoreSessionState(): Promise<boolean> {
  try {
    const session = await chrome.storage.session.get(['pdm_session_active', 'pdm_session_password', 'pdm_last_activity']);
    if (session.pdm_session_active && session.pdm_session_password) {
      // Check if session expired due to inactivity
      if (session.pdm_last_activity) {
        const timeSinceLastActivity = Date.now() - session.pdm_last_activity;
        if (timeSinceLastActivity > SESSION_TIMEOUT) {
          await lockSession();
          return false;
        }
        lastActivityTime = session.pdm_last_activity;
      }
      return await initializeNillionSession(session.pdm_session_password);
    }
  } catch (error) {
    console.error('[Background] Failed to restore session:', error);
  }
  return false;
}

async function initializeNillionSession(password: string): Promise<boolean> {
  try {
    await nillionManager.initialize(password);
    sessionPassword = password;
    sessionInitialized = true;

    // Persist session
    await saveSessionState();

    // Also create a session in identityManager so getDID() works
    const userDid = nillionManager.getUserDid();
    if (userDid) {
      await identityManager.createSession(userDid);
    }

    return true;
  } catch (error) {
    console.error('[Background] Failed to initialize Nillion:', error);
    sessionPassword = null;
    sessionInitialized = false;
    return false;
  }
}

async function lockSession() {
  sessionPassword = null;
  sessionInitialized = false;
  await chrome.storage.session.remove(['pdm_session_active', 'pdm_session_password']);
  await identityManager.clearSession();
}

// Attempt to restore session on service worker wake-up
restoreSessionState().catch(console.error);

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {

  if (details.reason === 'install') {
    // First time installation
  } else if (details.reason === 'update') {
  }

  // Create offscreen document for network requests
  setupOffscreenDocument().catch(console.error);
});

// Handle offscreen document ready notification is now part of setupOffscreenDocument

// CONSOLIDATED MESSAGE LISTENER - Handle ALL messages in one place
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle credential check
  if (request.type === 'CHECK_CREDENTIALS') {
    (async () => {
      try {
        const stored = await chrome.storage.local.get('pdm_nillion_credentials');
        sendResponse({ hasCredentials: !!stored.pdm_nillion_credentials });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        sendResponse({ hasCredentials: false, error: errMsg });
      }
    })();
    return true; // Async response
  }

  // Handle credential storage
  if (request.type === 'STORE_CREDENTIALS') {
    (async () => {
      try {
        await identityManager.storeNillionCredentials(request.credentials, request.password);
        sendResponse({ success: true });
      } catch (error) {
        console.error('[Background] Error storing credentials:', error);
        const errMsg = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errMsg });
      }
    })();
    return true; // Async response
  }

  // ===== HANDLE PDM MESSAGES FROM CONTENT SCRIPTS =====
  // DEBUG: Log ALL messages to see what we're receiving


  // Only handle PDM messages
  if (request.type !== 'PDM_MESSAGE') {
    return false; // Important to return false for messages we don't handle
  }


  // Validate sender has URL (tab info may be missing for file:// URLs)
  if (!sender.url) {
    console.error('[Background] Invalid sender - missing URL');
    return false;
  }

  // Allow messages from popup, but reject from other extension pages
  if (sender.url && sender.url.startsWith('chrome-extension://')) {
    // Check if it's from popup
    if (!sender.url.includes('/popup.html')) {
      console.error('[Background] Rejected message from non-popup extension page');
      return false;
    }
  }

  // Log sender info for debugging
  if (sender.tab?.id) {
  }

  // Rate limiting check
  const origin = request.payload?.origin || new URL(sender.url).origin;
  if (!rateLimiter.isAllowed(origin)) {
    console.warn('[Background] Rate limit exceeded for:', origin);
    sendResponse({
      type: 'PDM_RESPONSE',
      payload: {
        id: request.payload.id,
        error: 'Rate limit exceeded. Please try again later.',
        timestamp: Date.now()
      }
    });
    return true;
  }

  // Process the message asynchronously
  handlePDMMessage(request.payload, sender)
    .then((response) => {
      sendResponse({
        type: 'PDM_RESPONSE',
        payload: {
          id: request.payload.id,
          data: response,
          timestamp: Date.now()
        }
      });
    })
    .catch((error: any) => {
      console.error('[Background] Error processing PDM message:', error);
      sendResponse({
        type: 'PDM_RESPONSE',
        payload: {
          id: request.payload.id,
          error: error.message || 'Unknown error',
          timestamp: Date.now()
        }
      });
    });

  return true;
});

/**
 * Handle PDM messages from content scripts
 */
async function handlePDMMessage(message: any, sender: chrome.runtime.MessageSender): Promise<any> {
  const { action, data, origin } = message;

  // Check for session expiration on any action (except unlock)
  if (action !== 'unlock' && action !== 'is_unlocked' && sessionInitialized && isSessionExpired()) {
    await lockSession();
    throw new Error('Session expired due to inactivity. Please unlock again.');
  }

  // Update activity time on each action
  if (sessionInitialized) {
    updateActivityTime();
    await saveSessionState();
  }

  try {
    let responseData: any;

    switch (action) {
      case 'ping':
        responseData = {
          status: 'pong',
          timestamp: Date.now(),
          version: chrome.runtime.getManifest().version
        };
        break;

      case 'get_identity':
        // Get DID from nillionManager (after unlock) or identityManager (legacy)
        let did = nillionManager.getUserDid();
        if (!did) {
          did = await identityManager.getDID();
        }
        responseData = { did, origin };
        break;

      case 'store_data':
        // Ensure the session is unlocked before storing data
        if (!nillionManager.isInitialized()) {
          throw new Error('Session is locked. Please unlock your wallet first.');
        }


        // Pass the entire data object including metadata with collectionId
        const documentId = await nillionManager.storeData(data, data.metadata || {});
        responseData = { documentId, success: true };
        break;

      case 'retrieve_data':
        // Ensure the session is unlocked
        if (!nillionManager.isInitialized()) {
          throw new Error('Session is locked. Please unlock your wallet first.');
        }

        const { documentId: retrieveId, collectionId: retrieveCollection } = data;
        const document = await nillionManager.retrieveData(retrieveId, retrieveCollection || 'pdm_demo_collection');
        responseData = { document };
        break;

      case 'delete_data':
        // Ensure the session is unlocked
        if (!nillionManager.isInitialized()) {
          throw new Error('Session is locked. Please unlock your wallet first.');
        }

        const { documentId: deleteId, collectionId: deleteCollection } = data;
        await nillionManager.deleteData(deleteId, deleteCollection || 'pdm_demo_collection');
        responseData = { success: true };
        break;

      case 'search_data':
        const { query } = data;
        const results = await dataManager.searchDocuments(query);
        responseData = { results, count: results.length };
        break;

      case 'share_data':
        const { documentId: shareId, targetDid, permissions } = data;
        await dataManager.shareDocument(shareId, targetDid, permissions);
        responseData = { success: true };
        break;

      case 'request_permission':
        const { resourceId, permissions: reqPermissions, reason, dataTypes, requestedPermissions } = data;

        // For now, auto-approve. In production, this would show a popup
        const requestId = await permissionManager.requestPermission(
          resourceId || 'default',
          requestedPermissions || reqPermissions || ['read'],
          reason || 'Access requested'
        );

        responseData = { requestId, success: true, approved: true };
        break;

      case 'check_permission':
        const { resourceId: checkId, permission } = data;
        const userDid = await identityManager.getDID();
        if (!userDid) throw new Error('No active session');

        const hasPermission = await permissionManager.hasPermission(
          checkId, userDid, permission
        );
        responseData = { hasPermission };
        break;

      case 'get_user_data':
        // Ensure the session is unlocked
        if (!nillionManager.isInitialized()) {
          throw new Error('Session is locked. Please unlock your wallet first.');
        }

        // Use NillionManager which has localStorage fallback
        const userDocuments = await nillionManager.listUserData();
        responseData = { documents: userDocuments, count: userDocuments.length };
        break;


      case 'grant_permission':
        const { dataId: grantDataId, collectionId: grantCollectionId, appDid, permissions: grantPerms } = data;
        await nillionManager.grantPermission(grantDataId, grantCollectionId, appDid, grantPerms);
        responseData = { success: true, message: `Granted ${grantPerms.join(', ')} to ${appDid}` };
        break;

      case 'revoke_permission':
        const { dataId: revokeDataId, collectionId: revokeCollectionId, appDid: revokeAppDid, permissionId } = data;
        await nillionManager.revokePermission(revokeDataId, revokeCollectionId, revokeAppDid, permissionId);
        responseData = { success: true, message: `Revoked access from ${revokeAppDid}` };
        break;

      case 'list_permissions':
        // Ensure the session is unlocked
        if (!nillionManager.isInitialized()) {
          throw new Error('Session is locked. Please unlock your wallet first.');
        }

        const allPermissions = await nillionManager.listPermissions();
        responseData = { permissions: allPermissions, count: allPermissions.length };
        break;

      case 'connect':
        responseData = await handleConnect(origin, data, sender);
        break;

      case 'disconnect':
        responseData = await handleDisconnect(origin);
        break;

      case 'unlock':
        // Initialize Nillion session with user's password
        const { password: unlockPassword } = data;
        if (!unlockPassword) throw new Error('Password required to unlock');

        const unlockSuccess = await initializeNillionSession(unlockPassword);
        if (!unlockSuccess) throw new Error('Failed to unlock - invalid password or credentials not set');

        // Reset activity time on unlock
        updateActivityTime();
        await saveSessionState();

        responseData = { unlocked: true, message: 'Nillion session initialized successfully' };
        break;

      case 'lock':
        // Clear Nillion session
        await lockSession();
        responseData = { locked: true, message: 'Nillion session cleared' };
        break;

      case 'is_unlocked':
        // Check if Nillion session is active
        responseData = { unlocked: sessionInitialized, nillionReady: nillionManager.isInitialized() };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return responseData;
  } catch (error: any) {
    console.error(`Error executing action ${action}:`, error);
    throw error;
  }
}

/**
 * Handle connection requests from web applications
 */
async function handleConnect(origin: string, connectionData: any, sender: chrome.runtime.MessageSender): Promise<any> {

  // Store origin configuration
  await messageHandler.addAllowedOrigin(
    origin,
    connectionData.requestedPermissions || ['read'],
    connectionData.requestedActions || ['ping', 'get_identity', 'store_data', 'retrieve_data'],
    connectionData.rateLimit
  );

  return {
    connected: true,
    origin: origin,
    tabId: sender.tab?.id,
    permissions: connectionData.requestedPermissions || ['read'],
    allowedActions: connectionData.requestedActions || ['ping', 'get_identity']
  };
}

/**
 * Handle disconnection requests
 */
async function handleDisconnect(origin: string): Promise<any> {

  await messageHandler.removeAllowedOrigin(origin);

  return {
    disconnected: true,
    origin: origin
  };
}

// Listen for tab updates to clean up disconnected origins
chrome.tabs.onRemoved.addListener((tabId) => {
  // Could clean up any tab-specific state here
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  // Create offscreen document for network requests
  setupOffscreenDocument().catch(console.error);
});

export {};