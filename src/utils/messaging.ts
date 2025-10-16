import type { PermissionType } from './permissions';
import { PermissionManager } from './permissions';
import { DataManager } from './data';
import { IdentityManager } from './identity';

export interface PDMMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  action: PDMAction;
  data?: any;
  error?: string | undefined;
  timestamp: number;
  origin: string;
  sessionId?: string | undefined;
}

export type PDMAction =
  | 'store_data'
  | 'retrieve_data'
  | 'update_data'
  | 'delete_data'
  | 'search_data'
  | 'request_permission'
  | 'share_data'
  | 'get_identity'
  | 'check_permission'
  | 'get_user_data'
  | 'ping'
  | 'connect'
  | 'disconnect';

export interface OriginConfig {
  origin: string;
  permissions: PermissionType[];
  allowedActions: PDMAction[];
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  requiresApproval: boolean;
  isBlocked: boolean;
  createdAt: number;
  lastUsed: number;
}

export interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export interface PendingRequest {
  messageId: string;
  origin: string;
  action: PDMAction;
  data: any;
  timestamp: number;
  expiresAt: number;
}

export class MessageHandler {
  private static instance: MessageHandler;
  private permissionManager: PermissionManager;
  private dataManager: DataManager;
  private identityManager: IdentityManager;
  private allowedOrigins: Map<string, OriginConfig> = new Map();
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly DEFAULT_RATE_LIMIT = { maxRequests: 100, windowMs: 60000 };
  private readonly REQUEST_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  static getInstance(): MessageHandler {
    if (!MessageHandler.instance) {
      MessageHandler.instance = new MessageHandler();
    }
    return MessageHandler.instance;
  }

  private constructor() {
    this.permissionManager = PermissionManager.getInstance();
    this.dataManager = DataManager.getInstance();
    this.identityManager = IdentityManager.getInstance();
    this.initializeMessageListener();
    this.loadOriginConfigs();
    this.startCleanupInterval();
  }

  private initializeMessageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        this.handleMessage(event);
      });
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredRequests();
      this.cleanupRateLimitEntries();
    }, 60000); // Clean up every minute
  }

  private async loadOriginConfigs(): Promise<void> {
    try {
      const configs = await this.identityManager.secureRetrieve('origin_configs');
      if (configs) {
        configs.forEach((config: OriginConfig) => {
          this.allowedOrigins.set(config.origin, config);
        });
      }
    } catch (error) {
      console.warn('Failed to load origin configs:', error);
    }
  }

  private async saveOriginConfigs(): Promise<void> {
    try {
      const configs = Array.from(this.allowedOrigins.values());
      await this.identityManager.secureStore('origin_configs', configs);
    } catch (error) {
      console.warn('Failed to save origin configs:', error);
    }
  }

  private isOriginAllowed(origin: string): boolean {
    const config = this.allowedOrigins.get(origin);
    return config ? !config.isBlocked : false;
  }

  private isActionAllowed(origin: string, action: PDMAction): boolean {
    const config = this.allowedOrigins.get(origin);
    return config ? config.allowedActions.includes(action) : false;
  }

  private checkRateLimit(origin: string): boolean {
    const config = this.allowedOrigins.get(origin);
    const rateLimit = config?.rateLimit || this.DEFAULT_RATE_LIMIT;

    const now = Date.now();
    const entry = this.rateLimitMap.get(origin);

    if (!entry || (now - entry.windowStart) > rateLimit.windowMs) {
      // New window
      this.rateLimitMap.set(origin, {
        count: 1,
        windowStart: now
      });
      return true;
    }

    if (entry.count >= rateLimit.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  private requiresUserApproval(origin: string, action: PDMAction): boolean {
    const config = this.allowedOrigins.get(origin);
    if (!config) return true;

    return config.requiresApproval || [
      'store_data',
      'delete_data',
      'share_data',
      'request_permission'
    ].includes(action);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createResponse(
    originalMessage: PDMMessage,
    data?: any,
    error?: string
  ): PDMMessage {
    return {
      id: this.generateMessageId(),
      type: 'response',
      action: originalMessage.action,
      data,
      error: error || undefined,
      timestamp: Date.now(),
      origin: 'pdm-extension',
      sessionId: originalMessage.sessionId
    };
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const message: PDMMessage = event.data;

      // Validate message structure
      if (!this.validateMessage(message)) {
        this.sendError(event.source as Window, 'Invalid message format', (message as any)?.id);
        return;
      }

      // Check origin
      if (!this.isOriginAllowed(event.origin)) {
        this.sendError(event.source as Window, 'Origin not allowed', message.id);
        return;
      }

      // Check rate limiting
      if (!this.checkRateLimit(event.origin)) {
        this.sendError(event.source as Window, 'Rate limit exceeded', message.id);
        return;
      }

      // Check action permissions
      if (!this.isActionAllowed(event.origin, message.action)) {
        this.sendError(event.source as Window, 'Action not allowed', message.id);
        return;
      }

      // Update origin last used
      const config = this.allowedOrigins.get(event.origin);
      if (config) {
        config.lastUsed = Date.now();
      }

      // Handle the message
      await this.processMessage(message, event.source as Window, event.origin);
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(
        event.source as Window,
        'Internal error',
        event.data?.id,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private validateMessage(message: any): message is PDMMessage {
    return (
      message &&
      typeof message.id === 'string' &&
      typeof message.type === 'string' &&
      typeof message.action === 'string' &&
      typeof message.timestamp === 'number' &&
      typeof message.origin === 'string'
    );
  }

  private async processMessage(
    message: PDMMessage,
    source: Window,
    origin: string
  ): Promise<void> {
    // Check if user approval is required
    if (this.requiresUserApproval(origin, message.action)) {
      await this.handleApprovalRequired(message, source, origin);
      return;
    }

    // Process the message directly
    const response = await this.executeAction(message, origin);
    this.sendResponse(source, response);
  }

  private async handleApprovalRequired(
    message: PDMMessage,
    source: Window,
    origin: string
  ): Promise<void> {
    const pendingRequest: PendingRequest = {
      messageId: message.id,
      origin,
      action: message.action,
      data: message.data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.REQUEST_TIMEOUT
    };

    this.pendingRequests.set(message.id, pendingRequest);

    // Show user approval dialog (in popup or notification)
    const approved = await this.showApprovalDialog(pendingRequest);

    if (approved) {
      const response = await this.executeAction(message, origin);
      this.sendResponse(source, response);
    } else {
      this.sendError(source, 'User denied request', message.id);
    }

    this.pendingRequests.delete(message.id);
  }

  private async showApprovalDialog(request: PendingRequest): Promise<boolean> {
    // In a real implementation, this would open the extension popup
    // or show a notification for user approval

    // For now, auto-approve for demo purposes
    // In production, this would wait for user interaction
    return true;
  }

  private async executeAction(message: PDMMessage, origin: string): Promise<PDMMessage> {
    try {
      let responseData: any;

      switch (message.action) {
        case 'ping':
          responseData = { status: 'pong', timestamp: Date.now() };
          break;

        case 'get_identity':
          const did = await this.identityManager.getDID();
          responseData = { did, origin };
          break;

        case 'store_data':
          const { title, content, type, tags, metadata } = message.data;
          const documentId = await this.dataManager.createDocument(
            title, content, type, tags, metadata
          );
          responseData = { documentId, success: true };
          break;

        case 'retrieve_data':
          const { documentId: retrieveId } = message.data;
          const document = await this.dataManager.getDocument(retrieveId);
          responseData = { document };
          break;

        case 'update_data':
          const { documentId: updateId, updates } = message.data;
          await this.dataManager.updateDocument(updateId, updates);
          responseData = { success: true };
          break;

        case 'delete_data':
          const { documentId: deleteId } = message.data;
          await this.dataManager.deleteDocument(deleteId);
          responseData = { success: true };
          break;

        case 'search_data':
          const { query } = message.data;
          const results = await this.dataManager.searchDocuments(query);
          responseData = { results, count: results.length };
          break;

        case 'share_data':
          const { documentId: shareId, targetDid, permissions } = message.data;
          await this.dataManager.shareDocument(shareId, targetDid, permissions);
          responseData = { success: true };
          break;

        case 'request_permission':
          const { resourceId, permissions: reqPermissions, reason } = message.data;
          const requestId = await this.permissionManager.requestPermission(
            resourceId, reqPermissions, reason
          );
          responseData = { requestId, success: true };
          break;

        case 'check_permission':
          const { resourceId: checkId, permission } = message.data;
          const userDid = await this.identityManager.getDID();
          if (!userDid) throw new Error('No active session');

          const hasPermission = await this.permissionManager.hasPermission(
            checkId, userDid, permission
          );
          responseData = { hasPermission };
          break;

        case 'get_user_data':
          const { limit, offset } = message.data || {};
          const userDocuments = await this.dataManager.searchDocuments({ limit, offset });
          responseData = { documents: userDocuments, count: userDocuments.length };
          break;

        case 'connect':
          responseData = await this.handleConnect(origin, message.data);
          break;

        case 'disconnect':
          responseData = await this.handleDisconnect(origin);
          break;

        default:
          throw new Error(`Unknown action: ${message.action}`);
      }

      return this.createResponse(message, responseData);
    } catch (error) {
      return this.createResponse(message, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleConnect(origin: string, connectionData: any): Promise<any> {
    const existingConfig = this.allowedOrigins.get(origin);

    if (!existingConfig) {
      // New origin, create configuration
      const config: OriginConfig = {
        origin,
        permissions: connectionData.requestedPermissions || ['read'],
        allowedActions: connectionData.requestedActions || ['ping', 'get_identity'],
        rateLimit: connectionData.rateLimit || this.DEFAULT_RATE_LIMIT,
        requiresApproval: true,
        isBlocked: false,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      this.allowedOrigins.set(origin, config);
      await this.saveOriginConfigs();
    }

    return {
      connected: true,
      permissions: this.allowedOrigins.get(origin)?.permissions || [],
      allowedActions: this.allowedOrigins.get(origin)?.allowedActions || []
    };
  }

  private async handleDisconnect(origin: string): Promise<any> {
    const config = this.allowedOrigins.get(origin);
    if (config) {
      config.isBlocked = true;
      await this.saveOriginConfigs();
    }

    return { disconnected: true };
  }

  private sendResponse(target: Window, response: PDMMessage): void {
    target.postMessage(response, '*');
  }

  private sendError(
    target: Window,
    error: string,
    messageId?: string,
    details?: string
  ): void {
    const errorResponse: PDMMessage = {
      id: messageId || this.generateMessageId(),
      type: 'response',
      action: 'ping', // Default action for errors
      error: `${error}${details ? `: ${details}` : ''}`,
      timestamp: Date.now(),
      origin: 'pdm-extension'
    };

    target.postMessage(errorResponse, '*');
  }

  private cleanupExpiredRequests(): void {
    const now = Date.now();
    for (const [id, request] of this.pendingRequests.entries()) {
      if (request.expiresAt < now) {
        this.pendingRequests.delete(id);
      }
    }
  }

  private cleanupRateLimitEntries(): void {
    const now = Date.now();
    for (const [origin, entry] of this.rateLimitMap.entries()) {
      const config = this.allowedOrigins.get(origin);
      const windowMs = config?.rateLimit.windowMs || this.DEFAULT_RATE_LIMIT.windowMs;

      if ((now - entry.windowStart) > windowMs) {
        this.rateLimitMap.delete(origin);
      }
    }
  }

  // Public methods for managing origins
  async addAllowedOrigin(
    origin: string,
    permissions: PermissionType[] = ['read'],
    allowedActions: PDMAction[] = ['ping', 'get_identity'],
    rateLimit = this.DEFAULT_RATE_LIMIT
  ): Promise<void> {
    const config: OriginConfig = {
      origin,
      permissions,
      allowedActions,
      rateLimit,
      requiresApproval: false,
      isBlocked: false,
      createdAt: Date.now(),
      lastUsed: 0
    };

    this.allowedOrigins.set(origin, config);
    await this.saveOriginConfigs();
  }

  async removeAllowedOrigin(origin: string): Promise<void> {
    this.allowedOrigins.delete(origin);
    this.rateLimitMap.delete(origin);
    await this.saveOriginConfigs();
  }

  async updateOriginConfig(origin: string, updates: Partial<OriginConfig>): Promise<void> {
    const config = this.allowedOrigins.get(origin);
    if (config) {
      Object.assign(config, updates);
      await this.saveOriginConfigs();
    }
  }

  getOriginConfigs(): OriginConfig[] {
    return Array.from(this.allowedOrigins.values());
  }

  getPendingRequests(): PendingRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  async approveRequest(messageId: string): Promise<void> {
    const request = this.pendingRequests.get(messageId);
    if (request) {
      // This would trigger the approval in the real implementation
    }
  }

  async denyRequest(messageId: string): Promise<void> {
    const request = this.pendingRequests.get(messageId);
    if (request) {
      this.pendingRequests.delete(messageId);
    }
  }

  getMessageStats(): {
    allowedOrigins: number;
    pendingRequests: number;
    rateLimitEntries: number;
  } {
    return {
      allowedOrigins: this.allowedOrigins.size,
      pendingRequests: this.pendingRequests.size,
      rateLimitEntries: this.rateLimitMap.size
    };
  }
}