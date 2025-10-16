import type { NillionCredentials } from './index';
import { IdentityManager } from './identity';

export class NillionManager {
  private static instance: NillionManager;
  private identityManager: IdentityManager;
  private credentials: NillionCredentials | null = null;
  private userPrivateKey: string | null = null;
  private userDid: string | null = null;
  private readonly SERVER_URL = process.env.PDM_SERVER_URL || 'http://localhost:3000';
  private readonly TIMEOUT = 30000;
  private demoMode: boolean = false; // Fallback to localStorage when Nillion fails

  private constructor() {
    this.identityManager = IdentityManager.getInstance();
  }

  static getInstance(): NillionManager {
    if (!NillionManager.instance) {
      NillionManager.instance = new NillionManager();
    }
    return NillionManager.instance;
  }

  async initialize(password: string): Promise<void> {
    this.credentials = await this.identityManager.getNillionCredentials(password);

    if (!this.credentials) {
      throw new Error('Nillion credentials not found. Please set up your wallet first.');
    }

    // In user-centric mode, we use the USER's private key (not builder's)
    this.userPrivateKey = this.credentials.privateKey ?? null;

    // Check if we should use demo mode (persisted from previous failures)
    const stored = await chrome.storage.local.get(['pdm_demo_mode', 'pdm_user_did']);
    if (stored.pdm_demo_mode) {
      this.demoMode = true;
      // Use the persisted DID to ensure consistency
      this.userDid = stored.pdm_user_did || `did:nil:demo_${this.credentials.apiKey?.substring(0, 16)}`;
      return;
    }

    // Get the correct DID from backend server (in did:nil: format)
    try {
      const result = await this.makeRequest('/api/user/did', 'POST', {
        userPrivateKey: this.userPrivateKey
      });

      this.userDid = result.did;
      // Persist the DID for demo mode fallback
      await chrome.storage.local.set({ pdm_user_did: this.userDid });
    } catch (error: any) {
      // Enable demo mode permanently if initialization fails
      console.warn('[NillionManager] ⚠️ Failed to connect to Nillion, enabling demo mode permanently');
      this.demoMode = true;
      // Generate a consistent demo DID
      this.userDid = `did:nil:demo_${this.credentials.apiKey?.substring(0, 16)}`;
      await chrome.storage.local.set({
        pdm_demo_mode: true,
        pdm_user_did: this.userDid
      });
    }
  }

  isInitialized(): boolean {
    return this.credentials !== null && this.userPrivateKey !== null;
  }

  async storeData(data: any, metadata: any = {}): Promise<string> {
    if (!this.userPrivateKey) {
      throw new Error('Not initialized. Call initialize() first.');
    }

    // Collection ID MUST be provided by the app (not created by user)
    const collectionId = metadata.collectionId || metadata.collection;
    if (!collectionId) {
      throw new Error('collectionId is required - app must provide it in metadata');
    }

    // Try Nillion first
    try {
      const payload = {
        userPrivateKey: this.userPrivateKey,
        collectionId: collectionId, // App-provided collection
        data: {
          ...data,
          timestamp: Date.now()
        }
      };

      const result = await this.makeRequest('/api/data/store', 'POST', payload);
      return result.dataId;
    } catch (error: any) {
      // Fall back to localStorage for demo
      console.warn('[NillionManager] ⚠️ Nillion storage failed, using demo mode (localStorage):', error.message);
      this.demoMode = true;
      await chrome.storage.local.set({ pdm_demo_mode: true });

      const dataId = crypto.randomUUID();
      await this.storeDataLocally(dataId, { ...data, timestamp: Date.now() }, collectionId);
      return dataId;
    }
  }

  async retrieveData(dataId: string, collectionId: string): Promise<any> {
    if (!this.userPrivateKey) {
      throw new Error('Not initialized');
    }

    // Use demo mode if active
    if (this.demoMode) {
      return this.retrieveDataLocally(dataId);
    }

    try {
      const url = `${this.SERVER_URL}/api/data/${dataId}?userKey=${encodeURIComponent(this.userPrivateKey)}&collection=${collectionId}`;
      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to retrieve data');
      }

      return result.data;
    } catch (error: any) {
      // Fall back to demo mode
      console.warn('[NillionManager] ⚠️ Nillion retrieve failed, using demo mode');
      this.demoMode = true;
      await chrome.storage.local.set({ pdm_demo_mode: true });
      return this.retrieveDataLocally(dataId);
    }
  }

  async listUserData(): Promise<any[]> {
    if (!this.userPrivateKey) {
      throw new Error('Not initialized');
    }

    // Use demo mode if active
    if (this.demoMode) {
      return this.listDataLocally();
    }

    try {
      const url = `${this.SERVER_URL}/api/data/list?userKey=${encodeURIComponent(this.userPrivateKey)}`;
      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to list data');
      }

      return result.data;
    } catch (error: any) {
      // Fall back to demo mode
      console.warn('[NillionManager] ⚠️ Nillion list failed, using demo mode');
      this.demoMode = true;
      await chrome.storage.local.set({ pdm_demo_mode: true });
      return this.listDataLocally();
    }
  }

  async deleteData(dataId: string, collectionId: string): Promise<void> {
    if (!this.userPrivateKey) {
      throw new Error('Not initialized');
    }

    // Use demo mode if active
    if (this.demoMode) {
      return this.deleteDataLocally(dataId);
    }

    try {
      const url = `${this.SERVER_URL}/api/data/${dataId}?userKey=${encodeURIComponent(this.userPrivateKey)}&collection=${collectionId}`;
      const response = await fetch(url, { method: 'DELETE' });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete data');
      }
    } catch (error: any) {
      // Fall back to demo mode
      console.warn('[NillionManager] ⚠️ Nillion delete failed, using demo mode');
      this.demoMode = true;
      await chrome.storage.local.set({ pdm_demo_mode: true });
      return this.deleteDataLocally(dataId);
    }
  }

  async grantPermission(dataId: string, collectionId: string, appDid: string, permissions: string[]): Promise<void> {
    if (!this.userPrivateKey) {
      throw new Error('Not initialized');
    }

    try {
      // Try Nillion first
      await this.makeRequest('/api/permissions/grant', 'POST', {
        userPrivateKey: this.userPrivateKey,
        dataId,
        collectionId,
        appDid,
        permissions
      });
    } catch (error: any) {
      // Fall back to localStorage for demo
      console.warn('[NillionManager] ⚠️ Nillion grant failed, using demo mode');
      this.demoMode = true;

      // Store permission in localStorage
      const permKey = `pdm_permissions_${this.userDid}`;
      const stored = await chrome.storage.local.get(permKey);
      const allPerms = stored[permKey] || [];

      allPerms.push({
        id: crypto.randomUUID(),
        dataId,
        collectionId,
        appDid,
        permissions,
        grantedAt: new Date().toISOString()
      });

      await chrome.storage.local.set({ [permKey]: allPerms });
    }
  }

  async revokePermission(dataId: string, collectionId: string, appDid: string, permissionId?: string): Promise<void> {
    if (!this.userPrivateKey) {
      throw new Error('Not initialized');
    }

    try {
      // Try Nillion first
      await this.makeRequest('/api/permissions/revoke', 'POST', {
        userPrivateKey: this.userPrivateKey,
        dataId,
        collectionId,
        appDid
      });
    } catch (error: any) {
      // Fall back to localStorage for demo
      console.warn('[NillionManager] ⚠️ Nillion revoke failed, using demo mode');
      this.demoMode = true;

      // Remove specific permission from localStorage by ID
      const permKey = `pdm_permissions_${this.userDid}`;
      const stored = await chrome.storage.local.get(permKey);
      const allPerms = stored[permKey] || [];

      // If permissionId is provided, use it for exact match, otherwise use the old logic
      const filtered = permissionId
        ? allPerms.filter((p: any) => p.id !== permissionId)
        : allPerms.filter((p: any) =>
            !(p.dataId === dataId && p.collectionId === collectionId && p.appDid === appDid)
          );

      await chrome.storage.local.set({ [permKey]: filtered });
    }
  }

  async listPermissions(): Promise<any[]> {
    if (!this.userPrivateKey) {
      throw new Error('Not initialized');
    }

    // In demo mode, return localStorage permissions
    if (this.demoMode) {
      const permKey = `pdm_permissions_${this.userDid}`;
      const stored = await chrome.storage.local.get(permKey);
      return stored[permKey] || [];
    }

    // Otherwise try to get from Nillion (will fail and fall back)
    try {
      const result = await this.makeRequest('/api/permissions/list', 'POST', {
        userPrivateKey: this.userPrivateKey
      });
      return result.permissions || [];
    } catch (error: any) {
      // Fall back to localStorage
      console.warn('[NillionManager] ⚠️ Nillion list failed, using demo mode');
      this.demoMode = true;
      const permKey = `pdm_permissions_${this.userDid}`;
      const stored = await chrome.storage.local.get(permKey);
      return stored[permKey] || [];
    }
  }

  // ❌ REMOVED: Users don't create collections
  // Collections are provided by APPS, not created by users
  // Apps pass collectionId in metadata when calling storeData()

  getUserDid(): string | null {
    return this.userDid;
  }

  // ========== DEMO MODE: localStorage fallback for hackathon demo ==========

  private async storeDataLocally(dataId: string, data: any, collectionId: string): Promise<void> {
    const storageKey = `pdm_demo_data_${this.userDid}`;

    const stored = await chrome.storage.local.get(storageKey);
    const allData = stored[storageKey] || [];

    const newItem = {
      dataId,
      collectionId,
      id: dataId, // Add id field for compatibility
      ...data,
      storedAt: new Date().toISOString()
    };

    allData.push(newItem);

    await chrome.storage.local.set({ [storageKey]: allData });
  }

  private async listDataLocally(): Promise<any[]> {
    const storageKey = `pdm_demo_data_${this.userDid}`;

    const stored = await chrome.storage.local.get(storageKey);
    let data = stored[storageKey] || [];


    // If no data found, try to find data with any DID (migration helper)
    if (data.length === 0) {
      const allStorage = await chrome.storage.local.get(null);

      // List all keys for debugging
      const demoKeys = Object.keys(allStorage).filter(k => k.startsWith('pdm_demo_data_'));

      for (const [key, value] of Object.entries(allStorage)) {
        if (key.startsWith('pdm_demo_data_did:nil:') && key !== storageKey) {
          data = value as any[];
          // Migrate to current DID
          await chrome.storage.local.set({ [storageKey]: data });
          await chrome.storage.local.remove(key);
          break;
        }
      }
    }

    return data;
  }

  private async retrieveDataLocally(dataId: string): Promise<any> {
    const allData = await this.listDataLocally();
    const found = allData.find(item => item.dataId === dataId);
    if (!found) {
      throw new Error('Data not found');
    }
    return found;
  }

  private async deleteDataLocally(dataId: string): Promise<void> {
    const storageKey = `pdm_demo_data_${this.userDid}`;
    const stored = await chrome.storage.local.get(storageKey);
    const allData = stored[storageKey] || [];

    const filtered = allData.filter((item: any) => item.dataId !== dataId);
    await chrome.storage.local.set({ [storageKey]: filtered });
  }

  // ========================================================================

  private async makeRequest(endpoint: string, method: string, body?: any): Promise<any> {
    // Use offscreen document for network requests (bypasses service worker CSP)
    const callOffscreenApi = (globalThis as any).__callOffscreenApi;

    if (!callOffscreenApi) {
      throw new Error('Offscreen API not available. Background script may not be ready.');
    }

    try {
      const result = await callOffscreenApi(endpoint, method, body);
      return result;
    } catch (error: any) {
      console.error('[NillionManager] API call failed:', error);
      throw new Error(`API call failed: ${error.message}`);
    }
  }
}
