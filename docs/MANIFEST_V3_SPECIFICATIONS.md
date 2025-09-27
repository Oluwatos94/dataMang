# Chrome Extension Manifest V3 Specifications for PDM

## 🎯 Manifest V3 Overview

Manifest V3 is the latest platform for Chrome Extensions, designed with security, privacy, and performance in mind. Our PDM extension leverages all the key features for a production-ready experience.

## 📋 Complete Manifest Configuration

### **Core Manifest Fields**

```json
{
  "manifest_version": 3,              // Required: Latest version
  "name": "Private Data Manager",      // Extension name
  "short_name": "PDM",                // Shortened name for limited space
  "version": "1.0.0",                 // Semantic versioning
  "description": "Take control of your private data...", // Store description
  "author": "PDM Team",               // Developer information
  "homepage_url": "https://github.com/your-org/pdm-extension"
}
```

### **Icons & Branding**

```json
{
  "icons": {
    "16": "assets/icons/icon-16.png",   // Toolbar icon
    "32": "assets/icons/icon-32.png",   // Windows taskbar
    "48": "assets/icons/icon-48.png",   // Extension management page
    "128": "assets/icons/icon-128.png"  // Chrome Web Store
  }
}
```

### **Permissions & Security**

#### **Standard Permissions**
```json
{
  "permissions": [
    "storage",              // chrome.storage API for encrypted data
    "activeTab",           // Access to current tab only (more secure)
    "scripting",           // Inject content scripts programmatically
    "unlimitedStorage",    // For large encrypted documents
    "alarms"              // Background sync and health checks
  ]
}
```

#### **Host Permissions (Nillion Networks)**
```json
{
  "host_permissions": [
    "https://nildb-stg-n1.nillion.network/*",  // Primary node
    "https://nildb-stg-n2.nillion.network/*",  // Backup node 1
    "https://nildb-stg-n3.nillion.network/*",  // Backup node 2
    "https://*.nillion.com/*",                 // Official Nillion services
    "https://*.nillion.network/*"              // All Nillion network endpoints
  ]
}
```

### **Service Worker (Background Script)**

```json
{
  "background": {
    "service_worker": "background.js",  // Entry point for background logic
    "type": "module"                   // ES6 modules support
  }
}
```

**Key Changes from Manifest V2:**
- ✅ Service Worker instead of background page
- ✅ Event-driven architecture (no persistent background)
- ✅ Better performance and resource management
- ✅ Enhanced security model

### **User Interface Components**

#### **Extension Action (Popup)**
```json
{
  "action": {
    "default_popup": "popup.html",
    "default_title": "Private Data Manager",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "32": "assets/icons/icon-32.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  }
}
```

#### **Options Page**
```json
{
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true  // Opens in new tab for better UX
  }
}
```

### **Content Scripts**

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],        // Inject into all websites
      "js": ["content.js"],             // Content script file
      "run_at": "document_start",       // Early injection for security
      "all_frames": false               // Main frame only (more secure)
    }
  ]
}
```

### **Security & Privacy**

#### **Content Security Policy**
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://nildb-stg-n1.nillion.network https://nildb-stg-n2.nillion.network https://nildb-stg-n3.nillion.network https://*.nillion.com https://*.nillion.network;"
  }
}
```

**Security Benefits:**
- Prevents XSS attacks
- Restricts network connections to trusted Nillion endpoints
- Blocks inline scripts and eval()
- Enforces HTTPS for external connections

#### **Declarative Net Request**
```json
{
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "security_rules",
        "enabled": true,
        "path": "security_rules.json"
      }
    ]
  }
}
```

### **Keyboard Shortcuts**

```json
{
  "commands": {
    "toggle-popup": {
      "suggested_key": {
        "default": "Ctrl+Shift+P",
        "mac": "Command+Shift+P"
      },
      "description": "Toggle PDM popup"
    },
    "quick-permission-check": {
      "suggested_key": {
        "default": "Ctrl+Shift+A",
        "mac": "Command+Shift+A"
      },
      "description": "Quick permission check for current site"
    }
  }
}
```

### **External Communication**

```json
{
  "externally_connectable": {
    "matches": []  // Empty = no external websites can communicate
  }
}
```

**Security Note:** We intentionally restrict external communication to prevent unauthorized access to the PDM API.

## 🔒 Security Features

### **1. Service Worker Architecture**
- **Event-driven**: Only runs when needed
- **No persistent background**: Better resource management
- **Isolated context**: Cannot access DOM directly
- **Enhanced permissions**: More granular control

### **2. Host Permissions**
- **Explicit declaration**: Must declare all external hosts
- **Runtime requests**: Can request additional permissions
- **User consent**: Users see exactly what sites extension accesses
- **Revocable**: Users can revoke permissions anytime

### **3. Content Security Policy**
- **Script restrictions**: No inline scripts or eval()
- **Network restrictions**: Only trusted Nillion endpoints
- **Object restrictions**: Prevents plugin exploitation
- **Upgrade insecure requests**: HTTP → HTTPS

### **4. Declarative Net Request**
- **Performance**: More efficient than blocking webRequest
- **Privacy**: Rules processed in browser, not extension
- **Security**: Cannot be bypassed by malicious scripts

## 🚀 Performance Optimizations

### **1. Service Worker Benefits**
```javascript
// Event-driven activation
chrome.runtime.onInstalled.addListener(() => {
  // One-time setup
});

chrome.action.onClicked.addListener(() => {
  // Responds to user action
});

// Automatic suspension when idle
```

### **2. Lazy Loading**
```javascript
// Dynamic imports for better performance
const nillionManager = await import('./nillion-manager.js');
```

### **3. Storage Efficiency**
```javascript
// Use chrome.storage.session for temporary data
await chrome.storage.session.set({ tempData: value });

// Use chrome.storage.local for persistent data
await chrome.storage.local.set({ userData: encryptedValue });
```

## 🛡 Privacy Enhancements

### **1. Minimal Permissions**
- Only request permissions actually needed
- Use `activeTab` instead of broad `tabs` permission
- Request host permissions for specific endpoints only

### **2. Data Handling**
- All sensitive data encrypted before storage
- No data transmission to non-Nillion endpoints
- Clear data retention policies
- User control over all data operations

### **3. Transparency**
- Clear permission descriptions
- Detailed privacy policy
- Open source code
- Regular security audits

## 📊 Manifest V3 Migration Benefits

| Feature | Manifest V2 | Manifest V3 | PDM Benefit |
|---------|-------------|-------------|-------------|
| Background | Persistent page | Service Worker | Better performance, resource efficiency |
| Permissions | Broad permissions | Granular host permissions | Enhanced user privacy and security |
| Content Scripts | Limited control | Programmatic injection | Better security, dynamic functionality |
| Network Requests | webRequest API | Declarative Net Request | Improved performance, privacy |
| CSP | Basic | Enhanced | Stronger XSS protection |

## 🔧 Development Considerations

### **1. Service Worker Limitations**
- No DOM access (use content scripts)
- No window object (use chrome APIs)
- Event-driven lifecycle (handle suspension)
- Limited execution time (< 5 minutes)

### **2. Communication Patterns**
```javascript
// Background ↔ Content Script
chrome.tabs.sendMessage(tabId, message);
chrome.runtime.sendMessage(message);

// Background ↔ Popup
chrome.runtime.sendMessage(message);
chrome.runtime.onMessage.addListener();

// Content Script ↔ Web Page
window.postMessage(message, '*');
window.addEventListener('message', handler);
```

### **3. Storage Patterns**
```javascript
// Session storage (temporary)
chrome.storage.session.set({ sessionData });

// Local storage (persistent)
chrome.storage.local.set({ userData });

// Sync storage (cross-device, limited)
chrome.storage.sync.set({ settings });
```

## 🧪 Testing & Validation

### **1. Manifest Validation**
```bash
# Check manifest syntax
cat manifest.json | jq '.'

# Validate with Chrome
chrome --load-extension=./dist --check-extension-manifest
```

### **2. Permission Testing**
```javascript
// Check if permission is granted
const hasPermission = await chrome.permissions.contains({
  origins: ['https://nildb-stg-n1.nillion.network/*']
});

// Request additional permissions
const granted = await chrome.permissions.request({
  origins: ['https://new-endpoint.nillion.com/*']
});
```

### **3. Security Testing**
- CSP violation detection
- Network request monitoring
- Permission boundary testing
- XSS prevention validation

## 🎯 Best Practices for PDM

1. **Minimal Permissions**: Only request what's absolutely necessary
2. **Secure Communication**: Use message passing, validate origins
3. **Data Encryption**: Encrypt all sensitive data before storage
4. **Error Handling**: Graceful degradation when permissions denied
5. **User Transparency**: Clear explanations for all permissions
6. **Regular Updates**: Keep up with Chrome API changes
7. **Performance Monitoring**: Track service worker performance
8. **Security Audits**: Regular code and permission reviews

This Manifest V3 configuration ensures our PDM extension is secure, performant, and future-proof while maintaining compatibility with Chrome's latest platform requirements.