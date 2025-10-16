import type { PermissionConfig } from './index';
import { NillionManager } from './nillion';
import { IdentityManager } from './identity';
import { DataManager } from './data';

export interface PermissionRequest {
  id: string;
  requesterId: string;
  resourceId: string;
  resourceType: 'document' | 'collection' | 'identity';
  permissions: PermissionType[];
  reason?: string | undefined;
  expiresAt?: number | undefined;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  createdAt: number;
  respondedAt?: number | undefined;
}

export type PermissionType = 'read' | 'write' | 'delete' | 'share' | 'admin';

export interface AccessRule {
  id: string;
  resourceId: string;
  subjectDid: string;
  permissions: PermissionType[];
  conditions?: AccessCondition[] | undefined;
  expiresAt?: number | undefined;
  createdAt: number;
  createdBy: string;
  isActive: boolean;
}

export interface AccessCondition {
  type: 'time_range' | 'ip_range' | 'usage_limit' | 'location';
  value: any;
  metadata?: Record<string, any>;
}

export interface PermissionAuditLog {
  id: string;
  action: 'grant' | 'revoke' | 'request' | 'access' | 'deny';
  resourceId: string;
  subjectDid: string;
  actorDid: string;
  permissions: PermissionType[];
  timestamp: number;
  metadata?: Record<string, any> | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export class PermissionManager {
  private static instance: PermissionManager;
  private nillionManager: NillionManager;
  private identityManager: IdentityManager;
  private dataManager: DataManager;
  private permissionCache: Map<string, AccessRule[]> = new Map();
  private auditLog: PermissionAuditLog[] = [];
  private pendingRequests: Map<string, PermissionRequest> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_AUDIT_LOG_SIZE = 1000;

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  private constructor() {
    this.nillionManager = NillionManager.getInstance();
    this.identityManager = IdentityManager.getInstance();
    this.dataManager = DataManager.getInstance();
    this.loadPersistedData();
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const auditData = await this.identityManager.secureRetrieve('permission_audit_log');
      if (auditData) {
        this.auditLog = auditData;
      }

      const requestsData = await this.identityManager.secureRetrieve('pending_requests');
      if (requestsData) {
        requestsData.forEach((req: PermissionRequest) => {
          this.pendingRequests.set(req.id, req);
        });
      }
    } catch (error) {
      console.warn('Failed to load persisted permission data:', error);
    }
  }

  private async persistAuditLog(): Promise<void> {
    try {
      if (this.auditLog.length > this.MAX_AUDIT_LOG_SIZE) {
        this.auditLog = this.auditLog.slice(-this.MAX_AUDIT_LOG_SIZE);
      }
      await this.identityManager.secureStore('permission_audit_log', this.auditLog);
    } catch (error) {
      console.warn('Failed to persist audit log:', error);
    }
  }

  private async persistPendingRequests(): Promise<void> {
    try {
      const requests = Array.from(this.pendingRequests.values());
      await this.identityManager.secureStore('pending_requests', requests);
    } catch (error) {
      console.warn('Failed to persist pending requests:', error);
    }
  }

  private async logPermissionAction(
    action: PermissionAuditLog['action'],
    resourceId: string,
    subjectDid: string,
    permissions: PermissionType[],
    metadata?: Record<string, any>
  ): Promise<void> {
    const actorDid = await this.identityManager.getDID();
    const logEntry: PermissionAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      resourceId,
      subjectDid,
      actorDid: actorDid || 'system',
      permissions,
      timestamp: Date.now(),
      metadata
    };

    this.auditLog.push(logEntry);
    await this.persistAuditLog();
  }

  private evaluateAccessConditions(conditions: AccessCondition[]): boolean {
    const now = Date.now();

    for (const condition of conditions) {
      switch (condition.type) {
        case 'time_range':
          const { start, end } = condition.value;
          if (now < start || now > end) {
            return false;
          }
          break;

        case 'usage_limit':
          const { limit, used } = condition.value;
          if (used >= limit) {
            return false;
          }
          break;

        case 'ip_range':
          // In a browser extension, IP checks would need to be handled server-side
          break;

        case 'location':
          // Location-based access would require geolocation API
          break;

        default:
          console.warn(`Unknown access condition type: ${condition.type}`);
      }
    }

    return true;
  }

  async hasPermission(
    resourceId: string,
    subjectDid: string,
    permission: PermissionType
  ): Promise<boolean> {
    try {
      // Check cache first
      const cached = this.permissionCache.get(resourceId);
      if (cached) {
        const rule = cached.find(r =>
          r.subjectDid === subjectDid &&
          r.isActive &&
          r.permissions.includes(permission) &&
          (!r.expiresAt || r.expiresAt > Date.now())
        );

        if (rule) {
          if (rule.conditions && !this.evaluateAccessConditions(rule.conditions)) {
            return false;
          }

          await this.logPermissionAction('access', resourceId, subjectDid, [permission]);
          return true;
        }
      }

      // Check with Nillion
      const permissions = await this.nillionManager.getPermissions(resourceId);
      const hasAccess = permissions[permission]?.includes(subjectDid) || false;

      if (hasAccess) {
        await this.logPermissionAction('access', resourceId, subjectDid, [permission]);
      }

      return hasAccess;
    } catch (error) {
      console.warn(`Permission check failed for ${resourceId}:`, error);
      return false;
    }
  }

  async grantPermission(
    resourceId: string,
    targetDid: string,
    permissions: PermissionType[],
    conditions?: AccessCondition[],
    expiresAt?: number
  ): Promise<void> {
    const currentDid = await this.identityManager.getDID();
    if (!currentDid) {
      throw new Error('No active session');
    }

    // Check if current user has admin permission on the resource
    const hasAdminAccess = await this.hasPermission(resourceId, currentDid, 'admin');
    if (!hasAdminAccess) {
      throw new Error('Insufficient permissions to grant access');
    }

    const rule: AccessRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      resourceId,
      subjectDid: targetDid,
      permissions,
      conditions: conditions || undefined,
      expiresAt: expiresAt || undefined,
      createdAt: Date.now(),
      createdBy: currentDid,
      isActive: true
    };

    try {
      // Grant permissions in Nillion
      await this.nillionManager.grantPermission(resourceId, targetDid, permissions);

      // Update local cache
      const existingRules = this.permissionCache.get(resourceId) || [];
      existingRules.push(rule);
      this.permissionCache.set(resourceId, existingRules);

      await this.logPermissionAction('grant', resourceId, targetDid, permissions, {
        ruleId: rule.id,
        conditions,
        expiresAt
      });
    } catch (error) {
      throw new Error(`Failed to grant permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async revokePermission(
    resourceId: string,
    targetDid: string,
    permissions?: PermissionType[]
  ): Promise<void> {
    const currentDid = await this.identityManager.getDID();
    if (!currentDid) {
      throw new Error('No active session');
    }

    // Check if current user has admin permission on the resource
    const hasAdminAccess = await this.hasPermission(resourceId, currentDid, 'admin');
    if (!hasAdminAccess) {
      throw new Error('Insufficient permissions to revoke access');
    }

    try {
      // Revoke permissions in Nillion
      await this.nillionManager.revokePermission(resourceId, targetDid);

      // Update local cache
      const existingRules = this.permissionCache.get(resourceId) || [];
      const updatedRules = existingRules.map(rule => {
        if (rule.subjectDid === targetDid) {
          if (permissions) {
            // Remove specific permissions
            rule.permissions = rule.permissions.filter(p => !permissions.includes(p));
            if (rule.permissions.length === 0) {
              rule.isActive = false;
            }
          } else {
            // Revoke all permissions
            rule.isActive = false;
          }
        }
        return rule;
      });

      this.permissionCache.set(resourceId, updatedRules);

      await this.logPermissionAction('revoke', resourceId, targetDid, permissions || [], {
        revokedAt: Date.now()
      });
    } catch (error) {
      throw new Error(`Failed to revoke permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async requestPermission(
    resourceId: string,
    permissions: PermissionType[],
    reason?: string,
    expiresAt?: number
  ): Promise<string> {
    const requesterId = await this.identityManager.getDID();
    if (!requesterId) {
      throw new Error('No active session');
    }

    const request: PermissionRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requesterId,
      resourceId,
      resourceType: 'document', // Could be determined dynamically
      permissions,
      reason: reason || undefined,
      expiresAt: expiresAt || undefined,
      status: 'pending',
      createdAt: Date.now()
    };

    this.pendingRequests.set(request.id, request);
    await this.persistPendingRequests();

    await this.logPermissionAction('request', resourceId, requesterId, permissions, {
      requestId: request.id,
      reason
    });

    // In a real implementation, this would notify the resource owner

    return request.id;
  }

  async respondToPermissionRequest(
    requestId: string,
    approve: boolean,
    conditions?: AccessCondition[]
  ): Promise<void> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error('Permission request not found');
    }

    const currentDid = await this.identityManager.getDID();
    if (!currentDid) {
      throw new Error('No active session');
    }

    // Check if current user can approve this request (must have admin access to resource)
    const hasAdminAccess = await this.hasPermission(request.resourceId, currentDid, 'admin');
    if (!hasAdminAccess) {
      throw new Error('Insufficient permissions to respond to this request');
    }

    request.status = approve ? 'approved' : 'denied';
    request.respondedAt = Date.now();

    if (approve) {
      await this.grantPermission(
        request.resourceId,
        request.requesterId,
        request.permissions,
        conditions,
        request.expiresAt
      );
    }

    this.pendingRequests.set(requestId, request);
    await this.persistPendingRequests();

    await this.logPermissionAction(approve ? 'grant' : 'deny', request.resourceId, request.requesterId, request.permissions, {
      requestId,
      respondedBy: currentDid
    });
  }

  async listPermissionRequests(status?: PermissionRequest['status']): Promise<PermissionRequest[]> {
    let requests = Array.from(this.pendingRequests.values());

    if (status) {
      requests = requests.filter(req => req.status === status);
    }

    // Check for expired requests
    const now = Date.now();
    requests.forEach(req => {
      if (req.expiresAt && req.expiresAt < now && req.status === 'pending') {
        req.status = 'expired';
      }
    });

    return requests.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getResourcePermissions(resourceId: string): Promise<AccessRule[]> {
    const cached = this.permissionCache.get(resourceId);
    if (cached) {
      return cached.filter(rule => rule.isActive);
    }

    try {
      const permissions = await this.nillionManager.getPermissions(resourceId);
      const rules: AccessRule[] = [];

      Object.entries(permissions).forEach(([permission, dids]) => {
        if (Array.isArray(dids)) {
          dids.forEach(did => {
            rules.push({
              id: `nillion_${resourceId}_${did}_${permission}`,
              resourceId,
              subjectDid: did,
              permissions: [permission as PermissionType],
              createdAt: Date.now(),
              createdBy: 'nillion',
              isActive: true
            });
          });
        }
      });

      this.permissionCache.set(resourceId, rules);
      return rules;
    } catch (error) {
      console.warn(`Failed to get resource permissions for ${resourceId}:`, error);
      return [];
    }
  }

  async getUserPermissions(userDid?: string): Promise<AccessRule[]> {
    const targetDid = userDid || await this.identityManager.getDID();
    if (!targetDid) {
      throw new Error('No user DID provided');
    }

    const allRules: AccessRule[] = [];

    for (const [resourceId, rules] of this.permissionCache.entries()) {
      const userRules = rules.filter(rule =>
        rule.subjectDid === targetDid &&
        rule.isActive &&
        (!rule.expiresAt || rule.expiresAt > Date.now())
      );
      allRules.push(...userRules);
    }

    return allRules;
  }

  getAuditLog(
    resourceId?: string,
    subjectDid?: string,
    limit: number = 100
  ): PermissionAuditLog[] {
    let logs = [...this.auditLog];

    if (resourceId) {
      logs = logs.filter(log => log.resourceId === resourceId);
    }

    if (subjectDid) {
      logs = logs.filter(log => log.subjectDid === subjectDid);
    }

    return logs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async cleanupExpiredPermissions(): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [resourceId, rules] of this.permissionCache.entries()) {
      const activeRules = rules.filter(rule => {
        if (rule.expiresAt && rule.expiresAt < now) {
          cleanedCount++;
          return false;
        }
        return true;
      });

      this.permissionCache.set(resourceId, activeRules);
    }

    // Clean up expired requests
    for (const [requestId, request] of this.pendingRequests.entries()) {
      if (request.expiresAt && request.expiresAt < now && request.status === 'pending') {
        request.status = 'expired';
        cleanedCount++;
      }
    }

    await this.persistPendingRequests();
    return cleanedCount;
  }

  clearCache(): void {
    this.permissionCache.clear();
  }

  getPermissionStats(): {
    totalRules: number;
    activeRules: number;
    pendingRequests: number;
    auditLogSize: number;
  } {
    let totalRules = 0;
    let activeRules = 0;

    for (const rules of this.permissionCache.values()) {
      totalRules += rules.length;
      activeRules += rules.filter(rule => rule.isActive).length;
    }

    const pendingRequests = Array.from(this.pendingRequests.values())
      .filter(req => req.status === 'pending').length;

    return {
      totalRules,
      activeRules,
      pendingRequests,
      auditLogSize: this.auditLog.length
    };
  }
}