// Content script for PDM extension
// Handles communication between web pages and the extension

import type { PDMMessage } from '../utils/messaging';


interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: number;
}

class PDMContentScript {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private contextInvalidated = false;

  constructor() {
    this.init();
    this.checkExtensionContext();
  }

  private checkExtensionContext() {
    // Periodically check if extension context is still valid
    setInterval(() => {
      if (!chrome.runtime?.id && !this.contextInvalidated) {
        this.contextInvalidated = true;
        this.showReloadBanner();
      }
    }, 5000);
  }

  private showReloadBanner() {
    // Create a visual banner to inform user
    const banner = document.createElement('div');
    banner.id = 'pdm-reload-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff9800;
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    banner.innerHTML = `
      ⚠️ Private Data Manager extension was updated. Please <a href="javascript:location.reload()" style="color: white; text-decoration: underline; cursor: pointer;">refresh this page</a> to continue.
    `;
    document.body.appendChild(banner);
    console.warn('[PDM] Extension context invalidated - page refresh required');
  }

  private init() {
    // Listen for messages from the injected page script
    window.addEventListener('message', (event) => {
      this.handlePageMessage(event);
    });

    // Listen for responses from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleBackgroundResponse(message);
      return true; // Keep channel open for async response
    });

    // Inject the PDM API into the page
    this.injectAPI();

  }

  private injectAPI() {
    // Use a separate script file to avoid CSP violations
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected-script.js');
    script.onload = () => {
      script.remove(); // Clean up after injection
    };

    // Inject at document_start to ensure it's available early
    (document.head || document.documentElement).appendChild(script);
  }

  private handlePageMessage(event: MessageEvent) {
    // Only accept messages from same window
    if (event.source !== window) return;

    // Validate origin matches the page origin (skip for file:// URLs)
    const isFileProtocol = window.location.protocol === 'file:';
    if (!isFileProtocol && event.origin !== window.location.origin) {
      console.warn('PDM: Rejected message from invalid origin:', event.origin);
      return;
    }

    const message = event.data;

    // Only handle PDM requests
    if (!message || message.type !== 'PDM_REQUEST') return;

    // Validate message structure
    if (!message.id || !message.action || !message.origin) {
      console.warn('PDM: Rejected malformed message:', message);
      return;
    }

    console.log('Content script received message from page:', message);

    // Forward to background script
    this.forwardToBackground(message);
  }

  private forwardToBackground(message: any) {
    const messageId = message.id;

    // Create timeout for this request
    const timeout = window.setTimeout(() => {
      const pending = this.pendingRequests.get(messageId);
      if (pending) {
        console.error('[Content] Request timeout for:', messageId);
        this.sendErrorToPage(messageId, 'Request timeout');
        this.pendingRequests.delete(messageId);
      }
    }, this.REQUEST_TIMEOUT);

    // Store pending request
    this.pendingRequests.set(messageId, {
      resolve: (data) => this.sendResponseToPage(messageId, data),
      reject: (error) => this.sendErrorToPage(messageId, error),
      timeout
    });

    // Send to background script and handle response via sendResponse callback
    chrome.runtime.sendMessage(
      {
        type: 'PDM_MESSAGE',
        payload: {
          id: messageId,
          action: message.action,
          data: message.data || {},
          origin: message.origin || window.location.origin
        }
      },
      (response) => {
        // Handle the response from background

        // Check for runtime errors
        if (chrome.runtime.lastError) {
          console.error('[Content] Runtime error:', chrome.runtime.lastError);
          const pending = this.pendingRequests.get(messageId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(messageId);
            this.sendErrorToPage(messageId, chrome.runtime.lastError.message || 'Extension error');
          }
          return;
        }

        // Process the response
        const pending = this.pendingRequests.get(messageId);
        if (!pending) {
          console.error('[Content] No pending request for:', messageId);
          return;
        }

        clearTimeout(pending.timeout);
        this.pendingRequests.delete(messageId);

        // Check if it's a PDM_RESPONSE
        if (response && response.type === 'PDM_RESPONSE') {
          if (response.payload.error) {
            this.sendErrorToPage(messageId, response.payload.error);
          } else {
            this.sendResponseToPage(messageId, response.payload.data);
          }
        } else {
          console.error('[Content] Invalid response format:', response);
          this.sendErrorToPage(messageId, 'Invalid response from extension');
        }
      }
    );
  }

  private handleBackgroundResponse(message: any) {

    if (message.type !== 'PDM_RESPONSE') {
      return;
    }

    const messageId = message.payload?.id;
    if (!messageId) {
      console.error('[Content] No message ID in response');
      return;
    }

    const pending = this.pendingRequests.get(messageId);
    if (!pending) {
      console.error('[Content] No pending request for ID:', messageId);
      return;
    }


    // Clear timeout
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(messageId);

    // Send response to page
    if (message.payload.error) {
      this.sendErrorToPage(messageId, message.payload.error);
    } else {
      this.sendResponseToPage(messageId, message.payload.data);
    }
  }

  private sendResponseToPage(messageId: string, data: any) {
    // Use '*' for file:// URLs since origin is 'null'
    const targetOrigin = window.location.protocol === 'file:' ? '*' : window.location.origin;

    window.postMessage({
      type: 'PDM_RESPONSE',
      id: messageId,
      data: data,
      timestamp: Date.now()
    }, targetOrigin);
  }

  private sendErrorToPage(messageId: string, error: string) {
    // Use '*' for file:// URLs since origin is 'null'
    const targetOrigin = window.location.protocol === 'file:' ? '*' : window.location.origin;

    window.postMessage({
      type: 'PDM_RESPONSE',
      id: messageId,
      error: error,
      timestamp: Date.now()
    }, targetOrigin);
  }
}

// Initialize content script
new PDMContentScript();

export {};