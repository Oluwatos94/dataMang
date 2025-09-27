import type { NillionCredentials, StoredData, PermissionConfig } from './index';
import { IdentityManager } from './identity';

interface NillionNode {
  endpoint: string;
  region: string;
  isHealthy: boolean;
  lastHealthCheck: number;
}

interface StorageOperation {
  operation: 'store' | 'retrieve' | 'delete' | 'update';
  nodeId: string;
  dataId: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
}

export class NillionManager {
  private static instance: NillionManager;
  private identityManager: IdentityManager;
  private credentials: NillionCredentials | null = null;
  private nodes: NillionNode[] = [];
  private operationQueue: StorageOperation[] = [];
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT = 30000; // 30 seconds

  static getInstance(): NillionManager {
    if (!NillionManager.instance) {
      NillionManager.instance = new NillionManager();
    }
    return NillionManager.instance;
  }

  private constructor() {
    this.identityManager = IdentityManager.getInstance();
    this.initializeNodes();
    this.startHealthChecks();
  }

  private initializeNodes(): void {
    this.nodes = [
      {
        endpoint: process.env.NILLION_NODE_1 || 'https://node-1.nillion-testnet.com',
        region: 'us-east-1',
        isHealthy: true,
        lastHealthCheck: Date.now()
      },
      {
        endpoint: process.env.NILLION_NODE_2 || 'https://node-2.nillion-testnet.com',
        region: 'eu-west-1',
        isHealthy: true,
        lastHealthCheck: Date.now()
      },
      {
        endpoint: process.env.NILLION_NODE_3 || 'https://node-3.nillion-testnet.com',
        region: 'ap-southeast-1',
        isHealthy: true,
        lastHealthCheck: Date.now()
      }
    ];
  }

  private startHealthChecks(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private async performHealthChecks(): Promise<void> {
    const healthPromises = this.nodes.map(async (node) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${node.endpoint}/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        clearTimeout(timeoutId);
        node.isHealthy = response.ok;
        node.lastHealthCheck = Date.now();
      } catch (error) {
        node.isHealthy = false;
        node.lastHealthCheck = Date.now();
        console.warn(`Health check failed for node ${node.endpoint}:`, error);
      }
    });

    await Promise.allSettled(healthPromises);
  }

  private getHealthyNodes(): NillionNode[] {
    return this.nodes.filter(node => node.isHealthy);
  }

  private selectOptimalNode(): NillionNode | null {
    const healthyNodes = this.getHealthyNodes();

    if (healthyNodes.length === 0) {
      return null;
    }

    return healthyNodes.sort((a, b) => b.lastHealthCheck - a.lastHealthCheck)[0] || null;
  }

  async initialize(password: string): Promise<void> {
    this.credentials = await this.identityManager.getNillionCredentials(password);

    if (!this.credentials) {
      throw new Error('Nillion credentials not found. Please set up your wallet first.');
    }

    await this.performHealthChecks();
  }

  private async makeNillionRequest(
    endpoint: string,
    method: string,
    body?: any,
    retryCount = 0
  ): Promise<any> {
    if (!this.credentials) {
      throw new Error('NillionManager not initialized');
    }

    const node = this.selectOptimalNode();
    if (!node) {
      throw new Error('No healthy Nillion nodes available');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(`${node.endpoint}${endpoint}`, {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'X-Nillion-User-Id': this.credentials.userId || '',
          'X-Nillion-App-Id': this.credentials.appId || ''
        },
        body: body ? JSON.stringify(body) : null
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Nillion API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.makeNillionRequest(endpoint, method, body, retryCount + 1);
      }
      throw error;
    }
  }

  async storeData(data: any, metadata: any = {}): Promise<string> {
    const did = await this.identityManager.getDID();
    if (!did) {
      throw new Error('No active session');
    }

    const dataId = `${did}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payload = {
      data_id: dataId,
      data: data,
      metadata: {
        ...metadata,
        owner: did,
        created_at: Date.now(),
        access_level: metadata.access_level || 'private'
      },
      permissions: {
        read: [did],
        write: [did],
        delete: [did]
      }
    };

    const operation: StorageOperation = {
      operation: 'store',
      nodeId: this.selectOptimalNode()?.endpoint || '',
      dataId,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.operationQueue.push(operation);

    try {
      const result = await this.makeNillionRequest('/api/v1/store', 'POST', payload);
      operation.status = 'success';
      return dataId;
    } catch (error) {
      operation.status = 'failed';
      throw error;
    }
  }

  async retrieveData(dataId: string): Promise<StoredData | null> {
    const did = await this.identityManager.getDID();
    if (!did) {
      throw new Error('No active session');
    }

    const operation: StorageOperation = {
      operation: 'retrieve',
      nodeId: this.selectOptimalNode()?.endpoint || '',
      dataId,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.operationQueue.push(operation);

    try {
      const result = await this.makeNillionRequest(`/api/v1/retrieve/${dataId}`, 'GET');
      operation.status = 'success';

      return {
        id: dataId,
        data: result.data,
        metadata: result.metadata,
        permissions: result.permissions,
        createdAt: result.metadata.created_at,
        updatedAt: result.metadata.updated_at || result.metadata.created_at
      };
    } catch (error) {
      operation.status = 'failed';
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async updateData(dataId: string, newData: any, newMetadata: any = {}): Promise<void> {
    const did = await this.identityManager.getDID();
    if (!did) {
      throw new Error('No active session');
    }

    const payload = {
      data: newData,
      metadata: {
        ...newMetadata,
        updated_at: Date.now(),
        updated_by: did
      }
    };

    const operation: StorageOperation = {
      operation: 'update',
      nodeId: this.selectOptimalNode()?.endpoint || '',
      dataId,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.operationQueue.push(operation);

    try {
      await this.makeNillionRequest(`/api/v1/update/${dataId}`, 'PUT', payload);
      operation.status = 'success';
    } catch (error) {
      operation.status = 'failed';
      throw error;
    }
  }

  async deleteData(dataId: string): Promise<void> {
    const did = await this.identityManager.getDID();
    if (!did) {
      throw new Error('No active session');
    }

    const operation: StorageOperation = {
      operation: 'delete',
      nodeId: this.selectOptimalNode()?.endpoint || '',
      dataId,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.operationQueue.push(operation);

    try {
      await this.makeNillionRequest(`/api/v1/delete/${dataId}`, 'DELETE');
      operation.status = 'success';
    } catch (error) {
      operation.status = 'failed';
      throw error;
    }
  }

  async listUserData(): Promise<StoredData[]> {
    const did = await this.identityManager.getDID();
    if (!did) {
      throw new Error('No active session');
    }

    try {
      const result = await this.makeNillionRequest(`/api/v1/list/${did}`, 'GET');
      return result.data || [];
    } catch (error) {
      throw error;
    }
  }

  async grantPermission(dataId: string, targetDid: string, permissions: string[]): Promise<void> {
    const did = await this.identityManager.getDID();
    if (!did) {
      throw new Error('No active session');
    }

    const payload = {
      target_did: targetDid,
      permissions: permissions,
      granted_by: did,
      granted_at: Date.now()
    };

    try {
      await this.makeNillionRequest(`/api/v1/permissions/${dataId}/grant`, 'POST', payload);
    } catch (error) {
      throw error;
    }
  }

  async revokePermission(dataId: string, targetDid: string): Promise<void> {
    const did = await this.identityManager.getDID();
    if (!did) {
      throw new Error('No active session');
    }

    const payload = {
      target_did: targetDid,
      revoked_by: did,
      revoked_at: Date.now()
    };

    try {
      await this.makeNillionRequest(`/api/v1/permissions/${dataId}/revoke`, 'POST', payload);
    } catch (error) {
      throw error;
    }
  }

  async getPermissions(dataId: string): Promise<PermissionConfig> {
    try {
      const result = await this.makeNillionRequest(`/api/v1/permissions/${dataId}`, 'GET');
      return result.permissions;
    } catch (error) {
      throw error;
    }
  }

  async syncWithNodes(): Promise<void> {
    await this.performHealthChecks();

    const healthyNodes = this.getHealthyNodes();
    if (healthyNodes.length === 0) {
      throw new Error('No healthy nodes available for sync');
    }

    // In a real implementation, this would sync data across multiple nodes
    console.log(`Syncing with ${healthyNodes.length} healthy nodes`);
  }

  getNodeStatus(): NillionNode[] {
    return [...this.nodes];
  }

  getOperationHistory(): StorageOperation[] {
    return [...this.operationQueue];
  }

  async getAccountInfo(): Promise<any> {
    if (!this.credentials) {
      throw new Error('NillionManager not initialized');
    }

    try {
      return await this.makeNillionRequest('/api/v1/account', 'GET');
    } catch (error) {
      throw error;
    }
  }

  async getStorageQuota(): Promise<any> {
    try {
      return await this.makeNillionRequest('/api/v1/quota', 'GET');
    } catch (error) {
      throw error;
    }
  }

  clearOperationHistory(): void {
    this.operationQueue = [];
  }
}