import type { UserIdentity, NillionCredentials } from './index';

interface SessionData {
  did: string;
  timestamp: number;
  expiresAt: number;
}

interface EncryptedData {
  data: string;
  salt: string;
  iv: string;
}

export class IdentityManager {
  private static instance: IdentityManager;
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_PREFIX = 'pdm_';
  private masterKey: CryptoKey | null = null;
  private sessionCache: Map<string, any> = new Map();

  static getInstance(): IdentityManager {
    if (!IdentityManager.instance) {
      IdentityManager.instance = new IdentityManager();
    }
    return IdentityManager.instance;
  }

  private constructor() {
    this.initializeCrypto();
  }

  private async initializeCrypto(): Promise<void> {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('WebCrypto API not available');
    }
  }

  async generateDID(): Promise<string> {
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', randomBytes);
    const hashArray = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `did:pdm:${hashHex}`;
  }

  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptData(data: string, password: string): Promise<EncryptedData> {
    const salt = new Uint8Array(16);
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(salt);
    window.crypto.getRandomValues(iv);

    const key = await this.deriveKey(password, salt);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      dataBuffer
    );

    return {
      data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv))
    };
  }

  async decryptData(encryptedData: EncryptedData, password: string): Promise<string> {
    const salt = new Uint8Array(atob(encryptedData.salt).split('').map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(encryptedData.iv).split('').map(c => c.charCodeAt(0)));
    const data = new Uint8Array(atob(encryptedData.data).split('').map(c => c.charCodeAt(0)));

    const key = await this.deriveKey(password, salt);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  async secureStore(key: string, value: any, password?: string): Promise<void> {
    const storageKey = `${this.STORAGE_PREFIX}${key}`;
    const serializedValue = JSON.stringify(value);

    if (password) {
      const encrypted = await this.encryptData(serializedValue, password);
      await chrome.storage.local.set({ [storageKey]: encrypted });
    } else {
      await chrome.storage.local.set({ [storageKey]: serializedValue });
    }

    this.sessionCache.set(key, value);
  }

  async secureRetrieve(key: string, password?: string): Promise<any> {
    if (this.sessionCache.has(key)) {
      return this.sessionCache.get(key);
    }

    const storageKey = `${this.STORAGE_PREFIX}${key}`;
    const result = await chrome.storage.local.get(storageKey);
    const storedValue = result[storageKey];

    if (!storedValue) {
      return null;
    }

    if (password && typeof storedValue === 'object' && storedValue.data) {
      const decrypted = await this.decryptData(storedValue as EncryptedData, password);
      const parsed = JSON.parse(decrypted);
      this.sessionCache.set(key, parsed);
      return parsed;
    }

    const parsed = typeof storedValue === 'string' ? JSON.parse(storedValue) : storedValue;
    this.sessionCache.set(key, parsed);
    return parsed;
  }

  async createSession(did: string): Promise<void> {
    const now = Date.now();
    const sessionData: SessionData = {
      did,
      timestamp: now,
      expiresAt: now + this.SESSION_TIMEOUT
    };

    await this.secureStore('current_session', sessionData);
  }

  async getCurrentSession(): Promise<SessionData | null> {
    const session = await this.secureRetrieve('current_session');

    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      await this.clearSession();
      return null;
    }

    return session;
  }

  async clearSession(): Promise<void> {
    await chrome.storage.local.remove(`${this.STORAGE_PREFIX}current_session`);
    this.sessionCache.delete('current_session');
  }

  async getOrCreateIdentity(password?: string): Promise<UserIdentity> {
    let identity = await this.secureRetrieve('user_identity', password);

    if (!identity) {
      const did = await this.generateDID();
      const now = Date.now();

      identity = {
        did,
        createdAt: now,
        lastAccessed: now,
        preferences: {
          autoApproveKnownApps: false,
          sessionTimeout: this.SESSION_TIMEOUT,
          encryptionLevel: 'high'
        }
      };

      await this.secureStore('user_identity', identity, password);
    } else {
      identity.lastAccessed = Date.now();
      await this.secureStore('user_identity', identity, password);
    }

    await this.createSession(identity.did);
    return identity;
  }

  async storeNillionCredentials(credentials: NillionCredentials, password: string): Promise<void> {
    await this.secureStore('nillion_credentials', credentials, password);
  }

  async getNillionCredentials(password: string): Promise<NillionCredentials | null> {
    return await this.secureRetrieve('nillion_credentials', password);
  }

  async rotateKeys(oldPassword: string, newPassword: string): Promise<void> {
    const identity = await this.secureRetrieve('user_identity', oldPassword);
    const credentials = await this.secureRetrieve('nillion_credentials', oldPassword);

    if (identity) {
      await this.secureStore('user_identity', identity, newPassword);
    }

    if (credentials) {
      await this.secureStore('nillion_credentials', credentials, newPassword);
    }
  }

  async exportIdentity(password: string): Promise<string> {
    const identity = await this.secureRetrieve('user_identity', password);
    const credentials = await this.secureRetrieve('nillion_credentials', password);

    const exportData = {
      identity,
      credentials,
      exportedAt: Date.now()
    };

    return btoa(JSON.stringify(exportData));
  }

  async importIdentity(exportedData: string, password: string): Promise<void> {
    const data = JSON.parse(atob(exportedData));

    if (data.identity) {
      await this.secureStore('user_identity', data.identity, password);
    }

    if (data.credentials) {
      await this.secureStore('nillion_credentials', data.credentials, password);
    }
  }

  async validateSession(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session !== null;
  }

  async getDID(): Promise<string | null> {
    const session = await this.getCurrentSession();
    return session?.did || null;
  }

  clearCache(): void {
    this.sessionCache.clear();
  }
}