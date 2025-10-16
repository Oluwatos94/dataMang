// Offscreen Document for Network Requests
// This document can make fetch calls to external URLs, bypassing service worker CSP restrictions


const SERVER_URL = process.env.PDM_SERVER_URL || 'http://localhost:3000';
const TIMEOUT = 30000;


// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'PING_OFFSCREEN') {
    sendResponse({ ready: true });
    return true;
  }

  if (message.type !== 'OFFSCREEN_API_CALL') {
    return false;
  }

  // Handle API call asynchronously
  handleApiCall(message.payload)
    .then((result) => {
      sendResponse({ success: true, data: result });
    })
    .catch((error) => {
      console.error('[Offscreen] API call failed:', error);
      sendResponse({ success: false, error: error.message });
    });

  return true; // Keep channel open for async response
});

/**
 * Make actual HTTP request to backend server
 */
async function handleApiCall(payload: {
  endpoint: string;
  method: string;
  body?: any;
}): Promise<any> {
  const { endpoint, method, body } = payload;
  const url = `${SERVER_URL}${endpoint}`;


  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${TIMEOUT}ms`);
    }

    throw new Error(`Network request failed: ${error.message}`);
  }
}

// Wait for DOM to be fully loaded before notifying service worker
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', sendReadyMessage);
} else {
  // DOM already loaded
  sendReadyMessage();
}

function sendReadyMessage() {
  // Give the extension a moment to set up listeners
  setTimeout(() => {
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_READY',
      timestamp: Date.now()
    }).then(() => {
    }).catch((error) => {
      console.error('[Offscreen] Failed to send OFFSCREEN_READY message:', error);
    });
  }, 100); // Small delay to ensure background listener is registered
}

export {};