# postMessage Communication Architecture for PDM

## 🔄 Communication Overview

The PDM extension uses a sophisticated postMessage-based communication system to enable secure interaction between web applications and the extension while maintaining strict security boundaries.

## 🏗 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Application                         │
│  ┌─────────────────────────────────────────────────────────┤
│  │              window.PDM API                             │
│  │  - requestAccess()                                      │
│  │  - getData()                                           │
│  │  - createDocument()                                    │
│  │  - addEventListener()                                  │
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
                              │ postMessage
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Content Script                           │
│  ┌─────────────────────────────────────────────────────────┤
│  │            Message Validation                           │
│  │  - Origin verification                                  │
│  │  - Schema validation                                   │
│  │  - Rate limiting                                       │
│  │  - Signature verification                              │
│  └─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┤
│  │            API Injection                               │
│  │  - Inject window.PDM                                  │
│  │  - Event listeners                                    │
│  │  - Response handling                                  │
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
                              │ chrome.runtime.sendMessage
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Background Script                         │
│  ┌─────────────────────────────────────────────────────────┤
│  │           Permission Manager                            │
│  │  - User consent handling                               │
│  │  - Permission validation                               │
│  │  - Access control                                      │
│  └─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┤
│  │           Data Manager                                 │
│  │  - Document operations                                 │
│  │  - Nillion integration                                │
│  │  - Encryption/decryption                              │
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

## 📡 Message Flow Architecture

### **1. API Injection Layer**

```typescript
// Content Script: API Injection
class PDMAPIInjection {
  constructor() {
    this.injectAPI();
    this.setupMessageListener();
  }

  private injectAPI(): void {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        const PDM_EXTENSION_ID = '${chrome.runtime.id}';
        const messageQueue = new Map();
        let messageCounter = 0;

        // Public API exposed to web applications
        window.PDM = {
          // Core data operations
          async requestAccess(documentId, accessLevel) {
            return this._sendMessage('REQUEST_ACCESS', { documentId, accessLevel });
          },

          async getData(documentId) {
            return this._sendMessage('GET_DATA', { documentId });
          },

          async createDocument(name, content, options = {}) {
            return this._sendMessage('CREATE_DOCUMENT', { name, content, options });
          },

          async updateDocument(documentId, content) {
            return this._sendMessage('UPDATE_DOCUMENT', { documentId, content });
          },

          // Permission management
          async checkPermission(documentId) {
            return this._sendMessage('CHECK_PERMISSION', { documentId });
          },

          async requestBulkAccess(requests) {
            return this._sendMessage('REQUEST_BULK_ACCESS', { requests });
          },

          // Event handling
          addEventListener(event, handler) {
            this._addEventListener(event, handler);
          },

          removeEventListener(event, handler) {
            this._removeEventListener(event, handler);
          },

          // Utility functions
          isAvailable() {
            return typeof window.PDM !== 'undefined';
          },

          getVersion() {
            return '1.0.0';
          },

          getCapabilities() {
            return ['storage', 'permissions', 'encryption', 'multi-node'];
          },

          // Internal message handling
          async _sendMessage(type, payload) {
            return new Promise((resolve, reject) => {
              const messageId = ++messageCounter;
              const message = {
                id: messageId,
                type,
                payload,
                timestamp: Date.now(),
                origin: window.location.origin,
                source: 'PDM_WEB_API'
              };

              // Store promise handlers
              messageQueue.set(messageId, { resolve, reject });

              // Send to content script
              window.postMessage({
                target: 'PDM_CONTENT_SCRIPT',
                message
              }, '*');

              // Timeout handling
              setTimeout(() => {
                if (messageQueue.has(messageId)) {
                  messageQueue.delete(messageId);
                  reject(new Error('Request timeout'));
                }
              }, 30000); // 30 second timeout
            });
          },

          // Handle responses from content script
          _handleResponse(response) {
            const { id, success, data, error } = response;
            const handlers = messageQueue.get(id);

            if (handlers) {
              messageQueue.delete(id);
              if (success) {
                handlers.resolve(data);
              } else {
                handlers.reject(new Error(error.message));
              }
            }
          },

          // Event handling
          _eventHandlers: new Map(),

          _addEventListener(event, handler) {
            if (!this._eventHandlers.has(event)) {
              this._eventHandlers.set(event, new Set());
            }
            this._eventHandlers.get(event).add(handler);
          },

          _removeEventListener(event, handler) {
            if (this._eventHandlers.has(event)) {
              this._eventHandlers.get(event).delete(handler);
            }
          },

          _emitEvent(event, data) {
            if (this._eventHandlers.has(event)) {
              this._eventHandlers.get(event).forEach(handler => {
                try {
                  handler(data);
                } catch (error) {
                  console.error('PDM event handler error:', error);
                }
              });
            }
          }
        };

        // Listen for responses and events
        window.addEventListener('message', (event) => {
          if (event.data?.target === 'PDM_WEB_API') {
            if (event.data.type === 'RESPONSE') {
              window.PDM._handleResponse(event.data.message);
            } else if (event.data.type === 'EVENT') {
              window.PDM._emitEvent(event.data.event, event.data.data);
            }
          }
        });

        // Notify that PDM is ready
        window.dispatchEvent(new CustomEvent('PDMReady'));
      })();
    `;

    document.head.appendChild(script);
    document.head.removeChild(script);
  }
}
```

### **2. Message Validation Layer**

```typescript
// Content Script: Message Validation
class MessageValidator {
  private rateLimiter = new RateLimiter();
  private allowedOrigins = new Set<string>();

  async validateMessage(message: any, origin: string): Promise<ValidationResult> {
    const validations = [
      this.validateOrigin(origin),
      this.validateStructure(message),
      this.validateRateLimit(origin, message.type),
      this.validateSignature(message),
      this.validatePayload(message.type, message.payload)
    ];

    const results = await Promise.all(validations);
    const isValid = results.every(result => result.valid);

    return {
      valid: isValid,
      errors: results.filter(r => !r.valid).map(r => r.error),
      securityLevel: this.calculateSecurityLevel(message, origin)
    };
  }

  private validateOrigin(origin: string): ValidationResult {
    // Check against whitelist or use dynamic validation
    if (this.allowedOrigins.size > 0 && !this.allowedOrigins.has(origin)) {
      return { valid: false, error: 'Origin not allowed' };
    }

    // Validate origin format
    try {
      const url = new URL(origin);
      if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
        return { valid: false, error: 'Only HTTPS origins allowed' };
      }
    } catch {
      return { valid: false, error: 'Invalid origin format' };
    }

    return { valid: true };
  }

  private validateStructure(message: any): ValidationResult {
    const requiredFields = ['id', 'type', 'timestamp', 'origin', 'source'];

    for (const field of requiredFields) {
      if (!(field in message)) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    // Validate types
    if (typeof message.id !== 'number' ||
        typeof message.type !== 'string' ||
        typeof message.timestamp !== 'number') {
      return { valid: false, error: 'Invalid field types' };
    }

    // Validate timestamp (prevent replay attacks)
    const age = Date.now() - message.timestamp;
    if (age > 60000 || age < -5000) { // 1 minute max age, 5 second clock skew
      return { valid: false, error: 'Message timestamp invalid' };
    }

    return { valid: true };
  }

  private async validateRateLimit(origin: string, messageType: string): Promise<ValidationResult> {
    const key = `${origin}:${messageType}`;
    const allowed = await this.rateLimiter.checkLimit(key);

    if (!allowed) {
      return { valid: false, error: 'Rate limit exceeded' };
    }

    return { valid: true };
  }
}
```

### **3. Secure Communication Protocol**

```typescript
// Message Protocol Definition
interface PDMMessage {
  // Message identification
  id: number;
  type: MessageType;
  timestamp: number;

  // Security headers
  origin: string;
  source: 'PDM_WEB_API' | 'PDM_CONTENT_SCRIPT' | 'PDM_BACKGROUND';
  signature?: string;
  nonce?: string;

  // Message content
  payload: any;

  // Response correlation
  correlationId?: number;
  isResponse?: boolean;
}

interface PDMResponse {
  id: number;
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

type MessageType =
  | 'REQUEST_ACCESS'
  | 'GET_DATA'
  | 'CREATE_DOCUMENT'
  | 'UPDATE_DOCUMENT'
  | 'DELETE_DOCUMENT'
  | 'CHECK_PERMISSION'
  | 'REQUEST_BULK_ACCESS'
  | 'HEALTH_CHECK'
  | 'CAPABILITY_QUERY';
```

### **4. Content Script Message Handler**

```typescript
// Content Script: Main Message Handler
class ContentScriptMessageHandler {
  private validator = new MessageValidator();
  private pendingRequests = new Map<number, PendingRequest>();

  constructor() {
    this.setupMessageListener();
    this.setupBackgroundCommunication();
  }

  private setupMessageListener(): void {
    window.addEventListener('message', async (event) => {
      // Only process messages targeting our content script
      if (event.data?.target !== 'PDM_CONTENT_SCRIPT') return;

      const { message } = event.data;
      const origin = event.origin;

      try {
        // Validate message
        const validation = await this.validator.validateMessage(message, origin);
        if (!validation.valid) {
          this.sendErrorResponse(message.id, 'VALIDATION_ERROR', validation.errors.join(', '));
          return;
        }

        // Process message
        await this.processMessage(message, origin);

      } catch (error) {
        console.error('Content script message handling error:', error);
        this.sendErrorResponse(message.id, 'INTERNAL_ERROR', error.message);
      }
    });
  }

  private async processMessage(message: PDMMessage, origin: string): Promise<void> {
    // Store request context
    this.pendingRequests.set(message.id, {
      origin,
      timestamp: Date.now(),
      type: message.type
    });

    // Forward to background script
    const response = await chrome.runtime.sendMessage({
      type: 'PDM_API_REQUEST',
      origin,
      message
    });

    // Forward response back to web page
    this.sendResponse(message.id, response);
  }

  private sendResponse(messageId: number, response: any): void {
    window.postMessage({
      target: 'PDM_WEB_API',
      type: 'RESPONSE',
      message: {
        id: messageId,
        ...response,
        timestamp: Date.now()
      }
    }, '*');
  }

  private sendErrorResponse(messageId: number, code: string, message: string): void {
    this.sendResponse(messageId, {
      success: false,
      error: { code, message }
    });
  }
}
```

### **5. Background Script API Handler**

```typescript
// Background Script: API Request Handler
class BackgroundAPIHandler {
  private permissionManager = new PermissionManager();
  private dataManager = new DataManager();

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'PDM_API_REQUEST') {
        this.handleAPIRequest(request, sender).then(sendResponse);
        return true; // Indicates async response
      }
    });
  }

  private async handleAPIRequest(request: any, sender: chrome.runtime.MessageSender): Promise<any> {
    const { origin, message } = request;

    try {
      // Verify sender is our content script
      if (!this.isValidSender(sender)) {
        throw new Error('Invalid sender');
      }

      // Route message to appropriate handler
      switch (message.type) {
        case 'REQUEST_ACCESS':
          return await this.handleRequestAccess(message.payload, origin);

        case 'GET_DATA':
          return await this.handleGetData(message.payload, origin);

        case 'CREATE_DOCUMENT':
          return await this.handleCreateDocument(message.payload, origin);

        case 'CHECK_PERMISSION':
          return await this.handleCheckPermission(message.payload, origin);

        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message
        }
      };
    }
  }

  private async handleRequestAccess(payload: any, origin: string): Promise<any> {
    const { documentId, accessLevel } = payload;

    // Check if permission already exists
    const existingPermission = await this.permissionManager.checkAccess({
      appOrigin: origin,
      resourceId: documentId,
      requestedOperation: accessLevel
    });

    if (existingPermission.data?.granted) {
      return {
        success: true,
        data: {
          granted: true,
          accessLevel: existingPermission.data.accessLevel,
          expiresAt: existingPermission.data.expiresAt
        }
      };
    }

    // Request user consent
    const consent = await this.requestUserConsent({
      appOrigin: origin,
      resourceId: documentId,
      accessLevel,
      resourceType: 'document'
    });

    if (consent) {
      // Grant permission
      const permission = await this.permissionManager.grantPermission({
        appOrigin: origin,
        resourceId: documentId,
        resourceType: 'document',
        accessLevel
      });

      return {
        success: true,
        data: {
          granted: true,
          accessLevel,
          permissionId: permission.data?.id
        }
      };
    }

    return {
      success: true,
      data: {
        granted: false,
        reason: 'User denied access'
      }
    };
  }
}
```

## 🔒 Security Measures

### **1. Origin Validation**

```typescript
class OriginValidator {
  private trustedOrigins = new Set<string>();
  private originPatterns: RegExp[] = [];

  validateOrigin(origin: string): boolean {
    // Check exact matches
    if (this.trustedOrigins.has(origin)) return true;

    // Check pattern matches
    return this.originPatterns.some(pattern => pattern.test(origin));
  }

  addTrustedOrigin(origin: string): void {
    try {
      const url = new URL(origin);
      if (url.protocol === 'https:' || url.hostname === 'localhost') {
        this.trustedOrigins.add(origin);
      }
    } catch {
      throw new Error('Invalid origin format');
    }
  }
}
```

### **2. Rate Limiting**

```typescript
class RateLimiter {
  private limits = new Map<string, RateLimit>();

  async checkLimit(key: string): Promise<boolean> {
    const limit = this.limits.get(key) || this.createLimit(key);
    const now = Date.now();

    // Sliding window rate limiting
    limit.requests = limit.requests.filter(time => now - time < limit.windowMs);

    if (limit.requests.length >= limit.maxRequests) {
      return false;
    }

    limit.requests.push(now);
    this.limits.set(key, limit);
    return true;
  }

  private createLimit(key: string): RateLimit {
    return {
      requests: [],
      maxRequests: this.getMaxRequests(key),
      windowMs: this.getWindowMs(key)
    };
  }
}
```

### **3. Message Signing**

```typescript
class MessageSigner {
  async signMessage(message: PDMMessage): Promise<string> {
    const payload = JSON.stringify({
      id: message.id,
      type: message.type,
      timestamp: message.timestamp,
      origin: message.origin,
      payload: message.payload
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    const key = await this.getSigningKey();
    const signature = await crypto.subtle.sign('HMAC', key, data);

    return this.arrayBufferToBase64(signature);
  }

  async verifySignature(message: PDMMessage, signature: string): Promise<boolean> {
    try {
      const expectedSignature = await this.signMessage(message);
      return this.constantTimeCompare(signature, expectedSignature);
    } catch {
      return false;
    }
  }
}
```

## 📊 Performance Optimization

### **1. Message Batching**

```typescript
class MessageBatcher {
  private batch: PDMMessage[] = [];
  private batchTimeout: number | null = null;

  addMessage(message: PDMMessage): void {
    this.batch.push(message);

    if (this.batch.length >= 10) {
      this.flush();
    } else if (!this.batchTimeout) {
      this.batchTimeout = window.setTimeout(() => this.flush(), 100);
    }
  }

  private flush(): void {
    if (this.batch.length === 0) return;

    const messages = this.batch.splice(0);
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    this.processBatch(messages);
  }
}
```

### **2. Response Caching**

```typescript
class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 60000; // 1 minute

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

## 🧪 Testing Strategy

### **Communication Tests**

```typescript
describe('postMessage Communication', () => {
  test('should inject PDM API correctly', () => {
    const contentScript = new PDMAPIInjection();
    expect(window.PDM).toBeDefined();
    expect(window.PDM.requestAccess).toBeInstanceOf(Function);
  });

  test('should validate messages correctly', async () => {
    const validator = new MessageValidator();

    const validMessage = {
      id: 1,
      type: 'REQUEST_ACCESS',
      timestamp: Date.now(),
      origin: 'https://example.com',
      source: 'PDM_WEB_API',
      payload: { documentId: 'test' }
    };

    const result = await validator.validateMessage(validMessage, 'https://example.com');
    expect(result.valid).toBe(true);
  });

  test('should handle rate limiting', async () => {
    const rateLimiter = new RateLimiter();

    // First request should pass
    expect(await rateLimiter.checkLimit('test:REQUEST_ACCESS')).toBe(true);

    // Rapid requests should be limited
    for (let i = 0; i < 100; i++) {
      await rateLimiter.checkLimit('test:REQUEST_ACCESS');
    }

    expect(await rateLimiter.checkLimit('test:REQUEST_ACCESS')).toBe(false);
  });
});
```

## 📋 Implementation Checklist

### **Core Communication**
- [ ] ✅ API injection into web pages
- [ ] ✅ Message validation and sanitization
- [ ] ✅ Rate limiting implementation
- [ ] ✅ Origin verification
- [ ] ✅ Background script routing

### **Security Features**
- [ ] ✅ Message signing and verification
- [ ] ✅ Replay attack prevention
- [ ] ✅ HTTPS-only enforcement
- [ ] ✅ Content Security Policy compliance

### **Performance Features**
- [ ] ✅ Message batching for bulk operations
- [ ] ✅ Response caching
- [ ] ✅ Timeout handling
- [ ] ✅ Error recovery

### **Testing & Validation**
- [ ] ✅ Unit tests for all communication components
- [ ] ✅ Integration tests with sample applications
- [ ] ✅ Security penetration testing
- [ ] ✅ Performance benchmarking

This postMessage architecture provides secure, performant, and scalable communication between web applications and the PDM extension while maintaining strict security boundaries.