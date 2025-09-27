# Secure Storage Options for Browser Extensions

## 🔐 Storage Security Overview

Browser extensions have multiple storage options, each with different security characteristics. For PDM, we need to store sensitive data like API keys, encrypted documents, and user preferences while maintaining the highest security standards.

## 📊 Browser Extension Storage APIs

### **1. chrome.storage.local**

```typescript
interface LocalStorageOptions {
  // Characteristics
  persistent: true;
  encrypted: false; // ⚠️ Not encrypted by default
  crossDevice: false;
  maxSize: 'unlimited' | '10MB'; // Depending on unlimitedStorage permission
  performance: 'fast';

  // Use cases for PDM
  encryptedDocuments: true;    // After our own encryption
  userPreferences: true;
  apiKeys: true;              // After encryption
  temporaryCache: true;
}
```

**PDM Implementation:**
```typescript
class SecureLocalStorage {
  async store(key: string, value: any): Promise<void> {
    // Encrypt before storing
    const encrypted = await this.encrypt(JSON.stringify(value));
    await chrome.storage.local.set({ [key]: encrypted });
  }

  async retrieve(key: string): Promise<any> {
    const result = await chrome.storage.local.get(key);
    if (result[key]) {
      const decrypted = await this.decrypt(result[key]);
      return JSON.parse(decrypted);
    }
    return null;
  }
}
```

### **2. chrome.storage.session**

```typescript
interface SessionStorageOptions {
  // Characteristics
  persistent: false;           // Cleared when extension restarts
  encrypted: false;
  crossDevice: false;
  maxSize: '10MB';
  performance: 'fastest';

  // Use cases for PDM
  temporaryKeys: true;         // Session-specific encryption keys
  activePermissions: true;     // Current session permissions
  nodeHealthStatus: true;      // Nillion node health cache
  uiState: true;              // Temporary UI state
}
```

**PDM Implementation:**
```typescript
class SessionStorage {
  async storeTemporary(key: string, value: any): Promise<void> {
    await chrome.storage.session.set({ [key]: value });
  }

  async getTemporary(key: string): Promise<any> {
    const result = await chrome.storage.session.get(key);
    return result[key] || null;
  }
}
```

### **3. chrome.storage.sync**

```typescript
interface SyncStorageOptions {
  // Characteristics
  persistent: true;
  encrypted: false;            // ⚠️ Not encrypted
  crossDevice: true;           // Syncs across user's devices
  maxSize: '100KB';           // Very limited
  performance: 'slow';

  // Use cases for PDM
  userSettings: true;          // Non-sensitive preferences
  themePreferences: true;
  defaultPermissionLevels: true;
  // ❌ Never store: API keys, encrypted data, sensitive info
}
```

## 🛡 Security Layer Implementation

### **1. Encryption Wrapper**

```typescript
class SecureStorage {
  private masterKey: CryptoKey | null = null;

  async initializeMasterKey(passphrase?: string): Promise<void> {
    if (passphrase) {
      // Derive from user passphrase
      this.masterKey = await this.deriveKeyFromPassphrase(passphrase);
    } else {
      // Generate from secure random + browser entropy
      this.masterKey = await this.generateMasterKey();
    }
  }

  async secureStore(key: string, value: any, storageType: 'local' | 'session' = 'local'): Promise<void> {
    const plaintext = JSON.stringify(value);

    // Add integrity check
    const checksum = await this.calculateChecksum(plaintext);
    const package = { data: plaintext, checksum, timestamp: Date.now() };

    // Encrypt
    const encrypted = await this.encryptData(JSON.stringify(package));

    // Store based on type
    if (storageType === 'local') {
      await chrome.storage.local.set({ [key]: encrypted });
    } else {
      await chrome.storage.session.set({ [key]: encrypted });
    }
  }

  async secureRetrieve(key: string, storageType: 'local' | 'session' = 'local'): Promise<any> {
    let result;

    if (storageType === 'local') {
      result = await chrome.storage.local.get(key);
    } else {
      result = await chrome.storage.session.get(key);
    }

    if (!result[key]) return null;

    try {
      // Decrypt
      const decryptedPackage = await this.decryptData(result[key]);
      const package = JSON.parse(decryptedPackage);

      // Verify integrity
      const expectedChecksum = await this.calculateChecksum(package.data);
      if (package.checksum !== expectedChecksum) {
        throw new Error('Data integrity check failed');
      }

      // Check age (optional security measure)
      const age = Date.now() - package.timestamp;
      if (age > this.maxDataAge) {
        throw new Error('Data too old, possible replay attack');
      }

      return JSON.parse(package.data);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }
}
```

### **2. Key Management**

```typescript
class KeyManager {
  private keys: Map<string, CryptoKey> = new Map();

  async generateDocumentKey(documentId: string): Promise<CryptoKey> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // Not extractable
      ['encrypt', 'decrypt']
    );

    this.keys.set(documentId, key);
    return key;
  }

  async deriveApplicationKey(purpose: string): Promise<CryptoKey> {
    const masterKey = await this.getMasterKey();
    const salt = new TextEncoder().encode(purpose);

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      masterKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async rotateKeys(): Promise<void> {
    // Implement key rotation for security
    const oldKeys = Array.from(this.keys.entries());

    for (const [id, oldKey] of oldKeys) {
      const newKey = await this.generateDocumentKey(id);
      await this.reencryptWithNewKey(id, oldKey, newKey);
    }
  }
}
```

## 🏗 Storage Architecture for PDM

### **Storage Hierarchy**

```typescript
interface PDMStorageArchitecture {
  // Level 1: Chrome Storage APIs
  chromeStorage: {
    local: 'chrome.storage.local';     // Persistent, encrypted by us
    session: 'chrome.storage.session'; // Temporary, for active session
    sync: 'chrome.storage.sync';       // Non-sensitive settings only
  };

  // Level 2: Encryption Layer
  encryptionLayer: {
    masterKey: 'derived_from_user_input_or_secure_random';
    documentKeys: 'per_document_encryption_keys';
    integrityChecks: 'hmac_sha256_for_tamper_detection';
  };

  // Level 3: Data Categories
  dataCategories: {
    highSecurity: {
      storage: 'local_encrypted';
      data: ['api_keys', 'private_keys', 'document_content'];
      encryption: 'AES-256-GCM';
      keyRotation: 'monthly';
    };
    mediumSecurity: {
      storage: 'local_encrypted';
      data: ['permissions', 'audit_logs', 'user_identity'];
      encryption: 'AES-256-GCM';
      keyRotation: 'quarterly';
    };
    lowSecurity: {
      storage: 'session_or_sync';
      data: ['ui_preferences', 'cache', 'temporary_state'];
      encryption: 'optional';
    };
  };
}
```

### **Storage Implementation Map**

| Data Type | Storage API | Encryption | Persistence | Cross-Device |
|-----------|------------|------------|-------------|--------------|
| **API Keys** | local | AES-256-GCM | Yes | No |
| **Document Content** | local | AES-256-GCM | Yes | No |
| **User Identity** | local | AES-256-GCM | Yes | No |
| **Permissions** | local | AES-256-GCM | Yes | No |
| **Audit Logs** | local | AES-256-GCM | Yes | No |
| **Active Session** | session | Optional | No | No |
| **UI State** | session | No | No | No |
| **Node Health** | session | No | No | No |
| **User Preferences** | sync | No | Yes | Yes |
| **Theme Settings** | sync | No | Yes | Yes |

## 🔒 Advanced Security Measures

### **1. Data Isolation**

```typescript
class DataIsolation {
  private compartments: Map<string, SecureCompartment> = new Map();

  async createCompartment(name: string, securityLevel: 'high' | 'medium' | 'low'): Promise<void> {
    const compartment = new SecureCompartment(name, securityLevel);
    await compartment.initialize();
    this.compartments.set(name, compartment);
  }

  async storeInCompartment(compartment: string, key: string, value: any): Promise<void> {
    const comp = this.compartments.get(compartment);
    if (!comp) throw new Error('Compartment not found');
    await comp.secureStore(key, value);
  }
}

class SecureCompartment {
  constructor(
    private name: string,
    private securityLevel: 'high' | 'medium' | 'low'
  ) {}

  async initialize(): Promise<void> {
    // Generate compartment-specific encryption keys
    this.encryptionKey = await this.generateCompartmentKey();
  }

  async secureStore(key: string, value: any): Promise<void> {
    const fullKey = `${this.name}:${key}`;
    const encrypted = await this.encrypt(value);
    await chrome.storage.local.set({ [fullKey]: encrypted });
  }
}
```

### **2. Access Control**

```typescript
class AccessControl {
  async checkAccess(operation: string, resource: string, context: SecurityContext): Promise<boolean> {
    // Check operation permissions
    if (!this.hasPermission(context.userId, operation, resource)) {
      return false;
    }

    // Check rate limiting
    if (!await this.checkRateLimit(context.userId, operation)) {
      return false;
    }

    // Check security context
    if (!this.validateSecurityContext(context)) {
      return false;
    }

    return true;
  }

  private async checkRateLimit(userId: string, operation: string): Promise<boolean> {
    const key = `rate_limit:${userId}:${operation}`;
    const current = await chrome.storage.session.get(key);

    const limit = this.getRateLimit(operation);
    const window = this.getRateLimitWindow(operation);

    // Implement sliding window rate limiting
    return this.isWithinRateLimit(current[key], limit, window);
  }
}
```

### **3. Secure Deletion**

```typescript
class SecureDeletion {
  async secureDelete(key: string, storageType: 'local' | 'session' = 'local'): Promise<void> {
    try {
      // Overwrite with random data multiple times
      for (let i = 0; i < 3; i++) {
        const randomData = crypto.getRandomValues(new Uint8Array(1024));
        if (storageType === 'local') {
          await chrome.storage.local.set({ [key]: Array.from(randomData) });
        } else {
          await chrome.storage.session.set({ [key]: Array.from(randomData) });
        }
      }

      // Final deletion
      if (storageType === 'local') {
        await chrome.storage.local.remove(key);
      } else {
        await chrome.storage.session.remove(key);
      }

    } catch (error) {
      console.error('Secure deletion failed:', error);
      throw new Error('Failed to securely delete data');
    }
  }

  async wipeAllData(): Promise<void> {
    // Emergency data wipe
    await chrome.storage.local.clear();
    await chrome.storage.session.clear();

    // Clear any cached keys
    this.clearAllCaches();
  }
}
```

## 🛡 Security Best Practices

### **1. Defense in Depth**

- **Layer 1**: Chrome storage isolation
- **Layer 2**: Application-level encryption
- **Layer 3**: Data compartmentalization
- **Layer 4**: Access control and auditing
- **Layer 5**: Secure deletion and key rotation

### **2. Key Management**

```typescript
const keyManagementBestPractices = {
  generation: 'use_crypto_subtle_api',
  storage: 'never_store_in_plaintext',
  derivation: 'pbkdf2_100k_iterations_minimum',
  rotation: 'monthly_for_high_security_data',
  destruction: 'secure_deletion_with_overwrite',
  isolation: 'separate_keys_per_data_category'
};
```

### **3. Data Classification**

| Classification | Encryption | Storage | Retention | Key Rotation |
|---------------|------------|---------|-----------|--------------|
| **Top Secret** | AES-256-GCM | Local only | User controlled | Weekly |
| **Secret** | AES-256-GCM | Local only | 1 year max | Monthly |
| **Confidential** | AES-256-GCM | Local/Session | 6 months | Quarterly |
| **Internal** | Optional | Session/Sync | 30 days | Yearly |
| **Public** | None | Sync | Indefinite | N/A |

## 🧪 Testing & Validation

### **Storage Security Tests**

```typescript
describe('Secure Storage', () => {
  test('should encrypt data before storage', async () => {
    const secureStorage = new SecureStorage();
    await secureStorage.initializeMasterKey();

    const plaintext = 'sensitive data';
    await secureStorage.secureStore('test', plaintext);

    // Verify data is encrypted in storage
    const raw = await chrome.storage.local.get('test');
    expect(raw.test).not.toBe(plaintext);
    expect(raw.test).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
  });

  test('should detect tampering', async () => {
    const secureStorage = new SecureStorage();
    await secureStorage.initializeMasterKey();

    await secureStorage.secureStore('test', 'data');

    // Tamper with stored data
    await chrome.storage.local.set({ test: 'tampered_data' });

    // Should return null or throw error
    const result = await secureStorage.secureRetrieve('test');
    expect(result).toBeNull();
  });

  test('should handle key rotation', async () => {
    const keyManager = new KeyManager();
    const documentId = 'test-doc';

    const oldKey = await keyManager.generateDocumentKey(documentId);
    await keyManager.rotateKeys();
    const newKey = keyManager.getKey(documentId);

    expect(oldKey).not.toBe(newKey);
  });
});
```

## 📋 Implementation Checklist

### **Security Implementation**
- [ ] ✅ AES-256-GCM encryption for all sensitive data
- [ ] ✅ PBKDF2 key derivation with 100k+ iterations
- [ ] ✅ Data integrity verification with HMAC
- [ ] ✅ Secure key generation using crypto.subtle
- [ ] ✅ Key rotation mechanisms
- [ ] ✅ Secure deletion with overwrite
- [ ] ✅ Rate limiting for operations
- [ ] ✅ Access control validation

### **Storage Strategy**
- [ ] ✅ chrome.storage.local for persistent encrypted data
- [ ] ✅ chrome.storage.session for temporary data
- [ ] ✅ chrome.storage.sync for non-sensitive preferences
- [ ] ✅ Data compartmentalization by security level
- [ ] ✅ Emergency data wipe functionality

### **Testing & Validation**
- [ ] ✅ Encryption/decryption tests
- [ ] ✅ Tampering detection tests
- [ ] ✅ Key rotation tests
- [ ] ✅ Performance benchmarks
- [ ] ✅ Security audit trails

This secure storage implementation ensures that all sensitive data in the PDM extension is protected with enterprise-grade security while maintaining performance and usability.